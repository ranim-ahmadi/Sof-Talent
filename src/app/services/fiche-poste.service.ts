// fiche-poste.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface FichePoste {
  title: string;
  job_objectives: string; // Contient les missions
  main_tasks: string;
  profile: {
    education: string;
    total_experience_years: number;
    specific_experience_years?: number;
    experience_role?: string;
  };
  technical_skills: string[];
  personal_qualities: string[];
  keywords: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FichePosteService {
  private apiUrl = 'http://localhost:8000/api/fiche-poste/create/';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('Jeton utilisé :', token);
    return new HttpHeaders({
      'Authorization': token ? `Token ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    if (error.status === 400) {
      errorMessage = 'Erreur dans les données envoyées. Vérifiez le formulaire.';
      if (error.error) {
        errorMessage = Object.values(error.error).join(' ');
      }
    } else if (error.status === 401) {
      errorMessage = 'Utilisateur non authentifié. Veuillez vous connecter.';
    } else if (error.status === 403) {
      errorMessage = 'Accès interdit. Vous devez être manager pour créer une fiche.';
    } else if (error.status === 404) {
      errorMessage = 'Ressource non trouvée.';
    } else {
      errorMessage = `Erreur ${error.status}: ${error.message}`;
    }
    console.error('Erreur HTTP:', error);
    return throwError(() => new Error(errorMessage));
  }

  createFichePoste(fiche: FichePoste): Observable<HttpResponse<Blob>> {
    const specificExperiencePart = fiche.profile.specific_experience_years && fiche.profile.experience_role
      ? `, dont ${fiche.profile.specific_experience_years} ans en tant que ${fiche.profile.experience_role}`
      : '';
    const profileString = `Formation: ${fiche.profile.education}\nExpérience: ${fiche.profile.total_experience_years} ans${specificExperiencePart}`;

    const formattedData = {
      title: fiche.title,
      missions: fiche.job_objectives, // Mappage de job_objectives à missions
      main_tasks: fiche.main_tasks.split('\n').filter(task => task.trim()),
      profile: profileString,
      technical_skills: fiche.technical_skills,
      personal_qualities: fiche.personal_qualities,
      keywords: fiche.keywords,
      source: 'form'
    };

    console.log('Données envoyées pour createFichePoste:', JSON.stringify(formattedData, null, 2));
    return this.http.post(this.apiUrl, formattedData, {
      headers: this.getHeaders(),
      responseType: 'blob' as 'json',
      observe: 'response'
    }).pipe(
      map(response => response as HttpResponse<Blob>),
      catchError(this.handleError)
    );
  }

  getMatches(matchUrl: string): Observable<{ job_title: string; job_id: number; matches: any[]; keywords: string[] }> {
    console.log('Appel de getMatches avec URL:', matchUrl);
    return this.http.get<{ job_title: string; job_id: number; matches: any[]; keywords: string[] }>(matchUrl, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('Réponse brute de getMatches:', response);
        return response;
      }),
      catchError(this.handleError)
    );
  }
}