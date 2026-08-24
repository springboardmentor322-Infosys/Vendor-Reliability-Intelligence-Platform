import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,

  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
  ],

  templateUrl: './login.html',
  styleUrl: './login.css',
})


export class LoginComponent {


  email = '';

  password = '';



  constructor(
    private auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}




  login(): void {


    if (!this.email || !this.password) {

      this.snackBar.open(
        'Please enter email and password.',
        'Close',
        {
          duration: 3000,
        }
      );

      return;
    }




    this.auth.login(
      this.email.trim(),
      this.password.trim()
    )

    .subscribe({

      next: () => {


        this.auth.loadProfile()

        .subscribe({

          next: (user) => {


            console.log(
              "Logged User:",
              user
            );


            const role =
            user.role.toLowerCase();





            // ADMIN

            if(role === 'administrator' || role === 'admin'){

              this.router.navigate([
                '/dashboard'
              ]);

            }





            // VENDOR

            else if(role === 'vendor'){

              this.router.navigate([
                '/vendor-dashboard'
              ]);

            }






            // ALL INTERNAL ROLES
            // Administrator, Procurement Manager, Supply Chain Manager,
            // Finance Officer and Auditor use the shared enterprise dashboard.
            else if(
              role === 'procurement manager' ||
              role === 'supply chain manager' ||
              role === 'finance officer' ||
              role === 'auditor'
            ){

              this.router.navigate([
                '/dashboard'
              ]);

            }





            else {


              this.snackBar.open(

                'Role not configured.',

                'Close',

                {
                  duration:3000
                }

              );

            }



          },



          error:(err)=>{


            console.error(
              err
            );


            this.snackBar.open(

              'Profile loading failed.',

              'Close',

              {
                duration:3000
              }

            );


          }


        });


      },



      error:(err)=>{


        console.error(
          err
        );


        this.snackBar.open(

          'Invalid email or password.',

          'Close',

          {
            duration:3000
          }

        );


      }


    });


  }


}