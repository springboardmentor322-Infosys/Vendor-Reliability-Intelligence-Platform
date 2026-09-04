import { environment } from '../../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';


@Component({

selector:'app-edit-performance',

standalone:true,

imports:[
CommonModule,
FormsModule
],

templateUrl:'./edit-performance.html',

styleUrl:'./edit-performance.css'

})


export class EditPerformanceComponent implements OnInit {


id!: number;


private apiUrl =
`${environment.apiUrl}/performance`;



performance:any = {

vendor_name:'',

delivery_score:0,

quality_score:0,

reliability_score:0,

overall_score:0

};




constructor(

private http:HttpClient,

private route:ActivatedRoute,

private router:Router

){}





ngOnInit():void{


this.id = Number(

this.route.snapshot.paramMap.get('id')

);



this.loadPerformance();


}






loadPerformance(){


this.http.get<any>(

`${this.apiUrl}/${this.id}`

)

.subscribe({


next:(data)=>{


this.performance = data;


},


error:(err)=>{


console.error(

"Load Error:",

err

);


}


});


}






calculateScore(){


this.performance.overall_score = Math.round(

(

this.performance.delivery_score +

this.performance.quality_score +

this.performance.reliability_score

) / 3

);


}






updatePerformance(){


this.calculateScore();



this.http.put(

`${this.apiUrl}/${this.id}`,

this.performance

)

.subscribe({


next:()=>{


alert(
"Performance updated successfully"
);



this.router.navigate(

['/performance']

);



},


error:(err)=>{


console.error(

"Update Error:",

err

);


}


});


}



}