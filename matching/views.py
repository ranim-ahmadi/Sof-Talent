import os
import re
import math
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model
from django.conf import settings
import logging
from .utils import generate_pdf, extract_job_id_from_pdf_filename, parse_fiche_poste_pdf, normalize_text, \
    extract_technologies_from_experience, generate_translated_variants

logger = logging.getLogger(__name__)
User = get_user_model()

class FichePosteCreateView(APIView):
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cv_match_view(request, job_id):
    """Calcule la compatibilité entre une fiche de poste et tous les CVs stockés dans la base de données."""
    try:
        logger.info(f"Début de cv_match_view pour job_id={job_id} par {request.user.username}")
        logger.debug("Récupération de la fiche de poste...")

        # Récupérer la fiche de poste
        try:
            from fiche_poste_generator.models import JobDescription
            job = JobDescription.objects.get(id=job_id)
        except JobDescription.DoesNotExist:
            from manager_space.models import JobDescription as ManagerJobDescription
            try:
                job = ManagerJobDescription.objects.get(id=job_id)
            except ManagerJobDescription.DoesNotExist:
                logger.error(f"Fiche de poste ID {job_id} non trouvée dans la base")
                return JsonResponse({'error': 'Fiche de poste non trouvée dans la base'}, status=404)
            except Exception as e:
                logger.error(f"Erreur lors de la récupération de la fiche : {str(e)}")
                return JsonResponse({'error': str(e)}, status=500)

        # Préparer les données pour le matching
        title = job.title or ''
        keywords = job.keywords if isinstance(job.keywords, list) else [kw.strip() for kw in job.keywords.split(',') if kw.strip()] if job.keywords else []
        if not keywords:
            logger.warning(f"Aucun mot-clé trouvé pour la fiche de poste ID {job_id}. Score de compétences sera 0.")
            keywords = []

        years_experience = 0
        if job.profile:
            match = re.search(r'Expérience\s*[:\sde]*(\d+)\s*an[séée]?s?', job.profile, re.IGNORECASE)
            if match:
                years_experience = int(match.group(1))
        logger.debug(f"Données de la fiche pour matching : titre={title}, keywords={keywords}, years_experience={years_experience}")

        # Récupérer tous les CVs sans restriction d'équipe
        from cv_generator.models import CV
        cvs = CV.objects.all().select_related('utilisateur').prefetch_related('experiences')
        logger.info(f"Nombre de CVs trouvés dans la base : {cvs.count()}")

        user_cvs = {}
        for cv in cvs:
            user_key = cv.utilisateur.email if cv.utilisateur and cv.utilisateur.email else (cv.username or f"unknown_{cv.id}")
            logger.debug(f"CV ID {cv.id} associé à user_key {user_key}")
            if user_key not in user_cvs:
                user_cvs[user_key] = []
            user_cvs[user_key].append(cv)

        # Calculer les correspondances
        matches = []
        processed_users = set()
        min_match_score = 20.0  # Seuil minimum de 20%

        def calculate_skill_similarity(job_keywords, cv_skills, cv_certs, cv_techs):
            # Normalisation des mots-clés de la fiche de poste
            normalized_job_keywords = [normalize_text(kw) for kw in job_keywords if kw]
            if not normalized_job_keywords:
                logger.warning("Aucun mot-clé normalisé trouvé. Score de compétences défini à 0.")
                return 0.0, []

            # Fusion de toutes les compétences du CV
            cv_all_skills_raw = cv_skills + cv_certs + cv_techs
            cv_all_skills = []

            # Décomposer et normaliser les compétences
            for skill in cv_all_skills_raw:
                normalized_skill = normalize_text(skill) if skill else ""
                if not normalized_skill:
                    continue
                # Gérer les compétences avec : (ex. "CI/CD : Git, Jenkins, Docker")
                if ":" in normalized_skill:
                    category, tools = normalized_skill.split(":", 1)
                    category = category.strip()
                    if category:
                        cv_all_skills.append(category)
                    tool_list = [t.strip() for t in tools.split(",") if t.strip()]
                    cv_all_skills.extend(tool_list)
                # Gérer les compétences avec parenthèses (ex. "Docker (WSL)")
                elif "(" in normalized_skill and ")" in normalized_skill:
                    base_skill = re.sub(r'\s*\([^)]+\)', '', normalized_skill).strip()
                    if base_skill:
                        cv_all_skills.append(base_skill)
                # Gérer les compétences avec versions (ex. "Angular 15")
                elif " " in normalized_skill:
                    base_skill = re.sub(r'\s+\d+', '', normalized_skill).strip()
                    if base_skill:
                        cv_all_skills.append(base_skill)
                    # Ajouter la compétence complète si elle contient des chiffres
                    if any(c.isdigit() for c in normalized_skill):
                        cv_all_skills.append(normalized_skill)
                # Gérer les compétences simples ou avec virgules
                else:
                    sub_skills = [s.strip() for s in normalized_skill.split(",") if s.strip()]
                    cv_all_skills.extend(sub_skills)

            # Éliminer les doublons
            cv_all_skills = list(dict.fromkeys(cv_all_skills))
            logger.debug(f"Compétences normalisées du CV : {cv_all_skills}")

            # Calculer les correspondances
            matched = []
            matches_count = 0
            for job_kw in normalized_job_keywords:
                for cv_skill in cv_all_skills:
                    if job_kw == cv_skill or (job_kw in cv_skill and any(c.isdigit() for c in cv_skill)):
                        matches_count += 1
                        matched.append(job_kw)
                        break

            skills_score = (matches_count / len(normalized_job_keywords) * 100) if normalized_job_keywords else 0.0
            return min(skills_score, 100.0), matched

        for user_key, user_cvs_list in user_cvs.items():
            if user_key in processed_users:
                continue

            best_cv = None
            best_score = -1
            best_raw_scores = None
            best_username = None
            best_matched_skills = []

            for cv in user_cvs_list:
                job_title_variants = generate_translated_variants(job.title) if job.title else []
                cv_titles = [cv.poste_actuel or '']
                cv_titles.extend([exp.position or '' for exp in cv.experiences.all()])
                cv_title_variants = [variant for title in cv_titles for variant in generate_translated_variants(title)]
                title_similarity = 0.0
                for job_variant in job_title_variants:
                    for cv_variant in cv_title_variants:
                        if job_variant == cv_variant:
                            title_similarity = 100.0
                            break
                    if title_similarity == 100.0:
                        break
                title_score = (title_similarity / 100) * 45  # 45% pour le titre
                raw_scores = {'title_similarity': round(title_similarity, 1)}

                cv_exp = cv.annees_experience or 0
                exp_score = 0.0
                if years_experience > 0:
                    if cv_exp >= years_experience:
                        exp_score = 100 * math.exp(-abs(cv_exp - years_experience) / (1.5 * years_experience))
                    else:
                        exp_score = 100 * math.exp(-abs(cv_exp - years_experience) / (years_experience / 2))
                logger.debug(f"CV {cv.id}: cv_exp={cv_exp}, years_experience={years_experience}, exp_score={exp_score}")
                exp_score_weighted = (exp_score / 100) * 10  # 10% pour les années d'expérience
                raw_scores['experience_similarity'] = round(exp_score, 1)

                cv_skills = cv.skills.split(',') if cv.skills else []
                cv_certifications = cv.certifications.split(',') if cv.certifications else []
                cv_technologies = extract_technologies_from_experience(cv.experiences.all())
                skills_score, matched_skills = calculate_skill_similarity(job.keywords, cv_skills, cv_certifications,
                                                                          cv_technologies)
                skills_score_weighted = (skills_score / 100) * 45  # 45% pour les compétences
                raw_scores['skills_similarity'] = round(skills_score, 1)
                raw_scores['matched_skills'] = matched_skills

                total_score = title_score + exp_score_weighted + skills_score_weighted
                total_score = min(round(total_score, 1), 100.0)

                username = cv.utilisateur.email if cv.utilisateur else (cv.username or "Inconnu")
                if total_score > best_score:
                    best_score = total_score
                    best_cv = cv
                    best_raw_scores = raw_scores
                    best_username = username
                    best_matched_skills = matched_skills

            if best_cv and user_key not in processed_users and best_score >= min_match_score:
                matches.append({
                    'cv_id': best_cv.id,
                    'username': best_username,
                    'match_percentage': best_score,
                    'raw_scores': best_raw_scores,
                    'matched_skills': best_matched_skills
                })
                processed_users.add(user_key)

        matches.sort(key=lambda x: x['match_percentage'], reverse=True)
        matches = matches[:10]

        # Réponse JSON avec les résultats du matching
        response_data = {
            'success': True,
            'job_title': job.title,
            'job_id': job.id,
            'required_skills': job.keywords[:20] if len(job.keywords) > 20 else job.keywords,
            'matches': matches
        }
        logger.info(f"Fiche de poste téléchargée et matching effectué : ID {job.id}")
        return JsonResponse(response_data, status=200)

    except ValueError as e:
        logger.error(f"Erreur de validation : {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Erreur inattendue : {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)