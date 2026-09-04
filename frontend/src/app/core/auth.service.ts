import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';


export interface UserProfile {

  id: number;

  full_name: string;

  email: string;

  role: string;

}


export interface LoginResponse {

  access_token: string;

  token_type: string;

}



@Injectable({
  providedIn: 'root'
})


export class AuthService {


  private readonly tokenKey = 'token';

  private readonly userKey = 'user';



  currentUser = signal<UserProfile | null>(null);



  constructor(

    private http: HttpClient,

    private router: Router

  ) {}





  login(

    email: string,

    password: string

  ): Observable<LoginResponse> {


    return this.http.post<LoginResponse>(

      `${environment.apiUrl}/users/login`,

      {

        email: email.trim(),

        password: password.trim()

      }

    )

    .pipe(

      tap((response)=>{


        localStorage.setItem(

          this.tokenKey,

          response.access_token

        );


      })

    );


  }







  register(user: {

    full_name:string;

    email:string;

    password:string;

    role:string;

  }): Observable<UserProfile>{


    return this.http.post<UserProfile>(

      `${environment.apiUrl}/users/register`,

      user

    );


  }








  loadProfile(): Observable<UserProfile>{


    return this.http.get<UserProfile>(

      `${environment.apiUrl}/users/me`

    )

    .pipe(

      tap((profile)=>{


        this.currentUser.set(profile);



        localStorage.setItem(

          this.userKey,

          JSON.stringify(profile)

        );


      })

    );


  }








  getToken(): string | null {


    return localStorage.getItem(

      this.tokenKey

    );


  }







  isLoggedIn(): boolean {


    return !!this.getToken();


  }







  getStoredUser(): UserProfile | null {


    const user = localStorage.getItem(

      this.userKey

    );


    return user

      ? JSON.parse(user)

      : null;


  }







  logout(): void {


    localStorage.removeItem(

      this.tokenKey

    );


    localStorage.removeItem(

      this.userKey

    );


    this.currentUser.set(null);



    this.router.navigate([

      '/login'

    ]);


  }



}