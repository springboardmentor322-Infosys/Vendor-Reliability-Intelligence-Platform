import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';


@Component({
  selector: 'app-add-purchase-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './add-purchase-order.html',
  styleUrls: ['./add-purchase-order.css']
})
export class AddPurchaseOrderComponent {


  order = {

    vendor_name: '',
    product_name: '',
    quantity: 0,
    total_amount: 0,
    status: 'Pending'

  };


  constructor(
    private http: HttpClient,
    private router: Router
  ){}



  addPurchaseOrder(){


    this.http.post(

      'http://127.0.0.1:8000/purchase-orders/add',

      this.order

    )
    .subscribe({

      next:()=>{

        alert('Purchase Order Added Successfully');

        this.router.navigate(['/purchase-orders']);

      },


      error:(err)=>{

        console.error(err);

        alert('Failed to add Purchase Order');

      }


    });


  }


}