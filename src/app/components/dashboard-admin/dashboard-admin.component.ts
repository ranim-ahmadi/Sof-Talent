import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss']
})
export class DashboardAdminComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  selectedRole: string = '';
  matriculeSearch: string = '';
  errorMessage: string | null = null;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5; // Nombre d'éléments par page
  totalPages: number = 1;
  visiblePages: number[] = []; // Plage de pages visibles

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // Charger la liste des utilisateurs
  loadUsers() {
    this.userService.getUsers().subscribe(
      (data) => {
        console.log('Utilisateurs chargés', data);
        this.users = data;
        this.filteredUsers = data;
        this.updatePagination();
      },
      (error) => {
        console.error('Erreur lors de la récupération des utilisateurs', error);
        this.errorMessage = 'Erreur lors de la récupération des utilisateurs';
      }
    );
  }

  // Filtrer par rôle
  filterByRole() {
    if (this.selectedRole) {
      this.userService.getUsersByRole(this.selectedRole).subscribe(
        (data) => {
          this.filteredUsers = data;
          this.updatePagination();
        },
        (error) => {
          console.error('Erreur lors du filtrage par rôle', error);
          this.errorMessage = 'Erreur lors du filtrage par rôle';
        }
      );
    } else {
      this.filteredUsers = [...this.users];
      this.updatePagination();
    }
  }

  // Rechercher par matricule
  onSearchChange(): void {
    if (this.matriculeSearch) {
      this.filteredUsers = this.users.filter(user =>
        user.matricule && user.matricule.toString().includes(this.matriculeSearch)
      );
    } else {
      this.filteredUsers = [...this.users];
    }
    this.updatePagination();
  }

  // Enregistrer le rôle modifié
  saveUserRole(user: any) {
    this.userService.updateUserRole(user.id, user.role).subscribe(
      (response) => {
        console.log('Utilisateur mis à jour', response);
        this.errorMessage = null;
        this.loadUsers();
      },
      (error) => {
        console.error('Erreur lors de la mise à jour', error);
        this.errorMessage = error.error?.error || 'Erreur lors de la mise à jour du rôle';
      }
    );
  }

  // Mettre à jour le matricule du manager
  updateManagerMatricule(user: any) {
    const userData = {
      role: user.role,
      matricule: user.matricule,
      username: user.username,
      email: user.email,
      manager_matricule: user.manager_matricule || ''
    };

    this.userService.updateUser(user.id, userData).subscribe(
      (response) => {
        console.log('Utilisateur mis à jour avec manager', response);
        this.errorMessage = null;
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1 && response.user) {
          this.users[index] = response.user;
          this.filteredUsers = [...this.users];
          this.updatePagination();
        }
      },
      (error) => {
        console.error('Erreur lors de la mise à jour du manager', error);
        this.errorMessage = error.error?.error || 'Erreur lors de la mise à jour du manager';
        user.manager__username = 'Aucun'; // Réinitialiser le nom du manager en cas d'erreur
      }
    );
  }

  // Récupérer le nom du manager en temps réel
  getManagerName(user: any) {
    if (user.manager_matricule) {
      this.userService.getManagerByMatricule(user.manager_matricule).subscribe(
        (manager) => {
          user.manager__username = manager.username;
        },
        (error) => {
          user.manager__username = 'Aucun';
          this.errorMessage = error.error?.error || 'Manager non trouvé avec ce matricule';
        }
      );
    } else {
      user.manager__username = 'Aucun';
    }
  }

  // Supprimer un utilisateur
  deleteUser(userId: number) {
    if (confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) {
      this.userService.deleteUser(userId).subscribe(
        () => {
          this.errorMessage = null;
          this.loadUsers();
        },
        (error) => {
          console.error('Erreur lors de la suppression', error);
          this.errorMessage = error.error?.error || 'Erreur lors de la suppression';
        }
      );
    }
  }

  // Méthodes de pagination
  get paginatedUsers(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, endIndex);
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
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