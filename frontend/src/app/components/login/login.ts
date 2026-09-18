import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  password: string = '';

  errorMessage: string = '';
  loading: boolean = false;

  login(): void {

    this.errorMessage = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Please enter email and password.';
      return;
    }

    this.loading = true;

    const loginData = {
      email: this.email.trim(),
      password: this.password
    };

    console.log('LOGIN DATA:', {
      email: loginData.email
    });

    this.authService.login(loginData).subscribe({

      next: (response: any) => {

        console.log('LOGIN RESPONSE:', response);

        if (response?.access_token) {

          localStorage.setItem(
            'access_token',
            response.access_token
          );

          console.log('Login successful');

          this.router.navigate(['/dashboard']);

        } else {

          this.errorMessage = 'Login token not received.';
        }

        this.loading = false;
      },

      error: (error: any) => {

        console.error('LOGIN ERROR:', error);

        this.errorMessage =
          error?.error?.detail ||
          'Invalid email or password.';

        this.loading = false;
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
