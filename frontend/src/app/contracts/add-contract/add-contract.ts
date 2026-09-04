import { environment } from '../../../environments/environment';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';


@Component({
  selector: 'app-add-contract',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './add-contract.html',
  styleUrls: ['./add-contract.css']
})
export class AddContractComponent {


  contract = {

    vendor_name: '',
    contract_title: '',
    start_date: '',
    expiry_date: '',
    renewal_notice_period: 90,
    terms: '',
    compliance_flag: 'Active',
    document_path: '',
    status: 'Active'

  };



  apiUrl = `${environment.apiUrl}/contracts/add`;



  constructor(
    private http: HttpClient,
    private router: Router
  ) {}




  saveContract(){


    this.http.post(
      this.apiUrl,
      this.contract
    )
    .subscribe({

      next:(response)=>{

        console.log(response);

        alert('Contract Added Successfully');

        this.router.navigate(['/contracts']);

      },


      error:(err)=>{

        console.error(err);

        alert('Failed to add contract');

      }

    });


  }



  cancel(){

    this.router.navigate(['/contracts']);

  }

}