import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class JobHistoryService {
  private jobHistorySubject = new BehaviorSubject<{ fileId: number, jobTitle: string, uploadedAt: string, matches: any[] }[]>([]);
  public jobHistory$: Observable<{ fileId: number, jobTitle: string, uploadedAt: string, matches: any[] }[]> = this.jobHistorySubject.asObservable();

  private apiUrl = 'http://127.0.0.1:8000/api/manager-space/job-history/'; // URL de l'API backend

  constructor(private http: HttpClient) {
    // Charger l'historique au démarrage depuis l'API
    this.loadJobHistory();
  }

  // Charger l'historique depuis l'API
  private loadJobHistory(): void {
  this.http.get<{ fileId: number, jobTitle: string, uploadedAt: string, matches: any[], hasFile: boolean }[]>(this.apiUrl)
    .pipe(
      tap(history => {
        console.log('Historique chargé depuis l\'API :', history);
        this.jobHistorySubject.next(history || []);
      })
    )
    .subscribe({
      error: (err) => {
        console.error('Erreur lors de la récupération de l\'historique :', err);
        this.jobHistorySubject.next([]);
        setTimeout(() => this.loadJobHistory(), 2000);
      }
    });
}

  // Méthode publique pour rafraîchir l'historique
  public refreshHistory(): void {
    console.log('Rafraîchissement de l\'historique demandé...');
    this.loadJobHistory();
  }

  // Obtenir l'historique comme un Observable
  getJobHistory(): Observable<{ fileId: number, jobTitle: string, uploadedAt: string, matches: any[] }[]> {
    return this.jobHistory$;
  }

  // Ajouter une nouvelle fiche (optionnel, si vous voulez synchroniser avec le backend)
  addJob(job: { fileId: number, jobTitle: string, uploadedAt: string, matches: any[] }): void {
    const currentHistory = this.jobHistorySubject.value;
    const updatedHistory = [...currentHistory, job];
    this.jobHistorySubject.next(updatedHistory);
    console.log('Nouvelle fiche ajoutée localement :', job);
    // Vous pouvez ajouter une logique pour envoyer cette mise à jour au backend si nécessaire
  }

  // Vider l'historique (optionnel)
  clearHistory(): void {
    this.jobHistorySubject.next([]);
    console.log('Historique vidé.');
    // Vous pouvez ajouter une logique pour vider les données côté backend si nécessaire
  }
}