// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://127.0.0.1:8000'; // URL de base de ton backend Django

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Token non trouvé !");
      return new HttpHeaders();
    }
    return new HttpHeaders({
      'Authorization': `Token ${token}`
    });
  }

  // Récupérer les utilisateurs
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboard/`, { headers: this.getAuthHeaders() });
  }

  // Récupérer un manager par matricule
  getManagerByMatricule(matricule: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/manager-by-matricule/?matricule=${matricule}`, { headers: this.getAuthHeaders() });
  }

  // Mettre à jour un utilisateur (y compris manager_matricule)
  updateUser(userId: number, userData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/user/${userId}/update/`, userData, { headers: this.getAuthHeaders() });
  }

  // Mettre à jour le rôle d'un utilisateur
  updateUserRole(userId: number, role: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/user/${userId}/update/`, { role }, { headers: this.getAuthHeaders() });
  }

  // Supprimer un utilisateur
  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/user/${userId}/delete/`, { headers: this.getAuthHeaders() });
  }

  // Filtrer les utilisateurs par rôle
  getUsersByRole(role: string): Observable<any> {
    const url = role ? `${this.baseUrl}/dashboard/?role=${role}` : `${this.baseUrl}/dashboard/`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() });
  }
}