import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials = { email: '', password: '' };

  constructor(private authService: AuthService, private router: Router) {}

  onLogin(): void {
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        // Log détaillé de la réponse complète
        console.log('Réponse complète de /login/:', JSON.stringify(response, null, 2));
        
        // Extraire et stocker le token
        const token = response.token;
        console.log('Token extrait:', token);
        if (!token) {
          console.error('Aucun token trouvé dans la réponse');
        }
        localStorage.setItem('token', token);
        console.log('Token stocké dans localStorage:', localStorage.getItem('token'));

        // Stocker le username si présent
        const username = response.username;
        if (username) {
          localStorage.setItem('username', username);
          console.log('Username stocké:', username);
        } else {
          console.warn('Aucun username dans la réponse');
        }

        // Redirection
        console.log('Connexion réussie, redirection vers /choose-cv-action');
        this.router.navigate(['/choose-cv-action']);
      },
      error: (error) => {
        console.error('Erreur lors de la connexion:', error);
        alert('Login failed');
      }
    });
  }
}