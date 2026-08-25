import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';


@Component({

  selector: 'app-vendor-profile',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './vendor-profile.html',

  styleUrl: './vendor-profile.css'

})


export class VendorProfileComponent implements OnInit {


  vendor: any = null;


  private apiUrl =
    'https://vendor-reliability-intelligence-platform-2h9h.onrender.com/vendors';




  constructor(

    private http: HttpClient,

    private auth: AuthService

  ) {}





  ngOnInit(): void {


    let user = this.auth.currentUser();



    console.log(
      "CURRENT USER:",
      user
    );



    if(!user){


      this.auth.loadProfile()

      .subscribe({


        next:(profile)=>{


          console.log(
            "PROFILE LOADED:",
            profile
          );


          this.loadVendor(
            profile.email
          );


        },


        error:(err)=>{


          console.error(
            "Profile Error:",
            err
          );


        }


      });



    }


    else {


      this.loadVendor(
        user.email
      );


    }



  }







  loadVendor(email:string){


    console.log(
      "Searching vendor:",
      email
    );



    this.http.get<any[]>(

      this.apiUrl

    )

    .subscribe({



      next:(vendors)=>{


        console.log(
          "ALL VENDORS:",
          vendors
        );



        this.vendor = vendors.find(

          (v:any)=>

          v.email === email

        );



        console.log(
          "MATCHED VENDOR:",
          this.vendor
        );



      },



      error:(err)=>{


        console.error(
          "Vendor API Error:",
          err
        );


      }


    });


  }


}
