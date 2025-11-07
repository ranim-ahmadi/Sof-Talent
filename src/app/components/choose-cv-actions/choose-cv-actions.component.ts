import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CvService, CV, SearchCVResponse } from '../../services/cv.service';
import { AuthService } from 'src/app/services/auth.service';
import { WebsocketService } from 'src/app/services/websocket.service';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-choose-cv-actions',
  templateUrl: './choose-cv-actions.component.html',
  styleUrls: ['./choose-cv-actions.component.scss']
})
export class ChooseCvActionsComponent implements OnInit, OnDestroy {
  notifications: { id: number; message: string; is_read: boolean; created_at?: string }[] = [];
  welcomeMessage: string = '';
  username: string = '';
  managerName: string = '';
  userRole: string = '';
  isLoading = false;
  errorMessage: string | null = null;
  cv: CV | null = null;
  cvsFR: CV[] = [];
  cvsEN: CV[] = [];
  filteredCvs: CV[] = [];
  showCvList: boolean = false;
  showCvListEN: boolean = false;
  showSearchResults: boolean = false;
  searchTerm: string = '';
  showNotificationMenu: boolean = false; // Nouvel état pour le menu

  currentPageFR: number = 1;
  itemsPerPageFR: number = 5;
  totalPagesFR: number = 1;

  currentPageEN: number = 1;
  itemsPerPageEN: number = 5;
  totalPagesEN: number = 1;

  private apiUrl = 'http://127.0.0.1:8000/';

  constructor(
    private cvService: CvService,
    private authService: AuthService,
    private websocketService: WebsocketService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadUserCVs();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.websocketService.disconnect();
  }

  connectWebSocket(): void {
    if (this.authService.isLoggedIn()) {
      this.authService.getUserData().pipe(take(1)).subscribe({
        next: (userInfo) => {
          if (userInfo && userInfo.id) {
            const userId = userInfo.id;
            this.websocketService.connect(userId);
            this.websocketService.onNotification().subscribe((data: any) => {
              this.notifications.unshift({ id: data.id, message: data.message, is_read: false, created_at: data.created_at });
              if (this.notifications.length > 5) this.notifications.pop();
              console.log('Nouvelle notification en temps réel:', data.message);
            });
          } else {
            console.warn('Aucun userId pour se connecter au WebSocket après chargement');
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des données utilisateur pour WebSocket:', err);
        }
      });
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    if (this.authService.isLoggedIn()) {
      this.authService.getUserData().pipe(take(1)).subscribe({
        next: (userInfo) => {
          if (userInfo && userInfo.id) {
            const userId = userInfo.id;
            this.http.get<any[]>(`${this.apiUrl}notifications/${userId}/`).subscribe({
              next: (data) => {
                this.notifications = data.map(n => ({ id: n.id, message: n.message, is_read: n.is_read, created_at: n.created_at })).slice(0, 5);
                console.log('Notifications chargées au démarrage:', this.notifications);
              },
              error: (err) => {
                console.error('Erreur lors du chargement des notifications:', err);
              }
            });
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des données utilisateur pour notifications:', err);
        }
      });
    }
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
        this.userRole = userInfo.role ?? '';
        console.log('Username:', this.username, 'ManagerName:', this.managerName, 'Role:', this.userRole);
        this.welcomeMessage = `Bonjour ${this.username}`;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des informations utilisateur :', err);
        this.username = localStorage.getItem('username') ?? 'Utilisateur';
        this.managerName = 'Aucun';
        this.userRole = '';
        this.welcomeMessage = `Bonjour ${this.username}`;
      }
    });
  }

  loadUserCVs(): void {
    this.isLoading = true;
    this.cvService.getUserCV('fr').subscribe({
      next: (cvs: CV[]) => {
        console.log('CVs FR récupérés:', JSON.stringify(cvs, null, 2));
        this.cvsFR = cvs;
        this.cv = cvs.length > 0 ? cvs[0] : null;
        this.totalPagesFR = Math.ceil(this.cvsFR.length / this.itemsPerPageFR);
        this.currentPageFR = 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des CVs FR:', err);
        this.errorMessage = 'Erreur lors de la récupération des CVs FR.';
        this.cvsFR = [];
        this.cv = null;
        this.isLoading = false;
      }
    });

    this.cvService.getUserCV('en').subscribe({
      next: (cvs: CV[]) => {
        console.log('CVs EN récupérés:', JSON.stringify(cvs, null, 2));
        this.cvsEN = cvs;
        this.totalPagesEN = Math.ceil(this.cvsEN.length / this.itemsPerPageEN);
        this.currentPageEN = 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des CVs EN:', err);
        this.errorMessage = 'Erreur lors de la récupération des CVs EN.';
        this.cvsEN = [];
        this.isLoading = false;
      }
    });
  }

  toggleCvList(): void {
    this.showCvList = !this.showCvList;
    this.showCvListEN = false;
    this.showSearchResults = false;
  }

  toggleCvListEN(): void {
    this.showCvListEN = !this.showCvListEN;
    this.showCvList = false;
    this.showSearchResults = false;
  }

  toggleSearchResults(): void {
    this.showSearchResults = !this.showSearchResults;
    this.showCvList = false;
    this.showCvListEN = false;
    this.filteredCvs = [];
    this.searchTerm = '';
    this.errorMessage = null;
  }

  filterCVs(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCvs = [];
      this.errorMessage = 'Veuillez entrer une compétence à filtrer.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const normalizedSearchTerm = this.searchTerm.trim().toLowerCase();

    this.cvService.searchAndAccessCVs(normalizedSearchTerm).subscribe({
      next: (response: SearchCVResponse) => {
        console.log('Réponse du backend (recherche globale sans restriction) :', response);
        response.cvs.forEach(cv => {
          console.log(`Compétences du CV ${cv.id}:`, cv.skills);
        });
        this.filteredCvs = response.cvs || [];
        this.isLoading = false;
        if (this.filteredCvs.length === 0) {
          this.errorMessage = `Aucun CV trouvé avec la compétence "${this.searchTerm}".`;
        }
      },
      error: (error) => {
        console.error('Erreur lors du filtrage des CVs :', error);
        this.filteredCvs = [];
        this.isLoading = false;
        this.errorMessage = error.message || 'Erreur lors du filtrage. Vérifiez que le serveur est en cours d’exécution.';
      }
    });
  }

  createCv(): void {
    console.log('Bouton "Créer mon CV" ou "Mon nouveau CV" cliqué, redirection vers /cv-form');
    this.router.navigate(['/cv-form']).then(success => {
      console.log('Navigation réussie ?', success);
      if (!success) {
        console.error('Échec de la navigation vers /cv-form');
      }
    });
  }

  updateCv(cv?: CV, language: string = 'fr'): void {
    const targetCv = cv || this.cv;
    console.log(`Bouton "Modifier mon CV" cliqué (langue: ${language})`, targetCv);
    if (targetCv && targetCv.id) {
      const cvId = targetCv.id;
      console.log('Tentative de navigation vers /cv-form/' + cvId);
      this.router.navigate(['/cv-form', cvId, { queryParams: { language } }]).then(success => {
        console.log('Navigation réussie ?', success);
        if (!success) {
          console.error('Échec de la navigation vers /cv-form/' + cvId);
        }
      });
    } else {
      this.errorMessage = 'Aucun CV valide pour la modification.';
      console.error('Aucun CV valide pour la modification');
    }
  }

  previewCv(cv?: CV, language: string = 'fr'): void {
    const targetCv = cv || this.cv;
    console.log(`Bouton "Consulter CV" cliqué (langue: ${language}), cv:`, targetCv);
    if (!targetCv || !targetCv.id) {
      this.errorMessage = 'Aucun CV valide pour la prévisualisation.';
      console.error('Aucun CV valide pour la prévisualisation');
      return;
    }

    const cvId = targetCv.id;
    this.cvService.previewCVWithoutRestriction(cvId, language).subscribe({
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

  downloadCv(cv?: CV, language?: string): void {
    const targetCv = cv || this.cv;
    console.log(`Bouton "Télécharger CV" cliqué (langue: ${language}), cv:`, targetCv);
    if (!targetCv || !targetCv.id) {
      this.errorMessage = 'Aucun CV valide pour le téléchargement.';
      console.error('Aucun CV valide pour le téléchargement');
      return;
    }

    const cvId = targetCv.id;
    const username = targetCv.username ?? 'document';
    this.cvService.downloadCVAsZip(cvId, language).subscribe({
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

  deleteCv(cv: CV, language: string = 'fr'): void {
    console.log(`Bouton "Supprimer CV" cliqué (langue: ${language}), cv:`, cv);
    if (!cv || !cv.id) {
      this.errorMessage = 'Aucun CV valide pour la suppression.';
      console.error('Aucun CV valide pour la suppression');
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer ce CV ?')) {
      const cvId = cv.id;
      this.cvService.deleteCV(cvId, language).subscribe({
        next: () => {
          console.log('Suppression réussie');
          if (language === 'fr') {
            this.cvsFR = this.cvsFR.filter(c => c.id !== cvId);
            this.cv = this.cvsFR.length > 0 ? this.cvsFR[0] : null;
            this.totalPagesFR = Math.ceil(this.cvsFR.length / this.itemsPerPageFR);
          } else {
            this.cvsEN = this.cvsEN.filter(c => c.id !== cvId);
            this.totalPagesEN = Math.ceil(this.cvsEN.length / this.itemsPerPageEN);
          }
          if (this.currentPageFR > this.totalPagesFR) this.currentPageFR = this.totalPagesFR;
          if (this.currentPageEN > this.totalPagesEN) this.currentPageEN = this.totalPagesEN;
        },
        error: (err: any) => {
          console.error('Erreur lors de la suppression :', err);
          this.errorMessage = 'Erreur lors de la suppression du CV.';
        }
      });
    }
  }

  getPaginatedCvsFR(): CV[] {
    const startIndex = (this.currentPageFR - 1) * this.itemsPerPageFR;
    const endIndex = startIndex + this.itemsPerPageFR;
    return this.cvsFR.slice(startIndex, endIndex);
  }

  setPageFR(page: number): void {
    if (page >= 1 && page <= this.totalPagesFR) {
      this.currentPageFR = page;
    }
  }

  getPageNumbersFR(): number[] {
    return Array.from({ length: this.totalPagesFR }, (_, i) => i + 1);
  }

  getPaginatedCvsEN(): CV[] {
    const startIndex = (this.currentPageEN - 1) * this.itemsPerPageEN;
    const endIndex = startIndex + this.itemsPerPageEN;
    return this.cvsEN.slice(startIndex, endIndex);
  }

  setPageEN(page: number): void {
    if (page >= 1 && page <= this.totalPagesEN) {
      this.currentPageEN = page;
    }
  }

  getPageNumbersEN(): number[] {
    return Array.from({ length: this.totalPagesEN }, (_, i) => i + 1);
  }

  toggleNotificationMenu(): void {
    this.showNotificationMenu = !this.showNotificationMenu;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.is_read).length;
  }
}