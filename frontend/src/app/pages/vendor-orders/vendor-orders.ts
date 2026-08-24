import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';


@Component({

selector:'app-vendor-orders',

standalone:true,

imports:[
CommonModule,
FormsModule
],

templateUrl:'./vendor-orders.html',

styleUrl:'./vendor-orders.css'

})


export class VendorOrdersComponent implements OnInit {


orders:any[] = [];


private apiUrl =
'http://127.0.0.1:8000/purchase-orders';


private vendorApi =
'http://127.0.0.1:8000/vendors';



statuses = [

'In Progress',

'Shipped',

'Partial Delivery',

'Delivered'

];



constructor(

private http:HttpClient,

private auth:AuthService

){}





ngOnInit():void{


const user = this.auth.currentUser();



if(user){


this.getVendorName(
user.email
);


}

else{


this.auth.loadProfile()

.subscribe({

next:(profile)=>{


this.getVendorName(
profile.email
);


},


error:(err)=>{


console.error(
"Profile Error:",
err
);


}


});


}



}







getVendorName(email:string){



this.http.get<any[]>(

this.vendorApi

)

.subscribe({



next:(vendors)=>{


const vendor = vendors.find(

(v:any)=>

v.email === email

);



if(vendor){


this.loadOrders(

vendor.vendor_name

);


}



console.log(

"Vendor Details:",

vendor

);



},



error:(err)=>{


console.error(

"Vendor API Error:",

err

);


}



});



}







loadOrders(vendorName:string){



this.http.get<any[]>(

this.apiUrl

)

.subscribe({



next:(orders)=>{



console.log(

"ALL ORDERS:",

orders

);



this.orders = orders.filter(

(order:any)=>

order.vendor_name === vendorName

);



console.log(

"MY ORDERS:",

this.orders

);



},



error:(err)=>{


console.error(

"Order API Error:",

err

);


}



});



}







// UPDATE ORDER STATUS


updateStatus(order:any){



const url =

`${this.apiUrl}/${order.id}/status`;



this.http.put(

url,

null,

{

params:{

status:order.status

}

}

)

.subscribe({



next:(response)=>{


console.log(

"STATUS UPDATED:",

response

);


alert(
"Order status updated successfully"
);


},



error:(err)=>{


console.error(

"Status Update Error:",

err

);


alert(
"Failed to update status"
);


}



});



}




}