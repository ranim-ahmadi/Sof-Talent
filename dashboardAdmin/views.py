# dashboardAdmin/views.py
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.utils import json

def dashboard(request):
    try:
        CustomUser = get_user_model()
        users = CustomUser.objects.all().order_by('matricule')
        role_filter = request.GET.get('role')
        if role_filter in ['employee', 'manager']:
            users = users.filter(role=role_filter)

        users_data = list(users.values(
            'id',
            'email',
            'role',
            'matricule',
            'username',
            'manager_matricule',
            'manager__username'
        ))
        return JsonResponse(users_data, safe=False)
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la récupération des utilisateurs : {str(e)}'}, status=500)

@csrf_exempt
@permission_classes([])
def user_crud(request, user_id=None):
    if user_id:
        user = get_object_or_404(get_user_model(), id=user_id)
    else:
        return JsonResponse({'error': 'User ID is required'}, status=400)

    if request.method == 'PUT':
        try:
            body = json.loads(request.body)
            role = body.get('role')
            matricule = body.get('matricule')
            username = body.get('username')
            email = body.get('email')
            manager_matricule = body.get('manager_matricule')

            if role in ['employee', 'manager']:
                user.role = role
            if matricule is not None:
                try:
                    matricule = int(matricule)
                    if get_user_model().objects.exclude(id=user.id).filter(matricule=matricule).exists():
                        return JsonResponse({'error': 'Ce matricule est déjà utilisé par un autre utilisateur'}, status=400)
                    user.matricule = matricule
                except (ValueError, TypeError):
                    return JsonResponse({'error': 'Le matricule doit être un entier'}, status=400)
            if username:
                user.username = username
            if email:
                if get_user_model().objects.exclude(id=user.id).filter(email=email).exists():
                    return JsonResponse({'error': 'Cet email est déjà utilisé par un autre utilisateur'}, status=400)
                user.email = email
            if manager_matricule is not None:
                if manager_matricule == "":
                    user.manager_matricule = None
                    user.manager = None  # Synchroniser manager avec manager_matricule
                else:
                    try:
                        manager_matricule = int(manager_matricule)
                        manager = get_user_model().objects.get(matricule=manager_matricule, role='manager')
                        if manager.id == user.id:
                            return JsonResponse({'error': 'Un utilisateur ne peut pas être son propre manager'}, status=400)
                        current = manager
                        while current.manager:
                            if current.manager.id == user.id:
                                return JsonResponse({'error': 'Boucle détectée dans la hiérarchie des managers'}, status=400)
                            current = current.manager
                        user.manager_matricule = manager_matricule
                        user.manager = manager  # Synchroniser manager avec manager_matricule
                    except ValueError:
                        return JsonResponse({'error': 'Le matricule du manager doit être un entier'}, status=400)
                    except get_user_model().DoesNotExist:
                        return JsonResponse({'error': 'Manager non trouvé avec ce matricule ou n\'a pas le rôle "manager"'}, status=400)

            user.save()

            user_data = {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'matricule': user.matricule,
                'username': user.username,
                'manager_matricule': user.manager_matricule,
                'manager__username': user.manager.username if user.manager else None
            }
            return JsonResponse({'success': f"User {user.email} updated", 'user': user_data}, status=200)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Méthode non autorisée, utilisez PUT'}, status=405)

@csrf_exempt
@api_view(['DELETE'])
@permission_classes([])
def delete_user(request, user_id):
    try:
        user = get_user_model().objects.get(id=user_id)
        user.delete()
        return JsonResponse({'message': 'Utilisateur supprimé avec succès'}, status=200)
    except get_user_model().DoesNotExist:
        return JsonResponse({'error': 'Utilisateur non trouvé'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

def get_managers(request):
    CustomUser = get_user_model()
    managers = CustomUser.objects.filter(role='manager').values('matricule', 'username')
    return JsonResponse(list(managers), safe=False)

def get_manager_by_matricule(request):
    matricule = request.GET.get('matricule')
    if not matricule:
        return JsonResponse({'error': 'Matricule requis'}, status=400)

    try:
        matricule = int(matricule)
        manager = get_user_model().objects.get(matricule=matricule, role='manager')
        return JsonResponse({'matricule': manager.matricule, 'username': manager.username}, status=200)
    except ValueError:
        return JsonResponse({'error': 'Le matricule doit être un entier'}, status=400)
    except get_user_model().DoesNotExist:
        return JsonResponse({'error': 'Manager non trouvé avec ce matricule ou n\'a pas le rôle "manager"'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    try:
        user = request.user
        manager_username = None
        if user.manager:
            manager_username = user.manager.username
        elif user.manager_matricule:  # Si manager n'est pas défini, utiliser manager_matricule
            try:
                manager = get_user_model().objects.get(matricule=user.manager_matricule, role='manager')
                user.manager = manager  # Synchroniser manager avec manager_matricule
                user.save()
                manager_username = manager.username
            except get_user_model().DoesNotExist:
                manager_username = None

        data = {
            'id': user.id,  # Ajout de l'ID
            'username': user.username,
            'manager__username': manager_username,
            'role': user.role  # Ajouter le rôle de l'utilisateur
        }
        return JsonResponse(data, status=200)
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la récupération des informations utilisateur : {str(e)}'}, status=500)