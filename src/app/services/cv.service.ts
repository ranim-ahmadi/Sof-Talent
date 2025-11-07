import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Interfaces existantes
export interface CV {
  id?: number;
  username?: string;
  email?: string;
  poste_actuel: string;
  annees_experience: number;
  overview?: string;
  skills: string[];
  languages: string[];
  certifications: string[];
  experiences: Experience[];
  matricule?: string;
  file_path?: string;
  file_path_en?: string; // Ajout pour gérer le chemin EN
  utilisateur?: number;
  seniority?: string;
  title: string;
  created_at: string;
  managed_by?: string;
}

export interface Experience {
  employeur: string;
  position: string;
  missions: string[] | string; // Autoriser string ou string[] pour gérer les données brutes
  technologies: string[] | string; // Autoriser string ou string[] pour gérer les données brutes
  date_debut: string;
  date_fin?: string | null;
}

export interface SearchCVResponse {
  count: number;
  cvs: CV[];
}

export interface TeamCVResponse {
  cvs: CV[];
}

@Injectable({
  providedIn: 'root'
})
export class CvService {
  private apiUrl = 'http://127.0.0.1:8000'; // Base URL sans préfixe
  private lastCreatedCvId?: number;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('Jeton utilisé :', token);
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    if (error.status === 400) {
      errorMessage = 'Erreur dans les données envoyées. Vérifiez le formulaire.';
    } else if (error.status === 401) {
      errorMessage = 'Utilisateur non authentifié. Veuillez vous connecter.';
    } else if (error.status === 403) {
      errorMessage = 'Accès interdit. Vérifiez vos permissions.';
    } else if (error.status === 404) {
      errorMessage = 'Ressource non trouvée.';
    } else {
      errorMessage = `Erreur ${error.status}: ${error.message}`;
    }
    console.error('Erreur HTTP:', error);
    return throwError(() => new Error(errorMessage));
  }

  // Récupérer les informations de l'utilisateur (y compris le nom du manager)
  getUserInfo(): Observable<any> {
    const url = `${this.apiUrl}/user-info/`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  // Récupérer les CVs des membres de l'équipe (pour les managers)
  getTeamCVs(): Observable<CV[]> {
    const url = `${this.apiUrl}/api/manager-space/team-cvs/`;
    console.log('URL appelée pour getTeamCVs:', url);
    return this.http.get<TeamCVResponse>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.cvs || []),
      catchError(error => {
        if (error.status === 404) {
          console.log('Aucun CV trouvé pour les membres de l\'équipe, retour d\'une liste vide.');
          return of([]);
        }
        return this.handleError(error);
      })
    );
  }

  // Méthode pour rechercher parmi les CVs de l'équipe uniquement
  filterCVsBySkill(skill: string): Observable<SearchCVResponse> {
    const url = `${this.apiUrl}/api/cv/cvfilter/filter/`;
    return this.http.get<SearchCVResponse>(url, {
      headers: this.getHeaders(),
      params: { skill }
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Méthode pour rechercher parmi TOUS les CVs de la base de données
  searchAllCVsBySkill(skill: string): Observable<SearchCVResponse> {
    const url = `${this.apiUrl}/api/cv/search-all/`;
    return this.http.get<SearchCVResponse>(url, {
      headers: this.getHeaders(),
      params: { skill }
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Nouvelle méthode pour la recherche spéciale (sans restrictions d'équipe)
  searchAndAccessCVs(skill: string, seniority?: string): Observable<SearchCVResponse> {
    const url = `${this.apiUrl}/api/cv/search-and-access/`;
    let params: any = { skill, action: 'search' };
    if (seniority) {
      params.seniority = seniority;
    }
    return this.http.get<SearchCVResponse>(url, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(this.handleError)
    );
  }

  searchProfiles(skill: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cv/search-and-access/?skill=${skill}&action=search`);
  }

  filterCVsBySeniority(seniority: string): Observable<SearchCVResponse> {
    const url = `${this.apiUrl}/api/cv/cvfilter/filter/`;
    return this.http.get<SearchCVResponse>(url, {
      headers: this.getHeaders(),
      params: { seniority }
    }).pipe(
      catchError(this.handleError)
    );
  }

  createCV(cv: CV): Observable<Blob> {
    const url = `${this.apiUrl}/api/cv/generate/`;
    const cleanCV = { ...cv };
    delete cleanCV.utilisateur;
    console.log('Données envoyées pour createCV:', JSON.stringify(cleanCV, null, 2));
    return this.http.post(url, cleanCV, {
      headers: this.getHeaders(),
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        const id = parseInt(response.headers.get('X-CV-ID') || '0', 10);
        this.lastCreatedCvId = id;
        return response.body as Blob;
      }),
      catchError(this.handleError)
    );
  }

  getUserCV(language?: string): Observable<CV[]> {
    const url = `${this.apiUrl}/api/cv/cv/user/`;
    console.log('URL appelée pour getUserCV:', url);
    return this.http.get<CV[]>(url, { headers: this.getHeaders() }).pipe(
      map(cvs => {
        if (language) {
          return cvs.filter(cv => language === 'fr' ? !!cv.file_path : !!cv.file_path_en);
        }
        return cvs;
      }),
      catchError(error => {
        if (error.status === 404) {
          console.log('Aucun CV trouvé pour cet utilisateur, retour d\'une liste vide.');
          return of([]);
        }
        return this.handleError(error);
      })
    );
  }

  getCV(id: number): Observable<CV> {
    const url = `${this.apiUrl}/api/cv/cv/${id}/`;
    console.log('URL appelée pour getCV:', url);
    return this.http.get<CV>(url, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  updateCV(id: number, cv: CV, language: string = 'fr'): Observable<Blob> {
    const url = `${this.apiUrl}/api/cv/cv/${id}/`;
    const cleanCV = { ...cv };
    delete cleanCV.utilisateur;
    console.log('Données envoyées pour updateCV:', JSON.stringify(cleanCV, null, 2));
    return this.http.put(url, cleanCV, {
      headers: this.getHeaders(),
      responseType: 'blob',
      observe: 'response',
      params: { language }
    }).pipe(
      map(response => response.body as Blob),
      catchError(this.handleError)
    );
  }

  downloadCV(id: number, language: string = 'fr'): Observable<Blob> {
    const url = `${this.apiUrl}/api/cv/generate/${id}/download/?language=${language}`;
    console.log('URL appelée pour downloadCV:', url);
    return this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Nouvelle méthode pour télécharger le ZIP avec paramètre language
  downloadCVAsZip(cvId: number, language?: string): Observable<Blob> {
    const url = `${this.apiUrl}/api/cv/generate/${cvId}/download/?language=${language || 'fr'}`;
    console.log('URL appelée pour downloadCVAsZip:', url, 'Langue:', language);
    return this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Méthode mise à jour pour télécharger sans restriction (maintenant utilisé pour le ZIP)
  downloadCVWithoutRestriction(cvId: number): Observable<Blob> {
    return this.downloadCVAsZip(cvId);
  }

  previewCV(id: number, language: string = 'fr'): Observable<Blob> {
    const url = `${this.apiUrl}/api/cv/${id}/preview/`;
    console.log('URL appelée pour previewCV:', url);
    return this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob',
      params: { language }
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Nouvelle méthode pour prévisualiser sans restriction
  previewCVWithoutRestriction(cvId: number, language: string = 'fr'): Observable<Blob> {
    const url = `${this.apiUrl}/api/cv/${cvId}/preview/`;
    console.log('URL appelée pour previewCVWithoutRestriction:', url);
    return this.http.get(url, {
      headers: this.getHeaders(),
      params: { language },
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteCV(id: number, language: string = 'fr'): Observable<void> {
    const url = `${this.apiUrl}/api/cv/cv/${id}/delete/`;
    console.log('URL appelée pour deleteCV:', url);
    return this.http.delete<void>(url, {
      headers: this.getHeaders(),
      params: { language }
    }).pipe(
      catchError(this.handleError)
    );
  }

  getLastCreatedCvId(): number | undefined {
    return this.lastCreatedCvId;
  }
}