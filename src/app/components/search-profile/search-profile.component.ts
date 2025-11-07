import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CvService } from 'src/app/services/cv.service';
@Component({
  selector: 'app-search-profile',
  templateUrl: './search-profile.component.html',
  styleUrls: ['./search-profile.component.scss']
})
export class SearchProfileComponent implements OnInit {
  searchSkill: string = '';
  searchResults: any[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private cvService: CvService, private router: Router) {}

  ngOnInit(): void {}

  searchProfiles(): void {
    if (!this.searchSkill || this.searchSkill.length < 1) {
      this.searchResults = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cvService.searchProfiles(this.searchSkill).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la recherche de profils :', err);
        this.errorMessage = 'Erreur lors de la recherche de profils.';
        this.isLoading = false;
        this.searchResults = [];
      }
    });
  }

  previewCv(profile: any): void {
    this.router.navigate(['/cv-form', profile.id], { queryParams: { mode: 'preview' } });
  }

  downloadCv(profile: any): void {
    // Logique pour télécharger le CV
    this.cvService.downloadCV(profile.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${profile.username}_cv.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement du CV :', err);
        this.errorMessage = 'Erreur lors du téléchargement du CV.';
      }
    });
  }
}