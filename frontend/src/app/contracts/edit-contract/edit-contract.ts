import { environment } from '../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-edit-contract',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './edit-contract.html',
  styleUrls: ['./edit-contract.css']
})
export class EditContractComponent implements OnInit {


  contractId!: number;


  contract:any = {

    vendor_name:'',
    contract_title:'',
    start_date:'',
    expiry_date:'',
    renewal_notice_period:90,
    terms:'',
    compliance_flag:'Active',
    document_path:'',
    status:'Active'

  };


  apiUrl=`${environment.apiUrl}/contracts`;



  constructor(
    private http:HttpClient,
    private route:ActivatedRoute,
    private router:Router
  ){}



  ngOnInit():void{

    this.contractId =
    Number(this.route.snapshot.paramMap.get('id'));


    this.loadContract();

  }




  loadContract(){

    this.http.get<any>(
      `${this.apiUrl}/${this.contractId}`
    )
    .subscribe({

      next:(data)=>{

        this.contract=data;

      },

      error:(err)=>{

        console.error(err);

      }

    });

  }





  updateContract(){

    this.http.put(
      `${this.apiUrl}/${this.contractId}`,
      this.contract
    )
    .subscribe({

      next:()=>{

        alert('Contract Updated Successfully');

        this.router.navigate(['/contracts']);

      },

      error:(err)=>{

        console.error(err);

        alert('Update Failed');

      }

    });

  }




  cancel(){

    this.router.navigate(['/contracts']);

  }


}