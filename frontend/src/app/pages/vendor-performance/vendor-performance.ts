import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';


@Component({

selector:'app-vendor-performance',

standalone:true,

imports:[
CommonModule
],

templateUrl:'./vendor-performance.html',

styleUrl:'./vendor-performance.css'

})


export class VendorPerformanceComponent implements OnInit {


performance:any = null;

loading = true;



private apiUrl =
'http://127.0.0.1:8000/performance';


private vendorApi =
'http://127.0.0.1:8000/vendors';





constructor(

private http:HttpClient,

private auth:AuthService

){}






ngOnInit():void{


const user =
this.auth.currentUser();



if(user){


this.loadPerformance(
user.email
);


}

else{


this.auth.loadProfile()

.subscribe({

next:(profile)=>{


this.loadPerformance(
profile.email
);


},


error:(err)=>{


console.error(
"Profile Error:",
err
);


this.loading=false;


}


});


}


}








loadPerformance(email:string){



this.http.get<any[]>(

this.vendorApi

)

.subscribe({



next:(vendors)=>{


const vendor = vendors.find(

(v:any)=>

v.email === email

);



console.log(
"Vendor:",
vendor
);



if(vendor){


this.getPerformance(
vendor.vendor_name
);


}

else{


this.loading=false;


}



},



error:(err)=>{


console.error(
"Vendor API Error:",
err
);


this.loading=false;


}



});


}








getPerformance(vendorName:string){



this.http.get<any[]>(

this.apiUrl

)

.subscribe({



next:(data)=>{


console.log(
"ALL PERFORMANCE:",
data
);



this.performance = data.find(

(item:any)=>

item.vendor_name === vendorName

);



console.log(

"MY PERFORMANCE:",

this.performance

);



this.loading=false;



},



error:(err)=>{


console.error(

"Performance API Error:",

err

);


this.loading=false;


}



});


}



}