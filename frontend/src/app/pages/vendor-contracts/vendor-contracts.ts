import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';


@Component({

selector:'app-vendor-contracts',

standalone:true,

imports:[
CommonModule
],

templateUrl:'./vendor-contracts.html',

styleUrl:'./vendor-contracts.css'

})


export class VendorContractsComponent implements OnInit {


contracts:any[] = [];

loading = true;



private contractApi =
'http://127.0.0.1:8000/contracts';



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


this.loading=false;


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


const vendor =
vendors.find(

(v:any)=>

v.email === email

);



console.log(
"Vendor:",
vendor
);



if(vendor){


this.loadContracts(

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









loadContracts(vendorName:string){



this.http.get<any[]>(

this.contractApi

)

.subscribe({



next:(contracts)=>{


console.log(

"ALL CONTRACTS:",

contracts

);



this.contracts = contracts.filter(

(contract:any)=>

contract.vendor_name === vendorName

);



console.log(

"MY CONTRACTS:",

this.contracts

);



this.loading=false;



},



error:(err)=>{


console.error(

"Contract API Error:",

err

);


this.loading=false;


}



});



}








isExpiringSoon(date:string):boolean{


const expiry =
new Date(date);



const today =
new Date();



const diff =
expiry.getTime()
-
today.getTime();



const days =
diff /
(1000*60*60*24);



return days <= 90;



}




}