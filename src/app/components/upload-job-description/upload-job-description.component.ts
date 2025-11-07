import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CvService, CV } from 'src/app/services/cv.service';
import { FileService } from 'src/app/services/file.service';
import { JobHistoryService } from 'src/app/services/job-history.service'; // Ajout de l'import
import { ChartConfiguration } from 'chart.js';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-upload-job-description',
  templateUrl: './upload-job-description.component.html',
  styleUrls: ['./upload-job-description.component.scss'],
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
export class UploadJobDescriptionComponent implements OnInit {
  selectedFile: File | null = null;
  message: string | null = null;
  errorMessage: string | null = null;
  username: string = '';
  managerName: string = '';
  userRole: string = '';
  uploadedFileId: number | null = null;
  isJobDescription: boolean = false;
  isUploading: boolean = false;
  showDetail: boolean = false;
  selectedResult: any = null;

  // Données pour le récapitulatif
  jobTitle: string = '';
  yearsExperience: number = 0;
  keywords: string[] = [];
  uploadedAt: string = '';

  // Données pour le tableau de matching
  matchingResults: any[] = [];

  // Configuration du graphique
  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Titre', 'Expérience', 'Compétences', 'Total'],
    datasets: [{
      label: 'Score (%)',
      data: [],
      backgroundColor: 'rgba(138, 127, 119, 0.7)', // Taupe foncé avec transparence
      borderColor: '#8A7F77',
      borderWidth: 1
    }]
  };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Pourcentage (%)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Comparaison des scores'
      }
    }
  };

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fileService: FileService,
    private cvService: CvService,
    private jobHistoryService: JobHistoryService, // Injection du service
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
  }

  loadUserInfo(): void {
    this.cvService.getUserInfo().subscribe({
      next: (userInfo) => {
        console.log('Réponse de /user-info/ :', userInfo);
        this.username = userInfo.username ?? 'Utilisateur';
        this.managerName = userInfo.manager__username ?? 'Aucun';
        this.userRole = userInfo.role ?? '';
        console.log('Username:', this.username, 'ManagerName:', this.managerName, 'Role:', this.userRole);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des informations utilisateur :', err);
        this.username = localStorage.getItem('username') ?? 'Utilisateur';
        this.managerName = 'Aucun';
        this.userRole = '';
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.message = null;
      this.errorMessage = null;
      this.uploadedFileId = null;
      // Réinitialiser les données du tableau et du récapitulatif
      this.jobTitle = '';
      this.yearsExperience = 0;
      this.keywords = [];
      this.uploadedAt = '';
      this.matchingResults = [];
      this.showDetail = false; // Réinitialiser l'affichage du rapport
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Veuillez sélectionner une fiche de poste au format PDF.';
      return;
    }

    if (!this.selectedFile.name.endsWith('.pdf')) {
      this.errorMessage = 'Seuls les fichiers PDF sont autorisés.';
      return;
    }

    if (!this.isJobDescription) {
      this.errorMessage = 'Veuillez cocher "Fiche de poste générée par Sof\'Talent" pour procéder.';
      return;
    }

    console.log('Début de l\'upload, isJobDescription:', this.isJobDescription, 'Fichier:', this.selectedFile.name);
    this.isUploading = true;
    this.cdr.detectChanges();

    this.fileService.uploadFile(this.selectedFile, this.isJobDescription).subscribe({
      next: (response) => {
        console.log('Upload réussi, réponse complète :', JSON.stringify(response, null, 2));
        this.message = 'Fiche de poste uploadée avec succès !';
        this.errorMessage = null;
        this.uploadedFileId = response.file_id || null;
        console.log('uploadedFileId défini à :', this.uploadedFileId);

        // Récupérer les données pour le récapitulatif
        this.jobTitle = response.job_title || 'Titre non disponible';
        this.yearsExperience = response.years_experience || 0;
        this.keywords = response.required_skills || [];
        this.uploadedAt = response.uploaded_at || '';

        // Récupérer les données pour le tableau de matching
        this.matchingResults = response.matches || [];

        // Rafraîchir l'historique après un téléversement réussi
        this.jobHistoryService.refreshHistory();

        this.selectedFile = null;
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
        this.isUploading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur lors de l\'upload :', err);
        this.errorMessage = err.error?.error || 'Erreur lors de l\'upload de la fiche de poste.';
        this.message = null;
        this.isUploading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewUploadedFile(): void {
    if (!this.uploadedFileId) {
      this.errorMessage = 'Aucun fichier uploadé à visualiser.';
      console.error('Erreur : uploadedFileId est undefined ou null');
      return;
    }

    console.log('Appel de viewUploadedFile avec fileId:', this.uploadedFileId);

    this.fileService.viewFile(this.uploadedFileId).subscribe({
      next: (blob: Blob) => {
        console.log('Blob reçu avec succès, ouverture du PDF...');
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: (err) => {
        console.error('Erreur lors de la visualisation du fichier :', err);
        this.errorMessage = 'Erreur lors de la visualisation du fichier.';
      }
    });
  }

  viewCv(cvId: number): void {
    this.cvService.previewCVWithoutRestriction(cvId).subscribe({
      next: (blob: Blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: (err) => {
        console.error('Erreur lors de la visualisation du CV :', err);
        this.errorMessage = 'Erreur lors de la visualisation du CV.';
        this.cdr.detectChanges();
      }
    });
  }

  downloadCv(cvId: number): void {
    this.cvService.downloadCVAsZip(cvId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CV_${cvId}.zip`; // Téléchargement au format ZIP
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement du CV :', err);
        this.errorMessage = 'Erreur lors du téléchargement du CV.';
        this.cdr.detectChanges();
      }
    });
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  showDetailReport(cvId: number): void {
    console.log('Appel de showDetailReport avec cvId:', cvId);
    const matchingResult = this.matchingResults.find(result => result.cv_id === cvId);
    if (!matchingResult) {
      console.error('Aucun résultat de matching trouvé pour cvId:', cvId);
      return;
    }
    this.cvService.getCV(cvId).subscribe({
      next: (cv: CV) => {
        console.log('CV récupéré :', cv);
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
        console.log('selectedResult après combinaison :', this.selectedResult);
        this.showDetail = true;
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
        this.showDetail = true;
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
      console.log('Mise à jour du graphique avec selectedResult :', this.selectedResult);
      this.chartData.datasets[0].data = [
        this.selectedResult.raw_scores?.title_similarity || 0,
        this.selectedResult.raw_scores?.experience_similarity || 0, // Changement ici
        this.selectedResult.raw_scores?.skills_similarity || 0,
        this.selectedResult.match_percentage || 0
      ];
      console.log('Données du graphique :', this.chartData.datasets[0].data);
    }
  }
}