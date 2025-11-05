import json
import logging
import nltk
import re
from collections import Counter
from django.db.models import Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from cv_generator.models import CV

# Télécharger les ressources NLTK
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)  # Ajouter les stop words

logger = logging.getLogger(__name__)

def analyze_skills(cvs):
    """Analyse les compétences des CVs en dédupliquant par utilisateur."""
    user_skills = {}  # Dictionnaire pour stocker les compétences uniques par utilisateur

    # Liste de stop words en français
    from nltk.corpus import stopwords
    stop_words = set(stopwords.words('french'))

    # Mapping pour regrouper les termes liés aux bases de données
    db_related_terms = {
        'donnée': 'Database',
        'data': 'Database',
        'base de donnée': 'Database',
        'sql': 'Database'
    }

    for cv in cvs:
        user_id = cv.utilisateur.id
        if user_id not in user_skills:
            user_skills[user_id] = set()  # Utiliser un set pour éviter les doublons par utilisateur

        skills_list = []

        # Champ skills
        if isinstance(cv.skills, str):
            try:
                # Tenter de parser comme JSON
                skills_data = json.loads(cv.skills) if cv.skills.startswith('[') else re.split(r',\s*', cv.skills)
                skills_list.extend(skills_data)
            except json.JSONDecodeError:
                skills_list.extend(re.split(r',\s*', cv.skills))
        elif isinstance(cv.skills, list):
            skills_list.extend(cv.skills)

        # Champ technologies des expériences
        for exp in cv.experiences.all():
            if exp.technologies:
                if isinstance(exp.technologies, str):
                    try:
                        skills_list.extend(
                            json.loads(exp.technologies) if exp.technologies.startswith('[') else re.split(r',\s*', exp.technologies))
                    except json.JSONDecodeError:
                        skills_list.extend(re.split(r',\s*', exp.technologies))
                elif isinstance(exp.technologies, list):
                    skills_list.extend(exp.technologies)

        # Normalisation et traitement des compétences
        for skill in skills_list:
            normalized_skill = skill.strip().lower()
            if normalized_skill:  # Ignorer les chaînes vides
                # Vérifier si c'est un terme lié aux bases de données
                if any(term in normalized_skill for term in db_related_terms):
                    user_skills[user_id].add(db_related_terms.get(normalized_skill, 'Database'))
                # Préserver les compétences techniques avec chiffres ou caractères spéciaux
                elif any(c.isdigit() or c in '+-.' for c in normalized_skill):
                    user_skills[user_id].add(normalized_skill)
                else:
                    # Tokenisation uniquement pour les compétences sans chiffres/spéciaux
                    tokens = nltk.word_tokenize(normalized_skill)
                    filtered_tokens = [t for t in tokens if t.isalpha() and len(t) > 2 and t not in stop_words]
                    user_skills[user_id].update(filtered_tokens)

    # Compter les compétences uniques et leur fréquence globale (une fois par utilisateur)
    all_skills = [skill for skills_set in user_skills.values() for skill in skills_set]
    unique_skills = set(all_skills)
    skills_frequency = Counter(all_skills)

    return {
        'unique_skills': list(unique_skills),
        'skills_count': len(unique_skills),
        'skills_frequency': dict(skills_frequency)
    }

class SeniorityAnalyticsAPIView(APIView):
    permission_classes = [IsAuthenticated]  # Exiger une authentification

    def get(self, request):
        logger.debug(f"Requête GET reçue pour SeniorityAnalyticsAPIView par {request.user.username}")
        try:
            # Vérifier si l'utilisateur est un manager
            if request.user.role != 'manager':
                logger.warning(f"Accès non autorisé pour {request.user.username}: doit être un manager")
                return Response({'error': 'Vous devez être un manager pour accéder à cette fonctionnalité'}, status=403)

            # Récupérer les membres de l'équipe du manager (exclure le manager lui-même)
            team_members = request.user.get_all_team_members()
            team_member_ids = [member.id for member in team_members]  # Ne pas inclure request.user.id

            # Compter le nombre total de profils (utilisateurs) dans l'équipe, sans le manager
            total_profiles = len(team_member_ids)

            # Filtrer les CVs pour inclure uniquement ceux de l'équipe
            cvs = CV.objects.filter(utilisateur__id__in=team_member_ids)

            # Mettre à jour le champ seniority pour les CVs de l'équipe uniquement
            for cv in cvs:
                if cv.annees_experience <= 3:
                    cv.seniority = 'junior'
                elif cv.annees_experience <= 5:
                    cv.seniority = 'intermediate'
                else:
                    cv.seniority = 'senior'
                cv.save()

            avg_years = cvs.aggregate(Avg('annees_experience'))['annees_experience__avg'] or 0

            # Utiliser le champ seniority pour catégoriser les CVs
            categories = {
                'junior': cvs.filter(seniority='junior'),
                'intermediate': cvs.filter(seniority='intermediate'),
                'senior': cvs.filter(seniority='senior')
            }

            seniority_data = {}
            for level, level_cvs in categories.items():
                seniority_data[level] = {
                    'count': level_cvs.count(),
                    'skills': analyze_skills(level_cvs)
                }

            overall_skills = analyze_skills(cvs)

            analytics = {
                'total_profiles': total_profiles,
                'average_years_experience': avg_years,
                'seniority_distribution': seniority_data,
                'overall_skills': overall_skills
            }
            logger.info(f"Statistiques générées avec succès pour l'équipe de {request.user.username}")
            return Response(analytics)

        except Exception as e:
            logger.error(f"Erreur dans SeniorityAnalyticsAPIView pour {request.user.username}: {str(e)}")
            return Response({'error': str(e)}, status=500)