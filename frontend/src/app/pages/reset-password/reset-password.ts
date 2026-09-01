import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../services/auth';


@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword {

  token = '';

  newPassword = '';

  confirmPassword = '';

  loading = false;

  message = '';

  errorMessage = '';


  constructor(
    private auth: Auth,
    public router: Router
  ) {

    const storedToken =
      localStorage.getItem(
        'passwordResetToken'
      );


    if (storedToken) {

      this.token =
        storedToken;

    }

  }


  // ==========================================
  // RESET PASSWORD
  // ==========================================

  resetPassword(): void {

    this.message = '';

    this.errorMessage = '';


    if (!this.token.trim()) {

      this.errorMessage =
        'Password reset token is required.';

      return;

    }


    if (!this.newPassword) {

      this.errorMessage =
        'Please enter a new password.';

      return;

    }


    if (
      this.newPassword.length < 8
    ) {

      this.errorMessage =
        'Password must be at least 8 characters.';

      return;

    }


    if (
      this.newPassword !==
      this.confirmPassword
    ) {

      this.errorMessage =
        'Passwords do not match.';

      return;

    }


    this.loading = true;


    this.auth
      .resetPassword({

        token:
          this.token.trim(),

        new_password:
          this.newPassword

      })
      .subscribe({

        next: (response) => {

          this.loading = false;


          localStorage.removeItem(
            'passwordResetToken'
          );


          this.message =
            response?.message ||
            'Password reset successfully.';


          this.newPassword = '';

          this.confirmPassword = '';


          setTimeout(() => {

            this.router.navigate([
              '/login'
            ]);

          }, 1500);

        },


        error: (error) => {

          this.loading = false;


          console.error(
            'Reset password failed:',
            error
          );


          this.errorMessage =
            error?.error?.detail ||
            'Unable to reset password.';

        }

      });

  }


  // ==========================================
  // BACK TO LOGIN
  // ==========================================

  backToLogin(): void {

    localStorage.removeItem(
      'passwordResetToken'
    );


    this.router.navigate([
      '/login'
    ]);

  }

}