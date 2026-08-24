import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';


@Component({
  selector: 'app-procurement-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './procurement-list.html',
  styleUrls: ['./procurement-list.css']
})
export class ProcurementListComponent implements OnInit {


  procurements: any[] = [];

  private apiUrl = 'http://127.0.0.1:8000/procurement';


  constructor(
    private http: HttpClient,
    private router: Router
  ) {}



  ngOnInit(): void {
    this.loadProcurements();
  }



  loadProcurements(): void {

    this.http.get<any[]>(`${this.apiUrl}/`)
      .subscribe({

        next: (data) => {

          console.log('Procurement:', data);

          this.procurements = data;

        },

        error: (err) => {

          console.error(err);

        }

      });

  }





  editProcurement(id: number): void {

    this.router.navigate(['/edit-procurement', id]);

  }





  deleteProcurement(id: number): void {


    if (!confirm('Delete Procurement Request?')) {
      return;
    }


    this.http.delete(
      `${this.apiUrl}/${id}`,
      {
        headers: this.getHeaders()
      }
    )
    .subscribe({

      next: () => {

        alert('Procurement Deleted Successfully');

        this.loadProcurements();

      },


      error: (err) => {

        console.error(err);

        alert('Delete Failed');

      }

    });

  }





  // ---------------- Workflow ----------------


  approveProcurement(id:number):void{

    this.updateStatus(id,'approve');

  }



  orderProcurement(id:number):void{

    this.updateStatus(id,'order');

  }



  deliverProcurement(id:number):void{

    this.updateStatus(id,'deliver');

  }



  completeProcurement(id:number):void{

    this.updateStatus(id,'complete');

  }



  cancelProcurement(id:number):void{

    this.updateStatus(id,'cancel');

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
          `Procurement ${action} successful`
        );

        this.loadProcurements();

      },


      error:(err)=>{

        console.error(err);

      }

    });

  }





  private getHeaders():HttpHeaders{


    const token = localStorage.getItem('token');


    return new HttpHeaders({

      Authorization:`Bearer ${token}`

    });

  }


}