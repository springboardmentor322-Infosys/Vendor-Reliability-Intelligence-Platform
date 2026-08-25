import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';


@Component({

selector:'app-add-performance',

standalone:true,

imports:[
CommonModule,
FormsModule
],

templateUrl:'./add-performance.html',

styleUrl:'./add-performance.css'

})


export class AddPerformanceComponent {


private apiUrl =
'https://vendor-reliability-intelligence-platform-2h9h.onrender.com/performance/add';



performance = {

vendor_name:'',

delivery_score:0,

quality_score:0,

reliability_score:0,

overall_score:0,
on_time_deliveries:0,
delayed_deliveries:0,
response_time_hours:0,
issue_resolution_time_hours:0,
service_rating:0,
order_completion_rate:0,
performance_period:'Current'

};



constructor(

private http:HttpClient,

private router:Router

){}



calculateScore(){

this.performance.overall_score = Math.round(

(
this.performance.delivery_score +
this.performance.quality_score +
this.performance.reliability_score
) / 3

);

}




addPerformance(){


this.calculateScore();


const token = localStorage.getItem('token');


const headers = new HttpHeaders({

Authorization:`Bearer ${token}`

});



this.http.post(

this.apiUrl,

this.performance,

{
headers
}

)

.subscribe({


next:(response)=>{


console.log(
"Performance Added:",
response
);


alert(
"Performance added successfully"
);


this.router.navigate(
['/performance']
);


},



error:(err)=>{


console.error(
"Add Performance Error:",
err
);


alert(
err.error?.detail || "Failed to add performance"
);


}



});


}


}
