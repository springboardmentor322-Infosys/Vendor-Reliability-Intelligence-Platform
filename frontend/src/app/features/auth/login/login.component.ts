import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  rolesList = [
    { label: 'Administrator', email: 'administrator@example.com' },
    { label: 'Procurement Manager', email: 'procurement_manager@example.com' },
    { label: 'Supply Chain Manager', email: 'supply_chain_manager@example.com' },
    { label: 'Finance Officer', email: 'finance_officer@example.com' },
    { label: 'Auditor', email: 'auditor@example.com' },
    { label: 'Vendor', email: 'vendor@example.com' }
  ];
  selectedRoleLabel = '';

  constructor(private authService: AuthService, private router: Router) {}

  pickRole(role: any) {
    this.selectedRoleLabel = role.label;
    this.email = role.email;
    this.password = 'password123';
  }

  onSubmit() {
    this.authService.login({ email: this.email, password: this.password, role_name: this.selectedRoleLabel }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Login failed';
      }
    });
  }
}
