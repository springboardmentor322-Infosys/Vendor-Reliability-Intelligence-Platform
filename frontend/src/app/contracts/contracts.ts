import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';


@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './contracts.html',
  styleUrls: ['./contracts.css']
})
export class ContractsComponent implements OnInit {


  contracts: any[] = [];


  apiUrl = 'http://127.0.0.1:8000/contracts';



  constructor(
    private http: HttpClient,
    private router: Router
  ) {}



  ngOnInit(): void {

    this.loadContracts();

  }




  loadContracts(): void {

    this.http.get<any[]>(
      `${this.apiUrl}/`
    )
    .subscribe({

      next:(data)=>{

        console.log("Contracts:",data);

        this.contracts = data;

      },


      error:(err)=>{

        console.error(err);

      }

    });

  }





  addContract(): void {

    this.router.navigate(['/add-contract']);

  }




  editContract(id:number): void {

    this.router.navigate(['/edit-contract',id]);

  }





  checkExpiry(id:number):void {


    this.http.put(
      `${this.apiUrl}/${id}/check-expiry`,
      {},
      {
        headers:this.getHeaders()
      }
    )
    .subscribe({

      next:()=>{

        alert("Expiry checked");

        this.loadContracts();

      },


      error:(err)=>{

        console.error(err);

      }

    });


  }





  deleteContract(id:number):void {


    if(!confirm("Delete Contract?")){
      return;
    }



    this.http.delete(
      `${this.apiUrl}/${id}`,
      {
        headers:this.getHeaders()
      }
    )
    .subscribe({

      next:()=>{

        alert("Contract deleted");

        this.loadContracts();

      },


      error:(err)=>{

        console.error(err);

      }

    });


  }





  getHeaders():HttpHeaders {


    const token = localStorage.getItem('token');


    return new HttpHeaders({

      Authorization:`Bearer ${token}`

    });

  }


}