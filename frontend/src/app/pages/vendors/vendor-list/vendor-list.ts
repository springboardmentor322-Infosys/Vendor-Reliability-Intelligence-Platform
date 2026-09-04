import { environment } from '../../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-vendor-list',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    FormsModule
  ],

  templateUrl: './vendor-list.html',
  styleUrls: ['./vendor-list.css']
})


export class VendorListComponent implements OnInit {


  vendors: any[] = [];

  filteredVendors: any[] = [];


  searchText = '';

  selectedStatus = 'All';

  selectedCategory = 'All';

  canManage = false;



  private apiUrl = `${environment.apiUrl}/vendors`;



  constructor(

    private http: HttpClient,

    private router: Router,

    private auth: AuthService

  ) {}





  ngOnInit(): void {

    const role = String(this.auth.currentUser()?.role || this.auth.getStoredUser()?.role || '').toLowerCase();
    this.canManage = role === 'administrator' || role === 'admin';
    this.loadVendors();

  }







  loadVendors(): void {


    this.http.get<any[]>(`${this.apiUrl}/`)

    .subscribe({


      next:(data)=>{


        console.log(
          'Vendor API:',
          data
        );


        this.vendors = data;


        this.filteredVendors = data;


      },


      error:(err)=>{


        console.error(err);


      }


    });


  }







  applyFilter(){


    this.filteredVendors = this.vendors.filter(v=>{


      const search =
      this.searchText.toLowerCase();



      const matchSearch =

      v.vendor_name
      ?.toLowerCase()
      .includes(search);



      const matchStatus =

      this.selectedStatus === 'All' ||

      v.status === this.selectedStatus;



      const matchCategory =

      this.selectedCategory === 'All' ||

      v.category === this.selectedCategory;



      return (

        matchSearch &&

        matchStatus &&

        matchCategory

      );


    });


  }







  get categories(){

    const requiredCategories = [
      'Raw Material Suppliers',
      'Equipment Vendors',
      'IT Vendors',
      'Service Providers',
      'Logistics Partners',
      'Maintenance Vendors'
    ];

    const existingCategories = this.vendors
      .map(v => v.category)
      .filter(Boolean);

    return [
      ...new Set([
        ...requiredCategories,
        ...existingCategories
      ])
    ];

  }






  // 👁 View Vendor Details

  viewVendor(id:number): void {


    this.router.navigate(

      ['/vendor-details', id]

    );


  }






  // ✏ Edit Vendor

  editVendor(id:number): void {


    this.router.navigate(

      ['/edit-vendor', id]

    );


  }







  // 🗑 Delete Vendor

  deleteVendor(id:number): void {


    const headers = this.getHeaders();



    this.http.delete(

      `${this.apiUrl}/${id}`,

      { headers }

    )

    .subscribe({


      next:()=>{


        alert(

          'Vendor Deleted'

        );


        this.loadVendors();


      },


      error:(err)=>{


        console.error(err);


      }


    });


  }







  // Approval Workflow


  approveVendor(id:number): void {


    this.updateStatus(

      id,

      'approve'

    );


  }



  rejectVendor(id:number): void {


    this.updateStatus(

      id,

      'reject'

    );


  }



  reviewVendor(id:number): void {


    this.updateStatus(

      id,

      'review'

    );


  }







  updateStatus(

    id:number,

    action:string

  ): void {


    const headers = this.getHeaders();



    this.http.put(

      `${this.apiUrl}/${id}/${action}`,

      {},

      { headers }

    )

    .subscribe({


      next:()=>{


        alert(

          `Vendor ${action} successfully`

        );


        this.loadVendors();


      },


      error:(err)=>{


        console.error(err);


      }


    });


  }







  private getHeaders(): HttpHeaders {


    const token =

    localStorage.getItem('token');



    return new HttpHeaders({


      Authorization:

      `Bearer ${token}`


    });


  }


}