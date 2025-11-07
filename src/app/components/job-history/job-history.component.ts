import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { JobHistoryService } from 'src/app/services/job-history.service';
import { FileService } from 'src/app/services/file.service';
import { CvService, CV } from 'src/app/services/cv.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-job-history',
  templateUrl: './job-history.component.html',
  styleUrls: ['./job-history.component.scss'],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('0.3s ease-out', style({ opacity: 0, transform: 'scale(0.9)' })),
      ]),
    ]),
  ],
})
export class JobHistoryComponent implements OnInit {
  jobHistory: { fileId: number, jobTitle: string, uploadedAt: string, matches: any[] }[] = [];
  selectedResult: any = null;
  showDetail: boolean = false;
  matchingResults: any[] = [];
  username: string = '';
  managerName: string = '';
  userRole: string = '';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5; // Nombre d'éléments par page
  totalPages: number = 1;
  visiblePages: number[] = []; // Plage de pages visibles

  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Titre', 'Expérience', 'Compétences', 'Total'],
    datasets: [{
      label: 'Score (%)',
      data: [],
      backgroundColor: 'rgba(138, 127, 119, 0.7)',
      borderColor: '#8A7F77',
      borderWidth: 1
    }]
  };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Pourcentage (%)' } }
    },
    plugins: { legend: { display: false }, title: { display: true, text: 'Comparaison des scores' } }
  };

  constructor(
    private jobHistoryService: JobHistoryService,
    private fileService: FileService,
    private cvService: CvService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    // S'abonner à l'observable pour mettre à jour l'historique en temps réel
    this.jobHistoryService.getJobHistory().subscribe(history => {
      this.jobHistory = history;
      console.log('Mise à jour de l\'historique dans JobHistoryComponent :', this.jobHistory);
      this.updatePagination();
      this.cdr.detectChanges(); // Forcer la mise à jour de la vue
    });
  }

  loadUserInfo(): void {
    this.cvService.getUserInfo().subscribe({
      next: (userInfo) => {
        this.username = userInfo.username ?? 'Utilisateur';
        this.managerName = userInfo.manager__username ?? 'Aucun';
        this.userRole = userInfo.role ?? '';
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des informations utilisateur :', err);
        this.username = localStorage.getItem('username') ?? 'Utilisateur';
        this.managerName = 'Aucun';
        this.userRole = '';
      }
    });
  }

  // Méthode pour rafraîchir l'historique manuellement
  refreshHistory(): void {
    this.jobHistoryService.refreshHistory();
  }

  viewJobFile(fileId: number): void {
    this.fileService.viewFile(fileId).subscribe({
      next: (blob: Blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: (err) => {
        console.error('Erreur lors de la visualisation de la fiche :', err);
      }
    });
  }

  viewJobMatches(fileId: number): void {
    const job = this.jobHistory.find(j => j.fileId === fileId);
    if (job) {
      console.log('Données de job.matches pour fileId', fileId, ':', job.matches);
      this.showDetail = true;
      this.matchingResults = job.matches || [];
      this.selectedResult = null;
      this.cdr.detectChanges();
    } else {
      console.error('Aucune fiche trouvée pour fileId:', fileId);
    }
  }

  showDetailReport(cvId: number): void {
    const matchingResult = this.matchingResults.find(result => result.cv_id === cvId);
    if (!matchingResult) {
      console.error('Aucun résultat de matching trouvé pour cvId:', cvId);
      return;
    }
    this.cvService.getCV(cvId).subscribe({
      next: (cv: CV) => {
        this.selectedResult = {
          cv_id: matchingResult.cv_id,
          username: matchingResult.username,
          manager: matchingResult.manager,
          match_percentage: matchingResult.match_percentage,
          raw_scores: matchingResult.raw_scores,
          matched_skills: matchingResult.raw_scores?.matched_skills || [],
          title: cv.title,
          annees_experience: cv.annees_experience,
          skills: cv.skills
        };
        this.updateChart();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des détails du CV :', err);
        this.selectedResult = {
          cv_id: matchingResult.cv_id,
          username: matchingResult.username,
          manager: matchingResult.manager,
          match_percentage: matchingResult.match_percentage,
          raw_scores: matchingResult.raw_scores,
          matched_skills: matchingResult.raw_scores?.matched_skills || [],
          title: 'Non spécifié',
          annees_experience: 0,
          skills: []
        };
        this.updateChart();
        this.cdr.detectChanges();
      }
    });
  }

  closeDetailReport(): void {
    this.showDetail = false;
    this.selectedResult = null;
    this.cdr.detectChanges();
  }

  updateChart(): void {
    if (this.selectedResult) {
      this.chartData.datasets[0].data = [
        this.selectedResult.raw_scores?.title_similarity || 0,
        this.selectedResult.raw_scores?.experience_similarity || 0,
        this.selectedResult.raw_scores?.skills_similarity || 0,
        this.selectedResult.match_percentage || 0
      ];
    }
  }

  // Méthodes de pagination
  get paginatedJobs(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.jobHistory.slice(startIndex, endIndex);
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.jobHistory.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    this.updateVisiblePages();
  }

  updateVisiblePages(): void {
    const pagesToShow = 4; // Nombre de pages visibles à la fois
    const half = Math.floor(pagesToShow / 2);
    let startPage = Math.max(1, this.currentPage - half);
    let endPage = Math.min(this.totalPages, startPage + pagesToShow - 1);

    // Ajuster si on est près du début ou de la fin
    if (endPage - startPage + 1 < pagesToShow) {
      if (startPage === 1) {
        endPage = Math.min(pagesToShow, this.totalPages);
      } else if (endPage === this.totalPages) {
        startPage = Math.max(1, this.totalPages - pagesToShow + 1);
      }
    }

    this.visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateVisiblePages();
    }
  }
}