import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';



@Component({

  selector: 'app-vendor-details',

  standalone: true,

  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],

  templateUrl: './vendor-details.html',

  styleUrls: ['./vendor-details.css']

})


export class VendorDetailsComponent implements OnInit {


  vendor:any = null;


  private apiUrl =
  'https://vendor-reliability-intelligence-platform-2h9h.onrender.com/vendors';



  constructor(

    private http:HttpClient,

    private route:ActivatedRoute,

    private router:Router

  ){}




  ngOnInit():void{


    const id =
    this.route.snapshot.paramMap.get('id');


    if(id){

      this.loadVendor(id);

    }


  }






  loadVendor(id:string){


    this.http.get<any>(

      `${this.apiUrl}/${id}/`

    )

    .subscribe({


      next:(data)=>{


        console.log(
          "Vendor Details:",
          data
        );


        this.vendor=data;


      },


      error:(err)=>{


        console.error(
          "Vendor Details Error:",
          err
        );


      }


    });


  }






  back(){


    this.router.navigate(

      ['/vendors']

    );


  }






  edit(){


    this.router.navigate(

      ['/edit-vendor', this.vendor.id]

    );


  }


}
