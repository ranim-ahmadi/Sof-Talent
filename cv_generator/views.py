import os
import logging
import json
import zipfile
from docxtpl import DocxTemplate
from docx2pdf import convert
from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from io import BytesIO
import pythoncom
from .models import CV, Experience
from notification.models import Notification
from .serializers import CVSerializer
from notification.serializers import NotificationSerializer
from transformers import MarianTokenizer, MarianMTModel
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

logger = logging.getLogger(__name__)

# Fonction pour nettoyer les chaînes et gérer les erreurs d'encodage
def clean_string(value):
    if isinstance(value, str):
        try:
            return value.encode('utf-8', errors='replace').decode('utf-8')
        except Exception as e:
            logger.warning(f"Erreur d'encodage pour valeur {value}: {str(e)}")
            return ""
    return value

class GenerateCVView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.debug(f"Requête POST reçue pour GenerateCVView par {request.user.username}")
        try:
            data = request.data.copy()
            data['utilisateur'] = request.user.id
            data['username'] = clean_string(request.user.username)
            data['email'] = clean_string(request.user.email)
            data['matricule'] = clean_string(getattr(request.user, 'matricule', ''))

            annees_experience = int(data.get('annees_experience', 0))
            if annees_experience < 0:
                raise ValueError("Les années d'expérience ne peuvent pas être négatives")
            if annees_experience <= 3:
                data['seniority'] = 'junior'
            elif annees_experience <= 5:
                data['seniority'] = 'intermediate'
            else:
                data['seniority'] = 'senior'

            required_fields = ['title', 'poste_actuel', 'annees_experience', 'overview', 'skills', 'languages', 'certifications', 'experiences']
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Champ requis manquant: {field}")

            experiences = data.get('experiences', [])
            if not isinstance(experiences, list):
                raise ValueError("Les expériences doivent être une liste")
            for exp in experiences:
                if not all(key in exp for key in ['employeur', 'position', 'missions', 'technologies', 'date_debut']):
                    raise ValueError("Chaque expérience doit contenir les champs: employeur, position, missions, technologies, date_debut")

            serializer = CVSerializer(data=data)
            if serializer.is_valid():
                cv = serializer.save()
                fr_docx_path, fr_pdf_path = self.generate_cv_files(cv, language='fr')
                en_docx_path, en_pdf_path = self.generate_cv_files(cv, language='en')

                cv.file_path = os.path.relpath(fr_docx_path, settings.MEDIA_ROOT)
                cv.file_path_en = os.path.relpath(en_docx_path, settings.MEDIA_ROOT)
                cv.save()

                with open(fr_pdf_path, 'rb') as pdf_file:
                    response = FileResponse(BytesIO(pdf_file.read()), as_attachment=True, filename=f'{cv.username}_CV_{cv.id}.pdf')
                    response['X-CV-ID'] = str(cv.id)
                    logger.info(f"CV généré avec succès pour {cv.username}, ID: {cv.id} (versions FR et EN)")
                    return response
            logger.warning(f"Erreurs de validation pour {request.user.username}: {serializer.errors}")
            return Response(serializer.errors, status=400)

        except ValueError as e:
            logger.warning(f"ValueError pour {request.user.username}: {str(e)}")
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Erreur lors de la génération du CV pour {request.user.username}: {str(e)}")
            return Response({'error': 'Erreur lors de la génération du CV: ' + str(e)}, status=500)

    def generate_cv_files(self, cv, language='fr'):
        def safe_json_loads(value):
            if not value:
                return []
            if isinstance(value, str):
                try:
                    decoded = json.loads(value)
                    if isinstance(decoded, list):
                        return [clean_string(item) for item in decoded]
                    return [clean_string(decoded)]
                except json.JSONDecodeError:
                    return [clean_string(line.strip()) for line in value.split('\n') if line.strip()]
            return [clean_string(item) for item in (value if isinstance(value, list) else [value])]

        def translate_text(text, src='fr', dest='en'):
            if not text or not isinstance(text, str):
                return text
            if language == 'en' and src == 'fr':
                inputs = tokenizer(clean_string(text), return_tensors="pt", padding=True)
                translated = model.generate(**inputs)
                return tokenizer.decode(translated[0], skip_special_tokens=True)
            return clean_string(text)

        model_name = 'Helsinki-NLP/opus-mt-fr-en'
        tokenizer = MarianTokenizer.from_pretrained(model_name)
        model = MarianMTModel.from_pretrained(model_name)

        all_experiences = [
            {
                'date_debut': exp.date_debut,
                'date_fin': clean_string(exp.date_fin) if exp.date_fin else 'Ongoing',
                'employeur': clean_string(exp.employeur),
                'position': translate_text(exp.position, src='fr', dest='en') if language == 'en' else clean_string(exp.position),
                'missions': [translate_text(m, src='fr', dest='en') for m in safe_json_loads(exp.missions)] if language == 'en' else safe_json_loads(exp.missions),
                'technologies': safe_json_loads(exp.technologies),
            } for exp in cv.experiences.all()
        ]
        last_three_experiences = all_experiences[:3]

        context = {
            'title': translate_text(cv.title, src='fr', dest='en') if language == 'en' else clean_string(cv.title),
            'username': clean_string(cv.username),
            'poste_actuel': translate_text(cv.poste_actuel, src='fr', dest='en') if language == 'en' else clean_string(cv.poste_actuel),
            'email': clean_string(cv.email),
            'matricule': clean_string(cv.matricule),
            'annees_experience': cv.annees_experience,
            'overview': translate_text(cv.overview, src='fr', dest='en') if language == 'en' else clean_string(cv.overview),
            'skills': [translate_text(skill, src='fr', dest='en') for skill in safe_json_loads(cv.skills)] if language == 'en' else safe_json_loads(cv.skills),
            'languages': [translate_text(lang, src='fr', dest='en') for lang in safe_json_loads(cv.languages)] if language == 'en' else safe_json_loads(cv.languages),
            'certifications': [translate_text(cert, src='fr', dest='en') for cert in safe_json_loads(cv.certifications)] if language == 'en' else safe_json_loads(cv.certifications),
            'all_experiences': all_experiences,
            'last_three_experiences': last_three_experiences,
            'seniority': clean_string(cv.seniority),
            'created_at': cv.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

        logger.debug(f"Contexte envoyé au template pour CV ID {cv.id}, langue: {language}: {context}")

        template_filename = 'Template_CV_FR.docx' if language == 'fr' else 'Template_CV_EN.docx'
        template_path = os.path.join(settings.BASE_DIR, 'templates', template_filename)
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template not found at {template_path}")

        output_dir = os.path.join(settings.MEDIA_ROOT, 'generated_cvs')
        os.makedirs(output_dir, exist_ok=True)

        lang_suffix = '_EN' if language == 'en' else ''
        docx_path = os.path.join(output_dir, f'{cv.username}_CV_{cv.id}{lang_suffix}.docx')
        pdf_path = os.path.join(output_dir, f'{cv.username}_CV_{cv.id}{lang_suffix}.pdf')

        doc = DocxTemplate(template_path)
        doc.render(context)
        doc.save(docx_path)

        pythoncom.CoInitialize()
        convert(docx_path, pdf_path)
        pythoncom.CoUninitialize()

        return docx_path, pdf_path

class CvRetrieveUpdateAPIView(APIView):
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'role') and user.role == 'manager':
            team_members = user.get_all_team_members()
            team_member_ids = [member.id for member in team_members]
            return CV.objects.filter(utilisateur__id__in=[user.id] + team_member_ids)
        return CV.objects.filter(utilisateur=user)

    def get_object(self, pk):
        queryset = self.get_queryset()
        try:
            return queryset.get(pk=pk)
        except CV.DoesNotExist:
            return Response({"error": "CV non trouvé"}, status=404)

    def get(self, request, *args, **kwargs):
        logger.debug(f"Requête GET reçue pour CvRetrieveUpdateAPIView par {request.user.username}")
        cv = self.get_object(kwargs.get('id'))
        if isinstance(cv, Response):
            return cv

        serializer = CVSerializer(cv)
        logger.debug(f"Données sérialisées pour CV {cv.id}: {serializer.data}")
        return Response(serializer.data, status=200)

    def put(self, request, *args, **kwargs):
        logger.debug(f"Requête PUT reçue pour CvRetrieveUpdateAPIView par {request.user.username}")
        try:
            cv = self.get_object(kwargs.get('id'))
            if isinstance(cv, Response):
                return cv
            data = request.data.copy()
            logger.debug(f"Données reçues pour mise à jour: {data}")
            if 'id' in data:
                del data['id']
            if 'utilisateur' in data:
                del data['utilisateur']
            data['username'] = clean_string(cv.utilisateur.username)
            data['email'] = clean_string(cv.utilisateur.email)
            data['matricule'] = clean_string(getattr(cv.utilisateur, 'matricule', ''))

            annees_experience = int(data.get('annees_experience', cv.annees_experience))
            if annees_experience < 0:
                raise ValueError("Les années d'expérience ne peuvent pas être négatives")
            if annees_experience <= 3:
                seniority = 'junior'
            elif annees_experience <= 5:
                seniority = 'intermediate'
            else:
                seniority = 'senior'

            if not hasattr(request.user, 'is_authenticated') or not request.user.is_authenticated:
                return Response({"error": "Authentification requise"}, status=401)
            if cv.utilisateur != request.user and (not hasattr(request.user, 'role') or request.user.role != 'manager'):
                return Response({"error": "Permission refusée. Seuls les managers peuvent modifier les CV d'autres utilisateurs."}, status=403)

            language = request.query_params.get('language', 'fr')

            cv.title = clean_string(data.get('title', cv.title))
            cv.poste_actuel = clean_string(data.get('poste_actuel', cv.poste_actuel))
            cv.annees_experience = annees_experience
            cv.seniority = seniority
            cv.overview = clean_string(data.get('overview', cv.overview))

            for field in ['skills', 'languages', 'certifications']:
                if field in data:
                    setattr(cv, field, json.dumps(data[field]))

            if 'experiences' in data:
                experiences_data = data.get('experiences')
                if not isinstance(experiences_data, list):
                    raise ValueError("Les expériences doivent être une liste")

                cv.experiences.all().delete()
                for exp_data in experiences_data:
                    if isinstance(exp_data, dict):
                        required_fields = ['employeur', 'position', 'missions', 'technologies', 'date_debut']
                        for field in required_fields:
                            if field not in exp_data:
                                raise ValueError(f"Champ requis manquant dans l'expérience: {field}")

                        if isinstance(exp_data.get('missions'), list):
                            exp_data['missions'] = '\n'.join(str(m) for m in exp_data['missions'])
                        if isinstance(exp_data.get('technologies'), list):
                            exp_data['technologies'] = '\n'.join(str(t) for t in exp_data['technologies'])

                        Experience.objects.create(cv=cv, **exp_data)
                    else:
                        try:
                            exp = Experience.objects.get(id=exp_data)
                            cv.experiences.add(exp)
                        except Experience.DoesNotExist:
                            raise ValueError(f"Expérience avec ID {exp_data} non trouvée")

            if hasattr(request.user, 'role') and request.user.role == 'manager' and cv.utilisateur != request.user:
                cv.last_updated_by = request.user
                notification_message = f"Votre manager {request.user.username} a modifié votre CV '{clean_string(cv.poste_actuel)}' le {timezone.now().strftime('%d/%m/%Y %H:%M')}."
                Notification.objects.create(recipient=cv.utilisateur, message=notification_message, related_cv=cv)
                channel_layer = get_channel_layer()
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"notifications_{cv.utilisateur.id}",
                        {"type": "send_notification", "message": notification_message}
                    )
                    logger.info(f"Notification envoyée à {cv.utilisateur.username} pour modification de CV par {request.user.username}")
                except Exception as e:
                    logger.error(f"Échec de l'envoi de la notification pour {cv.utilisateur.username}: {str(e)}")

            cv.save()
            logger.debug("Après cv.save(), avant génération des fichiers")

            logger.debug(f"Début de la génération des fichiers pour CV {cv.id}, langue: {language}")
            fr_docx_path, fr_pdf_path = GenerateCVView().generate_cv_files(cv, language='fr')
            en_docx_path, en_pdf_path = GenerateCVView().generate_cv_files(cv, language='en')
            logger.debug(f"Fichiers générés: FR={fr_docx_path}, EN={en_docx_path}")

            cv.file_path = os.path.relpath(fr_docx_path, settings.MEDIA_ROOT)
            cv.file_path_en = os.path.relpath(en_docx_path, settings.MEDIA_ROOT)
            cv.save()

            pdf_path = fr_pdf_path if language == 'fr' else en_pdf_path
            with open(pdf_path, 'rb') as pdf_file:
                response = FileResponse(BytesIO(pdf_file.read()), as_attachment=True, filename=f'{cv.username}_CV_{cv.id}_updated_{language.upper()}.pdf')
                logger.info(f"Version {language} du CV ID {cv.id} mis à jour avec succès par {request.user.username}")
                return response

        except ValueError as e:
            logger.warning(f"ValueError pour {request.user.username}: {str(e)}")
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du CV pour {request.user.username}: {str(e)}")
            return Response({'error': str(e)}, status=500)

class NotificationListAPIView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user, is_expired=False).order_by('-created_at')

class CvUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.debug(f"Requête GET reçue pour CvUserAPIView par {request.user.username}")
        try:
            cvs = CV.objects.filter(utilisateur=request.user).order_by('-created_at')
            serializer = CVSerializer(cvs, many=True)
            logger.info(f"{len(serializer.data)} CVs récupérés pour {request.user.username}")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des CVs pour {request.user.username}: {str(e)}")
            return Response({'error': str(e)}, status=500)

class CVPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        logger.debug(f"Tentative de prévisualisation du CV ID {id} par {request.user.username}")
        try:
            user = request.user
            language = request.query_params.get('language', 'fr')
            if user.role == 'manager':
                team_members = user.get_all_team_members()
                team_member_ids = [member.id for member in team_members]
                cv = CV.objects.get(id=id, utilisateur__id__in=[user.id] + team_member_ids)
            else:
                cv = CV.objects.get(id=id, utilisateur=user)

            # Sélectionner le chemin en fonction de la langue
            file_path = cv.file_path_en if language == 'en' else cv.file_path
            if not file_path:
                logger.warning(f"Aucun file_path défini pour le CV ID {id} (langue: {language})")
                return Response({'error': f'Aucun fichier {language.upper()} associé à ce CV'}, status=404)

            docx_file_path = os.path.join(settings.MEDIA_ROOT, str(file_path))
            if not os.path.exists(docx_file_path):
                logger.warning(f"Fichier DOCX introuvable pour le CV ID {id}: {docx_file_path}")
                return Response({'error': 'Fichier DOCX introuvable sur le serveur'}, status=404)

            pdf_file_path = docx_file_path.replace('.docx', '.pdf')
            if not os.path.exists(pdf_file_path):
                logger.info(f"Conversion de {docx_file_path} en {pdf_file_path}")
                pythoncom.CoInitialize()
                convert(docx_file_path, pdf_file_path)
                pythoncom.CoUninitialize()

            with open(pdf_file_path, 'rb') as pdf_file:
                response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="CV_{id}_{language}.pdf"'
                logger.info(f"Prévisualisation réussie pour le CV ID {id} ({language}) par {request.user.username}")
                return response

        except CV.DoesNotExist:
            logger.warning(f"CV avec ID {id} non trouvé ou ne correspond pas à l'utilisateur {request.user.username}")
            return Response({'error': 'CV non trouvé ou vous n\'avez pas la permission de le consulter'}, status=404)
        except Exception as e:
            logger.error(f"Erreur lors de la prévisualisation du CV ID {id} pour {request.user.username}: {str(e)}")
            return Response({'error': 'Erreur lors de la génération de l\'aperçu: ' + str(e)}, status=500)

class CVDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        logger.debug(f"Tentative de téléchargement du CV ID {id} par {request.user.username}")
        try:
            user = request.user
            if user.role == 'manager':
                team_members = user.get_all_team_members()
                team_member_ids = [member.id for member in team_members]
                cv = CV.objects.get(id=id, utilisateur__id__in=[user.id] + team_member_ids)
            else:
                cv = CV.objects.get(id=id, utilisateur=user)

            language = request.query_params.get('language', 'fr')
            file_path = cv.file_path_en if language == 'en' else cv.file_path
            if not file_path:
                logger.warning(f"Aucun file_path défini pour le CV ID {id} (langue: {language})")
                return Response({'error': f'Aucune version {language.upper()} disponible pour ce CV'}, status=404)

            docx_file_path = os.path.join(settings.MEDIA_ROOT, str(file_path).replace('\\', '/'))
            pdf_file_path = docx_file_path.replace('.docx', '.pdf')

            # Vérifier l'existence des fichiers
            if not os.path.exists(docx_file_path):
                logger.warning(f"Fichier DOCX introuvable pour le CV ID {id}: {docx_file_path}")
                return Response({'error': 'Fichier DOCX introuvable'}, status=404)
            if not os.path.exists(pdf_file_path):
                logger.warning(f"Fichier PDF introuvable pour le CV ID {id}: {pdf_file_path}")
                return Response({'error': 'Fichier PDF introuvable'}, status=404)

            # Créer un ZIP avec les fichiers existants
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                with open(docx_file_path, 'rb') as docx_file:
                    zip_file.writestr(f'{cv.username}_CV_{cv.id}_{language.upper()}.docx', docx_file.read())
                with open(pdf_file_path, 'rb') as pdf_file:
                    zip_file.writestr(f'{cv.username}_CV_{cv.id}_{language.upper()}.pdf', pdf_file.read())

            zip_buffer.seek(0)
            response = FileResponse(zip_buffer, as_attachment=True, filename=f'{cv.username}_CV_{cv.id}.zip')
            response['Content-Type'] = 'application/zip'
            logger.info(f"Téléchargement ZIP réussi pour le CV ID {id} par {request.user.username}")
            return response

        except CV.DoesNotExist:
            logger.warning(f"CV avec ID {id} non trouvé ou ne correspond pas à l'utilisateur {request.user.username}")
            return Response({'error': 'CV non trouvé ou vous n\'avez pas la permission de le télécharger'}, status=404)
        except Exception as e:
            logger.error(f"Erreur lors du téléchargement du CV ID {id} pour {request.user.username}: {str(e)}")
            return Response({'error': 'Erreur lors du téléchargement: ' + str(e)}, status=500)

class SearchAllCVsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info("Requête GET reçue pour rechercher tous les CVs")
        try:
            user = request.user
            if user.role != 'manager':
                logger.warning(f"Accès interdit pour {user.username} : seuls les managers peuvent rechercher tous les CVs.")
                return Response({'error': 'Seuls les managers peuvent accéder à cette ressource'}, status=403)

            skill = request.query_params.get('skill', '').strip().lower()
            seniority = request.query_params.get('seniority', '').strip().lower()

            if not skill and not seniority:
                return Response({'error': 'Veuillez fournir une compétence ou un niveau de seniorité à rechercher'}, status=400)

            cvs = CV.objects.all().select_related('utilisateur', 'utilisateur__manager')

            if skill:
                matched_cvs = []
                for cv in cvs:
                    skills = cv.skills
                    if isinstance(skills, str):
                        try:
                            skills = json.loads(skills)
                        except json.JSONDecodeError:
                            skills = [s.strip() for s in skills.split(',') if s.strip()]
                    skills = [clean_string(s).lower() for s in skills] if isinstance(skills, list) else []

                    technologies = []
                    for exp in cv.experiences.all():
                        techs = exp.technologies
                        if isinstance(techs, str):
                            try:
                                techs = json.loads(techs)
                            except json.JSONDecodeError:
                                techs = [t.strip() for t in techs.split(',') if t.strip()]
                        technologies.extend([clean_string(t).lower() for t in techs] if isinstance(techs, list) else [])

                    if skill in skills or skill in technologies:
                        matched_cvs.append(cv.id)

                cvs = cvs.filter(id__in=matched_cvs) if matched_cvs else cvs.none()

            if seniority:
                cvs = cvs.filter(seniority=clean_string(seniority))

            serializer = CVSerializer(cvs, many=True)
            return Response({
                'count': cvs.count(),
                'cvs': serializer.data
            }, status=200)

        except Exception as e:
            logger.error(f"Erreur dans SearchAllCVsAPIView: {str(e)}")
            return Response({'error': str(e)}, status=500)

class CVDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        logger.debug(f"Tentative de suppression du CV ID {id} par {request.user.username}")
        try:
            user = request.user
            if user.role == 'manager':
                team_members = user.get_all_team_members()
                team_member_ids = [member.id for member in team_members]
                cv = CV.objects.get(id=id, utilisateur__id__in=[user.id] + team_member_ids)
            else:
                cv = CV.objects.get(id=id, utilisateur=user)

            if user.role == 'manager' and cv.utilisateur != user:
                cv.last_updated_by = user
                cv.save()

            language = request.query_params.get('language', 'fr')
            file_path = cv.file_path_en if language == 'en' else cv.file_path
            if not file_path:
                logger.warning(f"Aucun file_path défini pour le CV ID {id} (langue: {language})")
                return Response({'error': f'Aucun fichier {language.upper()} associé à ce CV'}, status=404)

            docx_file_path = os.path.join(settings.MEDIA_ROOT, str(file_path))
            pdf_file_path = docx_file_path.replace('.docx', '.pdf')
            for path in [docx_file_path, pdf_file_path]:
                if os.path.exists(path):
                    os.remove(path)

            if language == 'fr':
                cv.file_path = None
            else:
                cv.file_path_en = None
            cv.save()

            if not cv.file_path and not cv.file_path_en:
                cv.delete()
                logger.info(f"CV ID {id} supprimé complètement par {request.user.username}")
                return Response({'message': 'CV supprimé complètement'}, status=204)

            logger.info(f"Version {language} du CV ID {id} supprimée avec succès par {request.user.username}")
            return Response({'message': f'Version {language} du CV supprimée avec succès'}, status=204)

        except CV.DoesNotExist:
            logger.warning(f"CV avec ID {id} non trouvé ou ne correspond pas à l'utilisateur {request.user.username}")
            return Response({'error': 'CV non trouvé ou vous n\'avez pas la permission de le supprimer'}, status=404)
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du CV ID {id} pour {request.user.username}: {str(e)}")
            return Response({'error': 'Erreur lors de la suppression: ' + str(e)}, status=500)