import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
  email = '';
  message = '';
  resetToken = '';

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        if (res.token) {
          this.resetToken = res.token;
          this.message = 'Reset link generated successfully!';
        } else {
          this.resetToken = '';
          this.message = 'No token generated. (Are you sure you registered this email first?)';
        }
      },
      error: () => {
        this.message = 'If that email exists, a link was sent.';
      }
    });
  }
}
