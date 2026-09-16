import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  login() {
    localStorage.setItem('access_token', 'test-token');
    window.location.href = '/orders';
  }

}