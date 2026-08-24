import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-procurement.html',
  styleUrls: ['./add-procurement.css']
})
export class AddProcurementComponent {

  procurement = {
    product_name: '',
    quantity: 0,
    department: '',
    requested_by: '',
    priority: 'Medium',
    status: 'Pending'
  };


  constructor(
    private http: HttpClient,
    private router: Router
  ) {}


  addProcurement() {

    this.http.post(
      'http://127.0.0.1:8000/procurement/add',
      this.procurement
    )
    .subscribe({

      next: () => {
        alert('Procurement Added Successfully');
        this.router.navigate(['/procurement']);
      },

      error: (err) => {
        console.error(err);
        alert('Failed to add procurement');
      }

    });

  }

}