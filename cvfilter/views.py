# cv_filter/views.py
import logging
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from cv_generator.models import CV
from cv_generator.serializers import CVSerializer

logger = logging.getLogger(__name__)

class FilterCVsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info("Requête GET reçue pour filtrer les CVs de l'équipe")
        try:
            user = request.user
            # Vérifier que l'utilisateur est un manager
            if user.role != 'manager':
                logger.warning(f"Accès interdit pour {user.username} : seuls les managers peuvent filtrer les CVs de leur équipe.")
                return Response({'error': 'Seuls les managers peuvent accéder à cette ressource'}, status=403)

            # Récupérer les membres de l'équipe
            team_members = user.get_all_team_members()
            if not team_members:
                logger.info(f"Aucun membre dans l'équipe de {user.username}")
                return Response({'count': 0, 'cvs': []}, status=200)

            team_member_ids = [member.id for member in team_members]

            # Récupérer les paramètres de recherche
            skill = request.query_params.get('skill', '').strip().lower()
            seniority = request.query_params.get('seniority', '').strip().lower()

            # Vérifier qu'au moins un paramètre est fourni
            if not skill and not seniority:
                return Response({'error': 'Veuillez fournir une compétence ou un niveau de seniorité à rechercher'}, status=400)

            # Filtrer les CVs uniquement pour les membres de l'équipe
            cvs = CV.objects.filter(utilisateur__in=team_members).select_related('utilisateur', 'utilisateur__manager')

            # Filtrage par compétence
            if skill:
                cvs = cvs.filter(
                    Q(skills__icontains=skill) |
                    Q(experiences__technologies__icontains=skill)
                ).distinct()

            # Filtrage par seniorité
            if seniority:
                cvs = cvs.filter(seniority=seniority)

            # Sérialiser les CVs
            serializer = CVSerializer(cvs, many=True)
            return Response({
                'count': cvs.count(),
                'cvs': serializer.data
            }, status=200)

        except Exception as e:
            logger.error(f"Erreur dans FilterCVsAPIView: {str(e)}")
            return Response({'error': str(e)}, status=500)