import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-purchase-orders',
  styleUrl: './purchase-orders.css',
  templateUrl: './purchase-orders.html',
})
export class PurchaseOrders implements OnInit {

  purchaseOrders: any[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api.getPurchaseOrders().subscribe((data: any) => {

      console.log('PURCHASE ORDERS DATA:', data);
      console.log('FIRST PO:', data.purchase_orders[0]);

      this.purchaseOrders = data.purchase_orders || [];

      this.cdr.detectChanges();
    });
  }

}