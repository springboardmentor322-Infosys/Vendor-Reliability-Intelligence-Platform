import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../services/auth';


@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {

  email = '';

  loading = false;

  message = '';

  errorMessage = '';


  constructor(
    private auth: Auth,
    public router: Router
  ) {}


  // ==========================================
  // SEND RESET REQUEST
  // ==========================================

  forgotPassword(): void {

    this.message = '';

    this.errorMessage = '';


    if (!this.email.trim()) {

      this.errorMessage =
        'Please enter your email address.';

      return;

    }


    this.loading = true;


    this.auth
      .forgotPassword(
        this.email.trim()
      )
      .subscribe({

        next: (response) => {

          this.loading = false;


          if (
            response?.reset_token
          ) {

            localStorage.setItem(
              'passwordResetToken',
              response.reset_token
            );


            this.router.navigate([
              '/reset-password'
            ]);

            return;

          }


          this.message =
            response?.message ||
            'If the email exists, a password reset request has been created.';

        },


        error: (error) => {

          this.loading = false;


          console.error(
            'Forgot password failed:',
            error
          );


          this.errorMessage =
            error?.error?.detail ||
            'Unable to process password reset request.';

        }

      });

  }


  // ==========================================
  // BACK TO LOGIN
  // ==========================================

  backToLogin(): void {

    this.router.navigate([
      '/login'
    ]);

  }

}