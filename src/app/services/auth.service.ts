import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/';
  private userIdSubject = new BehaviorSubject<number | null>(null);
  userId$ = this.userIdSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Ne pas appeler getUserData() ici pour éviter la dépendance circulaire
    const storedId = localStorage.getItem('userId');
    if (storedId) {
      this.userIdSubject.next(Number(storedId));
    }
  }

  register(user: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.apiUrl}register/`, user, { headers });
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}login/`, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          this.loadUserData(); // Charger les données après la connexion
        }
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
      this.http.post(`${this.apiUrl}logout/`, {}, { headers }).subscribe({
        next: () => {
          console.log('Déconnexion réussie');
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          this.userIdSubject.next(null);
          this.router.navigate(['login']);
        },
        error: (error) => {
          console.error('Erreur lors de la déconnexion:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          this.userIdSubject.next(null);
          this.router.navigate(['login']);
        }
      });
    } else {
      console.warn('Aucun token, déconnexion locale');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      this.userIdSubject.next(null);
      this.router.navigate(['login']);
    }
  }

  getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const token = this.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getUserData(): Observable<any> {
    return this.http.get(`${this.apiUrl}user-info/`, { headers: this.getHeaders() }).pipe(
      tap((data: any) => {
        if (data && data.id) {
          this.userIdSubject.next(data.id);
          localStorage.setItem('userId', data.id.toString());
        }
        if (data && data.username) {
          localStorage.setItem('username', data.username);
        }
      }),
      catchError(error => {
        console.error('Erreur getUserData:', error);
        return of(null);
      })
    );
  }

  // Méthode explicite pour charger les données utilisateur
  loadUserData(): void {
    if (this.isLoggedIn()) {
      this.getUserData().subscribe();
    }
  }

  getUserName(): string | null {
    return localStorage.getItem('username');
  }

  getUserId(): Observable<number | null> {
    const storedId = localStorage.getItem('userId');
    if (storedId) {
      this.userIdSubject.next(Number(storedId));
    }
    return this.userId$.pipe(
      tap(id => {
        if (!id && this.isLoggedIn()) {
          this.loadUserData();
        }
      })
    );
  }
}