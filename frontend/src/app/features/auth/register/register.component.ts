import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  email = '';
  password = '';
  message = '';
  isSuccess = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.authService.register({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isSuccess = true;
        this.message = 'Account created successfully! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.isSuccess = false;
        this.message = err.error?.detail || 'Registration failed';
      }
    });
  }
}
