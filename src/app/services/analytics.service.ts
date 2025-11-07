import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Définir les interfaces directement dans ce fichier
export interface Analytics {
  total_profiles: number;
  average_years_experience: number;
  seniority_distribution: {
    junior: SeniorityLevel;
    intermediate: SeniorityLevel;
    senior: SeniorityLevel;
  };
  overall_skills: SkillsData;
}

export interface SeniorityLevel {
  count: number;
  skills: SkillsData;
}

export interface SkillsData {
  unique_skills: string[];
  skills_count: number;
  skills_frequency: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = 'http://127.0.0.1:8000/api/kpi/analytics/';

  constructor(private http: HttpClient) {}

  getAnalytics(): Observable<Analytics> { // Utiliser l'interface Analytics
    return this.http.get<Analytics>(this.apiUrl);
  }
}