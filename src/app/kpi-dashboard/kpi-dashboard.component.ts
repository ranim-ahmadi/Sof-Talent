import { Component, OnInit, AfterViewInit } from '@angular/core';
import { AnalyticsService, Analytics } from '../services/analytics.service';
import { CvService, SearchCVResponse, CV } from '../services/cv.service';
import { Chart, registerables } from 'chart.js';
import { saveAs } from 'file-saver';

// Enregistrer les composants de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-kpi-dashboard',
  templateUrl: './kpi-dashboard.component.html',
  styleUrls: ['./kpi-dashboard.component.scss']
})
export class KpiDashboardComponent implements OnInit, AfterViewInit {
  analytics: Analytics | null = null;
  seniorityLevels: Array<keyof Analytics['seniority_distribution']> = ['junior', 'intermediate', 'senior'];
  errorMessage: string | null = null;
  indiceExpertise: number = 0;
  topSkills: { name: string, frequency: number }[] = [];
  filteredTopSkills: { name: string, frequency: number }[] = [];
  searchTerm: string = '';
  cvs: CV[] = [];
  seniorityCVs: CV[] = [];
  selectedSeniority: string | null = null;
  username: string = '';
  managerName: string = '';
  userRole: string = ''; // Pour déterminer si l'utilisateur est un manager

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;

  private seniorityChart: any = null;
  private skillsChart: any = null;
  private senioritySkillsCharts: { [key: string]: any } = {};

  constructor(
    private analyticsService: AnalyticsService,
    private cvService: CvService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadAnalytics();
  }

  ngAfterViewInit(): void {}

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

  loadAnalytics(): void {
    this.analyticsService.getAnalytics().subscribe(
      (data) => {
        console.log('Données récupérées avec succès :', data);
        this.analytics = data;
        if (this.analytics) {
          this.indiceExpertise = this.analytics.average_years_experience * (1 + this.analytics.total_profiles / 100);

          const skillsFreq = this.analytics.overall_skills?.skills_frequency;
          if (skillsFreq) {
            const sortedSkills = Object.entries(skillsFreq)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8);
            this.topSkills = sortedSkills.map(([name, frequency]) => ({
              name: name.toLowerCase().charAt(0).toUpperCase() + name.toLowerCase().slice(1),
              frequency: frequency as number
            }));
            this.filteredTopSkills = [...this.topSkills];
          } else {
            console.warn('skills_frequency est undefined dans overall_skills');
          }
        }
        setTimeout(() => this.createCharts(), 0);
      },
      (error) => {
        console.error('Erreur lors de la récupération des données :', error);
        if (error.status === 0) {
          this.errorMessage = 'Erreur : Impossible de se connecter au serveur. Vérifiez que le serveur Django est en cours d\'exécution sur http://127.0.0.1:8000.';
        } else if (error.status === 403 || error.status === 0) {
          this.errorMessage = 'Erreur : Problème de CORS. Assurez-vous que le serveur Django est configuré pour autoriser les requêtes depuis http://localhost:4200.';
        } else {
          this.errorMessage = `Erreur ${error.status} : ${error.message || 'Une erreur est survenue lors de la récupération des données.'}`;
        }
      }
    );
  }

  filterCVs(): void {
    if (!this.searchTerm.trim()) {
      this.cvs = [];
      this.errorMessage = 'Veuillez entrer une compétence à filtrer.';
      return;
    }

    const normalizedSearchTerm = this.searchTerm.trim().toLowerCase();
    this.cvService.filterCVsBySkill(normalizedSearchTerm).subscribe(
      (response: SearchCVResponse) => {
        console.log('Réponse du backend :', response);
        response.cvs.forEach(cv => {
          console.log(`Compétences du CV ${cv.id}:`, cv.skills);
        });
        this.cvs = (response.cvs || []).filter(cv => cv.file_path).sort((a, b) => (a.username || '').localeCompare(b.username || ''));
        this.totalPages = Math.ceil(this.cvs.length / this.itemsPerPage);
        this.currentPage = 1;
        this.errorMessage = this.cvs.length === 0 ? `Aucun CV trouvé avec la compétence "${this.searchTerm}" en version française.` : null;
        setTimeout(() => this.createCharts(), 0);
      },
      (error) => {
        console.error('Erreur lors du filtrage des CVs :', error);
        this.cvs = [];
        this.errorMessage = error.message || 'Erreur lors du filtrage. Vérifiez que le serveur est en cours d\'exécution.';
      }
    );
  }

  filterCVsBySeniority(seniorityLabel: string): void {
    const seniorityMap: { [key: string]: string } = {
      'Junior': 'junior',
      'Intermédiaire': 'intermediate',
      'Senior': 'senior'
    };

    const seniorityValue = seniorityMap[seniorityLabel] || seniorityLabel.toLowerCase();
    this.selectedSeniority = seniorityLabel;
    this.seniorityCVs = [];
    this.errorMessage = null;

    console.log(`Filtrage des CVs pour seniority=${seniorityValue}`);

    this.cvService.filterCVsBySeniority(seniorityValue).subscribe(
      (response: SearchCVResponse) => {
        console.log(`CVs pour ${seniorityLabel} (${seniorityValue}) :`, response);
        this.seniorityCVs = (response.cvs || []).filter(cv => cv.file_path).sort((a, b) => (a.username || '').localeCompare(b.username || ''));
        this.totalPages = Math.ceil(this.seniorityCVs.length / this.itemsPerPage);
        this.currentPage = 1;
        this.errorMessage = this.seniorityCVs.length === 0 ? `Aucun CV trouvé pour le niveau de seniorité "${seniorityLabel}" en version française.` : null;
      },
      (error) => {
        console.error(`Erreur lors du filtrage des CVs pour ${seniorityLabel} :`, error);
        this.seniorityCVs = [];
        this.errorMessage = error.message || `Erreur lors du filtrage des CVs pour ${seniorityLabel}.`;
      }
    );
  }

  resetFilters(): void {
    this.cvs = [];
    this.seniorityCVs = [];
    this.searchTerm = '';
    this.selectedSeniority = null;
    this.currentPage = 1;
    this.errorMessage = null;
    this.filteredTopSkills = [...this.topSkills];
    setTimeout(() => this.createCharts(), 0);
  }

  getPaginatedCVs(): CV[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.cvs.slice(startIndex, endIndex); // Pour le filtrage par compétence
  }

  getPaginatedSeniorityCVs(): CV[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.seniorityCVs.slice(startIndex, endIndex); // Pour le filtrage par seniorité
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  viewCV(cv: CV): void {
    if (!cv.id) {
      this.errorMessage = 'ID du CV non disponible.';
      return;
    }

    if (!cv.file_path) {
      this.errorMessage = `Aucun fichier disponible pour le CV ${cv.id} (${cv.username}) en français.`;
      return;
    }

    this.cvService.previewCVWithoutRestriction(cv.id).subscribe(
      (blob: Blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      (error) => {
        console.error('Erreur lors de la prévisualisation du CV :', error);
        this.errorMessage = error.message || 'Erreur lors de la prévisualisation du CV.';
      }
    );
  }

  createCharts(): void {
    if (!this.analytics) {
      console.warn('Aucune donnée disponible pour créer les graphiques.');
      return;
    }

    const analyticsData: Analytics = this.analytics;

    console.log('Création des graphiques...');

    if (this.seniorityChart) {
      this.seniorityChart.destroy();
      this.seniorityChart = null;
    }
    if (this.skillsChart) {
      this.skillsChart.destroy();
      this.skillsChart = null;
    }
    Object.keys(this.senioritySkillsCharts).forEach(level => {
      if (this.senioritySkillsCharts[level]) {
        this.senioritySkillsCharts[level].destroy();
      }
    });
    this.senioritySkillsCharts = {};

    const seniorityCtx = document.getElementById('seniorityChart') as HTMLCanvasElement;
    if (!seniorityCtx) {
      console.error('Élément seniorityChart non trouvé dans le DOM.');
      return;
    }
    this.seniorityChart = new Chart(seniorityCtx, {
      type: 'pie',
      data: {
        labels: ['Junior', 'Intermédiaire', 'Senior'],
        datasets: [{
          label: 'Nombre de collaborateurs', // Remplacé "Nombre de profils" par "Nombre de collaborateurs"
          data: [
            analyticsData.seniority_distribution.junior.count,
            analyticsData.seniority_distribution.intermediate.count,
            analyticsData.seniority_distribution.senior.count
          ],
          backgroundColor: ['#36A2EB', '#FF8C00', '#FFCE56'],
          hoverOffset: 20
        }]
      },
      options: {
        responsive: true,
        aspectRatio: 1.5,
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 1500,
          easing: 'easeInOutQuad'
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#333333',
              font: {
                size: 10
              }
            }
          },
          title: {
            display: true,
            text: 'Répartition par seniorité',
            color: '#333333',
            font: {
              size: 12
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = Number(context.raw || 0);
                return `Nombre de collaborateurs ${label} : ${value}`; // Remplacé "Nombre de profils" par "Nombre de collaborateurs"
              }
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const labels = ['Junior', 'Intermédiaire', 'Senior'];
            const seniorityLabel = labels[index];
            this.filterCVsBySeniority(seniorityLabel);
          }
        }
      }
    });

    const skillsCtx = document.getElementById('skillsChart') as HTMLCanvasElement;
    if (!skillsCtx) {
      console.error('Élément skillsChart non trouvé dans le DOM.');
      return;
    }
    const skillsLabels = this.filteredTopSkills.map(skill => skill.name);
    const skillsData = this.filteredTopSkills.map(skill => skill.frequency);
    this.skillsChart = new Chart(skillsCtx, {
      type: 'bar',
      data: {
        labels: skillsLabels,
        datasets: [{
          label: '',
          data: skillsData,
          backgroundColor: skillsLabels.map(() => 'rgba(46, 204, 113, 0.3)'),
          borderColor: '#2ECC71',
          borderWidth: 2,
          barThickness: 20
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        animation: {
          duration: 1500,
          easing: 'easeInOutQuad'
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: false,
            },
            ticks: {
              color: '#333333',
              font: {
                size: 10
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y: {
            title: {
              display: false,
            },
            ticks: {
              color: '#333333',
              font: {
                size: 10
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = Number(context.raw || 0);
                return `"${label}" : ${value}`;
              }
            }
          }
        }
      }
    });

    this.seniorityLevels.forEach(level => {
      const ctx = document.getElementById(`${level}SkillsChart`) as HTMLCanvasElement;
      if (!ctx) {
        console.error(`Élément ${level}SkillsChart non trouvé dans le DOM.`);
        return;
      }
      let skillsFreq = analyticsData.seniority_distribution[level]?.skills?.skills_frequency;
      if (!skillsFreq) {
        console.error(`skills_frequency est undefined pour le niveau ${level}`);
        return;
      }

      const sortedSkills = Object.entries(skillsFreq).sort((a, b) => b[1] - a[1]);
      const labels = sortedSkills.map(entry => entry[0].charAt(0).toUpperCase() + entry[0].slice(1)).slice(0, 5);
      const data = sortedSkills.map(entry => entry[1]).slice(0, 5);
      const baseColor = level === 'junior' ? '#36A2EB' : level === 'intermediate' ? '#FF8C00' : '#FFCE56';
      const backgroundColor = level === 'junior' ? `rgba(54, 162, 235, 0.3)` :
                            level === 'intermediate' ? `rgba(255, 140, 0, 0.3)` :
                            `rgba(255, 206, 86, 0.3)`;
      this.senioritySkillsCharts[level] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: '',
            data: data,
            backgroundColor: labels.map(() => backgroundColor),
            borderColor: baseColor,
            borderWidth: 2,
            barThickness: 20
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          animation: {
            duration: 1500,
            easing: 'easeInOutQuad'
          },
          scales: {
            x: {
              beginAtZero: true,
              title: {
                display: false,
              },
              ticks: {
                color: '#333333',
                font: {
                  size: 10
                }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            y: {
              title: {
                display: false,
              },
              ticks: {
                color: '#333333',
                font: {
                  size: 10
                }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: level === 'intermediate' ? 'Intermédiaire' : `${level.charAt(0).toUpperCase() + level.slice(1)}`,
              color: '#333333',
              font: {
                size: 12
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = Number(context.raw || 0);
                  return `"${label}" : ${value}`;
                }
              }
            }
          }
        }
      });
    });
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}