import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-edit-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-procurement.html',
  styleUrls: ['./edit-procurement.css']
})
export class EditProcurementComponent implements OnInit {

  id!: number;

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
    private route: ActivatedRoute,
    private router: Router
  ) {}


  ngOnInit(): void {

    this.id = Number(this.route.snapshot.paramMap.get('id'));

    this.loadProcurement();

  }


  loadProcurement(){

    this.http.get<any>(
      `http://127.0.0.1:8000/procurement/${this.id}`
    )
    .subscribe({

      next:(data)=>{

        this.procurement = data;

      },

      error:(err)=>{

        console.error(err);

      }

    });

  }


  updateProcurement(){

    this.http.put(
      `http://127.0.0.1:8000/procurement/${this.id}`,
      this.procurement
    )
    .subscribe({

      next:()=>{

        alert('Procurement Updated Successfully');

        this.router.navigate(['/procurement']);

      },

      error:(err)=>{

        console.error(err);
        alert('Update Failed');

      }

    });

  }

}