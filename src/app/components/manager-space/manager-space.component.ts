import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { CvService, CV } from 'src/app/services/cv.service';

@Component({
  selector: 'app-manager-space',
  templateUrl: './manager-space.component.html',
  styleUrls: ['./manager-space.component.scss']
})
export class ManagerSpaceComponent implements OnInit {
  teamCVs: CV[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  username: string = '';
  managerName: string = '';
  searchTerm: string = '';
  userRole: string = ''; // Ajout pour stocker le rôle de l'utilisateur

  // Variables de pagination
  currentPage: number = 1;
  itemsPerPage: number = 5; // Nombre d'éléments par page
  totalPages: number = 1;

  constructor(
    private cvService: CvService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadTeamCVs();
  }

  logout(): void {
    this.authService.logout();
  }

  loadUserInfo(): void {
    this.cvService.getUserInfo().subscribe({
      next: (userInfo) => {
        console.log('Réponse de /user-info/ :', userInfo);
        this.username = userInfo.username ?? 'Utilisateur';
        this.managerName = userInfo.manager__username ?? 'Aucun';
        this.userRole = userInfo.role ?? 'employee';
        console.log('Username:', this.username, 'ManagerName:', this.managerName, 'Role:', this.userRole);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des informations utilisateur :', err);
        this.username = localStorage.getItem('username') ?? 'Utilisateur';
        this.managerName = 'Aucun';
        this.userRole = 'employee';
      }
    });
  }

  loadTeamCVs(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.teamCVs = [];

    this.cvService.getTeamCVs().subscribe({
      next: (cvs: CV[]) => {
        console.log('CVs de l\'équipe récupérés :', cvs);
        // Trier les CVs par username
        this.teamCVs = [...cvs].sort((a, b) => {
          if (a.username && b.username) {
            return a.username.localeCompare(b.username);
          }
          return 0;
        });
        this.totalPages = Math.ceil(this.teamCVs.length / this.itemsPerPage);
        this.isLoading = false;
        if (cvs.length === 0) {
          console.log('Aucun CV trouvé pour les membres de l\'équipe.');
        }
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des CVs de l\'équipe :', err);
        this.errorMessage = 'Erreur lors de la récupération des CVs de l\'équipe.';
        this.teamCVs = [];
        this.isLoading = false;
      }
    });
  }

  // Méthode pour obtenir les CVs de la page actuelle
  getPaginatedCVs(): CV[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.teamCVs.slice(startIndex, endIndex);
  }

  // Changer de page
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  filterCVs(): CV[] {
    if (!this.searchTerm) {
      return this.getPaginatedCVs();
    }
    const filteredCVs = this.teamCVs.filter(cv =>
      cv.username?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      cv.poste_actuel?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.totalPages = Math.ceil(filteredCVs.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return filteredCVs.slice(startIndex, endIndex);
  }

  previewCv(cv: CV): void {
    if (!cv || !cv.id) {
      this.errorMessage = 'Aucun CV valide pour la prévisualisation.';
      console.error('Aucun CV valide pour la prévisualisation');
      return;
    }

    const cvId = cv.id;
    this.cvService.previewCV(cvId).subscribe({
      next: (blob: Blob) => {
        console.log('Prévisualisation réussie');
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Erreur lors de la prévisualisation :', err);
        this.errorMessage = 'Erreur lors de la prévisualisation du CV.';
      }
    });
  }

  downloadCv(cv: CV): void {
    if (!cv || !cv.id) {
      this.errorMessage = 'Aucun CV valide pour le téléchargement.';
      console.error('Aucun CV valide pour le téléchargement');
      return;
    }

    const cvId = cv.id;
    const username = cv.username ?? 'document';
    this.cvService.downloadCVAsZip(cvId, 'fr').subscribe({
      next: (blob: Blob) => {
        console.log('Téléchargement réussi');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `${username}_CV_${cvId}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err: any) => {
        console.error('Erreur lors du téléchargement :', err);
        this.errorMessage = 'Erreur lors du téléchargement du CV.';
      }
    });
  }

  updateCv(cv: CV): void {
    if (!cv || !cv.id) {
      this.errorMessage = 'Aucun CV valide pour la modification.';
      console.error('Aucun CV valide pour la modification');
      return;
    }

    const cvId = cv.id;
    console.log('Tentative de navigation vers /cv-form/' + cvId);
    this.router.navigate(['/cv-form', cvId]).then(success => {
      console.log('Navigation réussie ?', success);
      if (!success) {
        console.error('Échec de la navigation vers /cv-form/' + cvId);
        this.errorMessage = 'Échec de la navigation vers le formulaire de modification.';
      }
    });
  }
}