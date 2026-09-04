import { environment } from '../../../environments/environment';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';


@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatTableModule
  ],
  templateUrl: './purchase-orders.html',
  styleUrls: ['./purchase-orders.css']
})
export class PurchaseOrdersComponent implements OnInit {


  orders = signal<any[]>([]);

  private apiUrl = `${environment.apiUrl}/purchase-orders`;


  columns = [
    'vendor_name',
    'product_name',
    'quantity',
    'total_amount',
    'status',
    'actions'
  ];



  constructor(
    private http: HttpClient,
    private router: Router
  ) {}



  ngOnInit(): void {

    this.loadOrders();

  }




  loadOrders(): void {


    this.http.get<any[]>(
      `${this.apiUrl}/`
    )
    .subscribe({

      next:(data)=>{

        console.log('Purchase Orders:', data);

        this.orders.set(data);

      },

      error:(err)=>{

        console.error(err);

      }

    });

  }





  editOrder(id:number): void {

    this.router.navigate(['/edit-purchase-order', id]);

  }





  deleteOrder(id:number): void {


    if(!confirm('Delete Purchase Order?')){
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

        alert('Purchase Order Deleted Successfully');

        this.loadOrders();

      },

      error:(err)=>{

        console.error(err);

      }

    });

  }





  // ---------------- Workflow ----------------


  approveOrder(id:number):void{

    this.updateStatus(id,'approve');

  }



  shipOrder(id:number):void{

    this.updateStatus(id,'ship');

  }



  partialDelivery(id:number):void{

    this.updateStatus(id,'partial');

  }



  deliverOrder(id:number):void{

    this.updateStatus(id,'deliver');

  }





  updateStatus(
    id:number,
    action:string
  ):void{


    this.http.put(
      `${this.apiUrl}/${id}/${action}`,
      {},
      {
        headers:this.getHeaders()
      }
    )
    .subscribe({

      next:()=>{

        alert(
          `Purchase Order ${action} successful`
        );

        this.loadOrders();

      },


      error:(err)=>{

        console.error(err);

      }

    });

  }





  private getHeaders():HttpHeaders {


    const token = localStorage.getItem('token');


    return new HttpHeaders({

      Authorization:`Bearer ${token}`

    });

  }


}