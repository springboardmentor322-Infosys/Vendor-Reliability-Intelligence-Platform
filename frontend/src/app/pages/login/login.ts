import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Auth } from '../../services/auth';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email = '';

  password = '';


  constructor(
    private auth: Auth,
    public router: Router
  ) {}


  // ==========================================
  // LOGIN
  // ==========================================

  login(): void {

    const data = {

      email:
        this.email,

      password:
        this.password

    };


    this.auth
      .login(data)
      .subscribe({

        next: () => {

          this.router.navigate([
            '/dashboard'
          ]);

        },


        error: (error) => {

          console.error(
            'Login failed:',
            error
          );

          alert(
            'Invalid Email or Password'
          );

        }

      });

  }

}