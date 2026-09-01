import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../services/auth';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  full_name = '';

  email = '';

  password = '';

  confirmPassword = '';

  role = 'Vendor';

  loading = false;

  errorMessage = '';

  successMessage = '';


  constructor(
    private auth: Auth,
    private router: Router
  ) {}


  // ==========================================
  // REGISTER
  // ==========================================

  register(): void {

    this.errorMessage = '';

    this.successMessage = '';


    // ==========================================
    // VALIDATION
    // ==========================================

    if (
      !this.full_name.trim() ||
      !this.email.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {

      this.errorMessage =
        'Please fill all required fields.';

      return;

    }


    if (
      this.password !==
      this.confirmPassword
    ) {

      this.errorMessage =
        'Passwords do not match.';

      return;

    }


    if (
      this.password.length < 8
    ) {

      this.errorMessage =
        'Password must contain at least 8 characters.';

      return;

    }


    this.loading = true;


    // ==========================================
    // API REQUEST
    // ==========================================

    this.auth
      .register({

        full_name:
          this.full_name.trim(),

        email:
          this.email.trim(),

        password:
          this.password,

        role:
          this.role

      })
      .subscribe({

        next: () => {

          this.loading = false;

          this.successMessage =
            'Registration successful! Redirecting to login...';


          this.full_name = '';

          this.email = '';

          this.password = '';

          this.confirmPassword = '';


          setTimeout(() => {

            this.router.navigate([
              '/login'
            ]);

          }, 1200);

        },


        error: (error) => {

          console.error(
            'Registration failed:',
            error
          );


          this.loading = false;


          this.errorMessage =
            error?.error?.detail ||
            'Registration failed. Please try again.';

        }

      });

  }


  // ==========================================
  // BACK TO LOGIN
  // ==========================================

  goToLogin(): void {

    this.router.navigate([
      '/login'
    ]);

  }

}