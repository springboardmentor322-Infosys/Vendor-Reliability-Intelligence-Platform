import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.services';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  full_name: string = '';
  email: string = '';
  password: string = '';
  role: string = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  register() {

    const user = {
      full_name: this.full_name,
      email: this.email,
      password: this.password,
      role: this.role
    };

    this.authService.register(user).subscribe({
      next: () => {
        alert('Registration Successful');
        this.router.navigate(['/login']);
      },

      error: (error: any) => {
        alert('Registration Failed');
        console.error(error);
      }
    });

  }

}
