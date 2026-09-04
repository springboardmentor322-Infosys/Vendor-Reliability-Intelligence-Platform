import { environment } from '../../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-edit-purchase-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './edit-purchase-order.html',
  styleUrls: ['./edit-purchase-order.css']
})
export class EditPurchaseOrderComponent implements OnInit {


  id!: number;


  order = {

    vendor_name: '',
    product_name: '',
    quantity: 0,
    total_amount: 0,
    status: 'Pending'

  };


  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ){}



  ngOnInit(): void {

    this.id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    this.loadOrder();

  }



  loadOrder(){

    this.http.get<any>(
      `${environment.apiUrl}/purchase-orders/${this.id}`
    )
    .subscribe({

      next:(data)=>{

        this.order = data;

      },

      error:(err)=>{

        console.error(err);

      }

    });

  }



  updateOrder(){

    this.http.put(
      `${environment.apiUrl}/purchase-orders/${this.id}`,
      this.order
    )
    .subscribe({

      next:()=>{

        alert('Purchase Order Updated Successfully');

        this.router.navigate(['/purchase-orders']);

      },

      error:(err)=>{

        console.error(err);

        alert('Update Failed');

      }

    });

  }

}