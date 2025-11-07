import logging
import re
import math
from django.core.files import File
from django.contrib.auth import get_user_model
from django.http import JsonResponse, FileResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from cv_generator.models import CV
from cv_generator.serializers import CVSerializer
from .models import UploadedFile
from fiche_poste_generator.models import JobDescription as ManagerJobDescription
from matching.utils import parse_fiche_poste_pdf, extract_job_id_from_pdf_filename, \
    extract_technologies_from_experience, generate_translated_variants, normalize_text
from django.core.files.storage import default_storage
from .serializers import UploadedFileSerializer

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_cvs(request):
    try:
        user = request.user
        logger.debug(f"Utilisateur connecté : {user.username}, Rôle : {user.role}, ID : {user.id}")

        if user.role != 'manager':
            logger.warning(
                f"Accès interdit pour {user.username} : seuls les managers peuvent accéder aux CVs de leur équipe.")
            return JsonResponse({'error': 'Seuls les managers peuvent accéder à cette ressource'}, status=403)

        team_members = user.get_all_team_members()
        team_member_ids = [member.id for member in team_members]

        team_cvs = CV.objects.filter(utilisateur__in=team_members).select_related('utilisateur', 'utilisateur__manager')
        serializer = CVSerializer(team_cvs, many=True)
        cv_list = serializer.data

        logger.info(f"{len(cv_list)} CVs récupérés pour l'équipe de {user.username}")
        return JsonResponse({'cvs': cv_list}, safe=False, status=200)

    except Exception as e:
        logger.error(f"Erreur dans team_cvs pour {request.user.username}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)
import time
from django.core.files import File

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_file(request):
    try:
        user = request.user
        logger.info(f"Requête POST reçue pour upload_file par {user.username}, Rôle : {user.role}, ID : {user.id}")

        if 'file' not in request.FILES:
            logger.warning(f"Aucun fichier envoyé par {user.username}.")
            return JsonResponse({'error': 'Aucun fichier envoyé'}, status=400)

        file = request.FILES['file']
        logger.debug(f"Fichier reçu : {file.name}")

        # Ajouter un timestamp pour garantir l'unicité
        timestamp = int(time.time())
        unique_file_name = f"{timestamp}_{file.name}"
        pdf_path = default_storage.save(f'manager_space_uploads/{unique_file_name}', file)
        uploaded_file = UploadedFile(user=user, file=File(file, name=pdf_path), file_name=unique_file_name)
        uploaded_file.save()
        logger.info(f"UploadedFile sauvegardé avec succès : ID {uploaded_file.id}, Chemin : {uploaded_file.file.path}")

        try:
            parsed_data, _ = parse_fiche_poste_pdf(default_storage.path(pdf_path))
            if parsed_data is None:
                logger.error(f"Échec de l'extraction des données du PDF {file.name}")
                return JsonResponse({'error': 'Échec de l’extraction des données du PDF'}, status=500)
            logger.debug(f"Données extraites : {parsed_data}")
        except Exception as e:
            logger.error(f"Erreur d'extraction du PDF {file.name} : {str(e)}", exc_info=True)
            return JsonResponse({'error': 'Erreur lors de l’extraction des données du PDF'}, status=500)

        keywords = parsed_data.get('keywords', [])
        if not isinstance(keywords, list):
            logger.warning(f"Les mots-clés extraits ne sont pas une liste : {keywords}")
            keywords = []
        keywords = [kw for kw in keywords if not kw.strip().isdigit()]
        parsed_data['keywords'] = keywords

        job_id = extract_job_id_from_pdf_filename(file.name)
        job = ManagerJobDescription.objects.get(id=job_id) if job_id and ManagerJobDescription.objects.filter(id=job_id).exists() else None

        if not job:
            job = ManagerJobDescription(
                user=user,
                file=uploaded_file,
                file_name=unique_file_name,
                title=parsed_data.get('title', 'Titre non trouvé'),
                missions=parsed_data.get('missions', ''),
                main_tasks='\n'.join(parsed_data.get('main_tasks', [])) if parsed_data.get('main_tasks') else '',
                profile=parsed_data.get('profile', ''),
                technical_skills=parsed_data.get('technical_skills', []),
                personal_qualities=parsed_data.get('personal_qualities', []),
                keywords=parsed_data.get('keywords')
            )
            job.save()
            logger.info(f"JobDescription créée : ID {job.id}")
        else:
            job.title = parsed_data.get('title', job.title)
            job.missions = parsed_data.get('missions', job.missions)
            job.main_tasks = '\n'.join(parsed_data.get('main_tasks', [])) if parsed_data.get('main_tasks') else job.main_tasks
            job.profile = parsed_data.get('profile', job.profile)
            job.technical_skills = parsed_data.get('technical_skills', job.technical_skills)
            job.personal_qualities = parsed_data.get('personal_qualities', job.personal_qualities)
            job.keywords = parsed_data.get('keywords')
            job.save()
            logger.info(f"JobDescription mise à jour : ID {job.id}")

        matches = []
        processed_users = set()
        min_match_score = 0.0

        years_experience = 0
        if job.profile:
            match = re.search(r'Expérience\s*[:\sde]*(\d+)\s*an[séée]?s?', job.profile, re.IGNORECASE)
            if match:
                years_experience = int(match.group(1))

        # Récupérer TOUS les CVs de la base de données
        # Remplacer 'utilisateur__profile' par 'utilisateur__manager'
        cvs = CV.objects.all().select_related('utilisateur', 'utilisateur__manager').prefetch_related('experiences')
        logger.debug(f"Nombre total de CVs récupérés : {cvs.count()}")

        user_cvs = {}
        for cv in cvs:
            user_key = cv.utilisateur.email if cv.utilisateur and cv.utilisateur.email else (cv.username or f"unknown_{cv.id}")
            if user_key not in user_cvs:
                user_cvs[user_key] = []
            user_cvs[user_key].append(cv)

        def calculate_skill_similarity(job_keywords, cv_skills, cv_certs, cv_techs):
            normalized_job_keywords = [normalize_text(kw) for kw in job_keywords if kw]
            logger.debug(f"Normalized job keywords: {normalized_job_keywords}")
            if not normalized_job_keywords:
                logger.warning("Aucun mot-clé normalisé trouvé. Score de compétences défini à 0.")
                return 0.0, []

            cv_all_skills = []
            for skill in cv_skills + cv_certs + cv_techs:
                if skill:
                    normalized_skill = normalize_text(skill)
                    logger.debug(f"Original skill: {skill}, Normalized: {normalized_skill}")
                    if not normalized_skill:
                        continue
                    cv_all_skills.append(normalized_skill)
                    if ":" in normalized_skill:
                        category, tools = normalized_skill.split(":", 1)
                        category = category.strip()
                        if category:
                            cv_all_skills.append(category)
                        tool_list = [t.strip() for t in tools.split(",") if t.strip()]
                        cv_all_skills.extend([normalize_text(t) for t in tool_list])
                    elif "(" in normalized_skill and ")" in normalized_skill:
                        base_skill = re.sub(r'\s*\([^)]+\)', '', normalized_skill).strip()
                        if base_skill and base_skill != normalized_skill:
                            cv_all_skills.append(base_skill)
                    elif " " in normalized_skill:
                        base_skill = re.sub(r'\s+\d+', '', normalized_skill).strip()
                        if base_skill and base_skill != normalized_skill:
                            cv_all_skills.append(base_skill)
                    if "," in normalized_skill:
                        sub_skills = [s.strip() for s in normalized_skill.split(",") if s.strip()]
                        cv_all_skills.extend([normalize_text(s) for s in sub_skills if s != normalized_skill])

            cv_all_skills = list(dict.fromkeys(cv_all_skills))
            logger.debug(f"Compétences normalisées du CV : {cv_all_skills}")

            matched = []
            matches_count = 0
            for job_kw in normalized_job_keywords:
                found = False
                for cv_skill in cv_all_skills:
                    if job_kw == cv_skill:
                        matches_count += 1
                        matched.append(job_kw)
                        found = True
                        break
                    elif len(job_kw.split()) == 1 and job_kw in cv_skill.split():
                        matches_count += 1
                        matched.append(job_kw)
                        found = True
                        break
                if not found:
                    logger.debug(f"Pas de correspondance pour job_kw : {job_kw}")

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
            best_manager = None

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
                title_score = (title_similarity / 100) * 45
                raw_scores = {'title_similarity': round(title_similarity, 1)}

                cv_exp = cv.annees_experience or 0
                exp_score = 0.0
                if years_experience > 0:
                    if cv_exp >= years_experience:
                        exp_score = 100 * math.exp(-abs(cv_exp - years_experience) / (1.5 * years_experience))
                    else:
                        exp_score = 100 * math.exp(-abs(cv_exp - years_experience) / (years_experience / 2))
                logger.debug(f"CV {cv.id}: cv_exp={cv_exp}, years_experience={years_experience}, exp_score={exp_score}")
                exp_score_weighted = (exp_score / 100) * 10
                raw_scores['experience_similarity'] = round(exp_score, 1)

                cv_skills = cv.skills.split(',') if cv.skills else []
                cv_certifications = cv.certifications.split(',') if cv.certifications else []
                cv_technologies = extract_technologies_from_experience(cv.experiences.all())
                skills_score, matched_skills = calculate_skill_similarity(job.keywords, cv_skills, cv_certifications, cv_technologies)
                skills_score_weighted = (skills_score / 100) * 45
                raw_scores['skills_similarity'] = round(skills_score, 1)
                raw_scores['matched_skills'] = matched_skills

                total_score = title_score + exp_score_weighted + skills_score_weighted
                total_score = min(round(total_score, 1), 100.0)

                username = cv.utilisateur.email if cv.utilisateur else (cv.username or "Inconnu")
                # Corriger l'accès à manager
                manager = cv.utilisateur.manager.username if cv.utilisateur and cv.utilisateur.manager else "Aucun"
                logger.debug(f"CV {cv.id}: Username={username}, Manager={manager}")

                if total_score > best_score:
                    best_score = total_score
                    best_cv = cv
                    best_raw_scores = raw_scores
                    best_username = username
                    best_matched_skills = matched_skills
                    best_manager = manager

            if best_cv and user_key not in processed_users and best_score >= min_match_score:
                matches.append({
                    'cv_id': best_cv.id,
                    'username': best_username,
                    'manager': best_manager,
                    'match_percentage': best_score,
                    'raw_scores': best_raw_scores,
                    'matched_skills': best_matched_skills
                })
                processed_users.add(user_key)

        matches.sort(key=lambda x: x['match_percentage'], reverse=True)
        matches = matches[:10]

        # Sauvegarder les résultats de matching dans UploadedFile
        uploaded_file.matching_results = matches
        uploaded_file.save()
        logger.info(f"Résultats de matching sauvegardés pour UploadedFile ID {uploaded_file.id}")

        # Réponse JSON avec les résultats du matching
        response_data = {
            'success': True,
            'job_title': job.title,
            'job_id': job.id,
            'file_id': uploaded_file.id,
            'required_skills': job.keywords[:20] if len(job.keywords) > 20 else job.keywords,
            'years_experience': years_experience,
            'uploaded_at': uploaded_file.uploaded_at.isoformat(),
            'matches': matches
        }
        logger.info(f"Fiche de poste téléchargée et matching effectué : ID {job.id}, File ID {uploaded_file.id}")
        return JsonResponse(response_data, status=200)

    except ValueError as e:
        logger.error(f"Erreur de validation : {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Erreur inattendue : {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subordinates_files(request):
    try:
        user = request.user
        logger.debug(f"Utilisateur connecté : {user.username}, Rôle : {user.role}, ID : {user.id}")

        if user.role != 'manager':
            logger.warning(
                f"Accès interdit pour {user.username} : seuls les managers peuvent accéder aux fichiers de leur équipe.")
            return JsonResponse({'error': 'Seuls les managers peuvent accéder à cette ressource'}, status=403)

        team_members = user.get_all_team_members()

        if not team_members:
            logger.info(f"Le manager {user.username} n'a pas de subordonnés")
            return JsonResponse({'message': 'Aucun subordonné trouvé', 'files': []}, status=200)

        files = UploadedFile.objects.filter(user__in=team_members).select_related('user')
        serializer = UploadedFileSerializer(files, many=True)
        files_list = serializer.data

        logger.info(f"{len(files_list)} fichiers récupérés pour l'équipe de {user.username}")
        return JsonResponse({'files': files_list}, safe=False, status=200)

    except Exception as e:
        logger.error(f"Erreur dans subordinates_files pour {request.user.username}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_uploaded_file(request, file_id):
    try:
        user = request.user
        logger.debug(f"Utilisateur connecté : {user.username}, Rôle : {user.role}, ID : {user.id}")

        uploaded_file = UploadedFile.objects.get(id=file_id)
        logger.debug(f"Fichier récupéré pour file_id {file_id} : Nom : {uploaded_file.file.name}, Chemin : {uploaded_file.file.path}")

        if uploaded_file.user == user:
            pass
        elif user.role == 'manager':
            team_members = user.get_all_team_members()
            if uploaded_file.user not in team_members:
                logger.warning(
                    f"Accès interdit pour {user.username} : ce manager n'a pas accès au fichier ID {file_id}.")
                return JsonResponse({'error': 'Accès non autorisé à ce fichier'}, status=403)
        else:
            logger.warning(
                f"Accès interdit pour {user.username} : seuls le propriétaire ou son manager peuvent voir le fichier.")
            return JsonResponse({'error': 'Accès non autorisé à ce fichier'}, status=403)

        if not uploaded_file.file or not uploaded_file.file.storage.exists(uploaded_file.file.path):
            logger.warning(f"Fichier PDF introuvable pour le fichier ID {file_id}.")
            return JsonResponse({'error': 'Fichier PDF introuvable'}, status=404)

        response = FileResponse(
            open(uploaded_file.file.path, 'rb'),
            content_type='application/pdf',
            as_attachment=False
        )
        response['Content-Disposition'] = f'inline; filename="{uploaded_file.file.name}"'
        logger.info(f"Fichier ID {file_id} visualisé par {user.username}.")
        return response

    except UploadedFile.DoesNotExist:
        logger.warning(f"Fichier ID {file_id} introuvable pour {user.username}.")
        return JsonResponse({'error': 'Fichier introuvable'}, status=404)
    except Exception as e:
        logger.error(f"Erreur lors de la visualisation du fichier ID {file_id} par {user.username}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def job_history(request):
    try:
        user = request.user
        logger.debug(f"Utilisateur connecté : {user.username}, Rôle : {user.role}, ID : {user.id}")

        # Récupérer uniquement les fiches uploadées par l'utilisateur connecté
        job_postings = UploadedFile.objects.filter(user=user).select_related('user')

        # Filtrer les fiches avec un chemin valide et un fichier existant
        history = []
        for job in job_postings:
            file_path = job.file.path
            if file_path and default_storage.exists(file_path):
                history.append({
                    'fileId': job.id,
                    'jobTitle': job.file_name,
                    'uploadedAt': job.uploaded_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'matches': job.matching_results or [],
                    'hasFile': True  # Indicateur pour le frontend
                })
            else:
                logger.warning(f"Fichier introuvable ou path invalide pour file_id {job.id}: {file_path}")
                history.append({
                    'fileId': job.id,
                    'jobTitle': job.file_name,
                    'uploadedAt': job.uploaded_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'matches': [],
                    'hasFile': False  # Indicateur pour le frontend
                })

        logger.info(f"{len(history)} fiches téléversées récupérées pour {user.username}")
        return JsonResponse(history, safe=False, status=200)

    except Exception as e:
        logger.error(f"Erreur dans job_history pour {request.user.username}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)