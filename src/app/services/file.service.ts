import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadedFile {
  id: number;
  user: number;
  file: string;
  uploaded_at: string;
  file_name: string;
  is_job_description?: boolean;
  matching_results?: {
    job_title: string;
    job_id: number;
    keywords: string[]; // Ajout des mots-clés
    matches: Array<{
      cv_id: number;
      username: string;
      match_percentage: number;
      raw_scores: {
        title_similarity: number;
        experience_similarity: { general: number; specific?: number };
        skills_similarity: number;
        description_similarity?: number;
      };
    }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private apiUrl = 'http://127.0.0.1:8000/api/manager-space/';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  uploadFile(file: File, isJobDescription: boolean = false): Observable<any> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('is_job_description', isJobDescription.toString());
  console.log('Envoi de la requête upload avec formData:', formData);
  return this.http.post(`${this.apiUrl}upload/`, formData, { headers: this.getHeaders() });
}
  getSubordinatesFiles(): Observable<{ files: UploadedFile[] }> {
    return this.http.get<{ files: UploadedFile[] }>(`${this.apiUrl}subordinates-files/`, { headers: this.getHeaders() });
  }

  viewFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}view-file/${fileId}/`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }
}