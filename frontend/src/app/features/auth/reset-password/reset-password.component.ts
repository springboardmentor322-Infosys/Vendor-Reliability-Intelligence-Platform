import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  message = '';

  constructor(private authService: AuthService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
      }
    });
  }

  onSubmit() {
    this.authService.resetPassword({ token: this.token, new_password: this.password }).subscribe({
      next: () => {
        this.message = 'Password successfully updated. Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.message = 'Failed: ' + (err.error?.detail || 'Invalid token');
      }
    });
  }
}
