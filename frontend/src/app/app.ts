import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  email: string = "";

  password: string = "";

  constructor(private http: HttpClient) {}

  login() {

    const data = {
      email: this.email,
      password: this.password
    };

    this.http.post(
      'http://127.0.0.1:8000/login',
      data
    ).subscribe({

      next: (response: any) => {

        localStorage.setItem(
          "token",
          response.access_token
        );

        console.log("Token Saved!");

        console.log(response);

      },

      error: (error) => {

        console.log(error);

      }

    });

  }

}