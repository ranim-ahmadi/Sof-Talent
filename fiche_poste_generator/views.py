# fiche_poste_generator/views.py
from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import os
import logging
import platform
import re
from docxtpl import DocxTemplate
from docx2pdf import convert
from django.conf import settings
from .serializers import JobDescriptionSerializer
from .models import JobDescription
import pythoncom

logger = logging.getLogger(__name__)

class JobDescriptionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.debug(f"Requête POST reçue pour JobDescriptionCreateView par {request.user.email}: {request.data}")

        # Préparer les données pour le serializer
        data = request.data.copy()
        for field in ['technical_skills', 'personal_qualities', 'keywords']:
            value = data.get(field, '')
            if isinstance(value, str):
                data[field] = [item.strip() for item in value.split('\n') if item.strip()] or [item.strip() for item in value.split(',') if item.strip()]
            elif isinstance(value, list):
                data[field] = [str(item).strip() for item in value if str(item).strip()]
            else:
                data[field] = []

        serializer = JobDescriptionSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            job_description = serializer.save(user=request.user)
            try:
                docx_path, pdf_path = self.generate_job_description_files(job_description)
                logger.info(f"Fichiers générés : docx={docx_path}, pdf={pdf_path}")
                if not os.path.exists(pdf_path):
                    logger.error(f"Le fichier PDF n'a pas été généré à {pdf_path}")
                    return Response({'error': 'Erreur lors de la génération du PDF'},
                                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                safe_title = re.sub(r"[^a-zA-Z0-9_]", "", job_description.title.replace(" ", "_"))
                filename = f"{safe_title}_Fiche_{job_description.id}.pdf"

                response = FileResponse(
                    open(pdf_path, 'rb'),
                    as_attachment=True,
                    filename=filename
                )
                response['X-JobDescription-ID'] = str(job_description.id)
                logger.info(
                    f"Fiche de poste générée avec succès pour {job_description.title}, ID: {job_description.id}")
                response['Access-Control-Expose-Headers'] = 'X-JobDescription-ID'
                return response
            except Exception as e:
                logger.error(f"Erreur lors de la génération des fichiers pour {job_description.title}: {str(e)}",
                             exc_info=True)
                return Response({'error': f'Erreur lors de la génération du document: {str(e)}'},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        logger.warning(f"Erreurs de validation pour {request.user.email}: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def generate_job_description_files(self, job_description):
        logger.debug(f"Génération des fichiers pour Fiche ID {job_description.id}")

        # main_tasks est déjà une liste grâce au sérialiseur
        main_tasks_list = job_description.main_tasks

        # Diviser le champ profile
        profile_parts = job_description.profile.split('\n')
        profile_education = "Non spécifié"
        profile_experience = "Non spécifié"
        en_tant_que = "Non spécifié"
        for part in profile_parts:
            if part.startswith("Formation:"):
                profile_education = part.replace("Formation: ", "").strip() or "Non spécifié"
            elif part.startswith("Expérience:"):
                profile_experience = part.replace("Expérience: ", "").strip() or "Non spécifié"
            elif part.startswith("En tant que:"):
                en_tant_que = part.replace("En tant que: ", "").strip() or "Non spécifié"

        context = {
            'title': job_description.title,
            'missions': job_description.missions or "Non spécifié",  # Fallback si missions est vide
            'main_tasks': main_tasks_list,
            'profile_education': profile_education,
            'profile_experience': profile_experience,
            'en_tant_que': en_tant_que,
            'technical_skills': job_description.technical_skills,
            'personal_qualities': job_description.personal_qualities,
            'keywords': job_description.keywords
        }

        logger.debug(f"Contexte pour le template : {context}")

        template_path = os.path.join(settings.BASE_DIR, 'templates', 'tempfiche.docx')
        if not os.path.exists(template_path):
            logger.error(f"Template introuvable à {template_path}")
            raise FileNotFoundError(f"Template not found at {template_path}")

        output_dir = os.path.join(settings.MEDIA_ROOT, 'generated_fiches')
        os.makedirs(output_dir, exist_ok=True)

        safe_title = re.sub(r"[^a-zA-Z0-9_]", "", job_description.title.replace(" ", "_"))
        docx_filename = f"{safe_title}_Fiche_{job_description.id}.docx"
        docx_path = os.path.join(output_dir, docx_filename)
        pdf_filename = f"{safe_title}_Fiche_{job_description.id}.pdf"
        pdf_path = os.path.join(output_dir, pdf_filename)

        try:
            doc = DocxTemplate(template_path)
            doc.render(context)
            doc.save(docx_path)
            logger.debug(f"Fichier Word sauvegardé : {docx_path}")
        except Exception as e:
            logger.error(f"Erreur lors du rendu du template Word : {str(e)}", exc_info=True)
            raise

        if platform.system() == 'Windows':
            pythoncom.CoInitialize()
            try:
                convert(docx_path, pdf_path)
                logger.debug(f"Fichier PDF généré : {pdf_path}")
            except Exception as e:
                logger.error(f"Erreur lors de la conversion PDF : {str(e)}", exc_info=True)
                raise
            finally:
                pythoncom.CoUninitialize()
        else:
            logger.warning("Conversion PDF non prise en charge sur ce système. Utilisation du fichier Word uniquement.")
            pdf_path = docx_path  # Fallback sur le fichier Word

        return docx_path, pdf_path