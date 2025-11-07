import { Component, OnInit } from '@angular/core';
import { CvService, SearchCVResponse, CV } from '../services/cv.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-cv-filter',
  templateUrl: './cv-filter.component.html',
  styleUrls: ['./cv-filter.component.scss']
})
export class CvFilterComponent implements OnInit {
  searchTerm: string = '';
  cvs: CV[] = [];
  count: number = 0;
  errorMessage: string | null = null;

  constructor(private cvService: CvService) {}

  ngOnInit(): void {}

  searchCVs(): void {
    if (!this.searchTerm.trim()) {
      this.cvs = [];
      this.count = 0;
      this.errorMessage = 'Veuillez entrer une compétence à rechercher.';
      return;
    }

    this.cvService.filterCVsBySkill(this.searchTerm).subscribe(
      (response: SearchCVResponse) => {
        this.cvs = response.cvs;
        this.count = response.count;
        this.errorMessage = null;
        if (this.count === 0) {
          this.errorMessage = `Aucun CV trouvé avec la compétence "${this.searchTerm}".`;
        }
      },
      (error) => {
        console.error('Erreur lors de la recherche des CVs :', error);
        this.cvs = [];
        this.count = 0;
        this.errorMessage = error.message || 'Erreur lors de la recherche. Vérifiez que le serveur est en cours d’exécution.';
      }
    );
  }

  viewCV(cv: CV): void {
    if (!cv.id) {
      this.errorMessage = 'ID du CV non disponible.';
      return;
    }

    this.cvService.downloadCV(cv.id).subscribe(
      (blob: Blob) => {
        const fileName = `${cv.username}_CV_${cv.id}.pdf`;
        saveAs(blob, fileName);
      },
      (error) => {
        console.error('Erreur lors de la génération du CV :', error);
        this.errorMessage = error.message || 'Erreur lors de la génération du CV.';
      }
    );
  }
}