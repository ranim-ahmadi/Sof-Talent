import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  user = { email: '', 
    password: '', 
    username: '', 
    matricule: '', 
    password2: ''  };

  constructor(private authService: AuthService) {}

  onRegister(): void {
    this.authService.register(this.user).subscribe({
      next: (response) => {
        console.log('Inscription réussie:', response);
        alert('Registration successful');
      },
      error: (error) => {
        console.error('Erreur lors de l’inscription:', error);
        alert('Registration failed');
      }
    });
  }
}