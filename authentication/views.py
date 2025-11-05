from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer
from rest_framework.authtoken.models import Token

class RegisterView(APIView):
    permission_classes = []

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)  # Récupère les données envoyées
        if serializer.is_valid():
            serializer.save()  # Crée l'utilisateur si les données sont valides
            return Response({"message": "User created successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = []
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')


        user = authenticate(request, username=email, password=password)
        if user:
            # Create token
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'username': user.username,
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        return Response({
            'message': 'Invalid credentials'
        }, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]  # Nécessite que l'utilisateur soit authentifié

    def post(self, request, *args, **kwargs):
        try:
            # Récupérer le token de l'utilisateur à partir de l'en-tête d'authentification
            token = request.auth
            if token:
                token.delete()  # Supprimer le token
                return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
            return Response({"message": "No active token found"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"message": f"Error during logout: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


