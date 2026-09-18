
import{Component,inject,OnInit,AfterViewInit,ChangeDetectorRef}from'@angular/core';
import{CommonModule}from'@angular/common';
import{Router}from'@angular/router';
import{HttpClient}from'@angular/common/http';
import{DashboardService}from'../../services/dashboard';
import{Chart,registerables}from'chart.js';

Chart.register(...registerables);

@Component({
selector:'app-dashboard',
standalone:true,
imports:[CommonModule],
templateUrl:'./dashboard.html',
styleUrl:'./dashboard.css'
})
export class Dashboard implements OnInit,AfterViewInit{
private dashboardService=inject(DashboardService);
private http=inject(HttpClient);
private router=inject(Router);
private cdr=inject(ChangeDetectorRef);

totalVendors=0;
totalProcurements=0;
lowRiskVendors=0;
mediumRiskVendors=0;
highRiskVendors=0;

totalOrders=0;
totalSuppliers=0;
totalQuantity=0;
totalDefectiveUnits=0;
totalPurchaseValue=0;

orderStatus:any={};
supplierOrders:any={};
categoryOrders:any={};
compliance:any={};
supplierQuantity:any={};
defectiveBySupplier:any={};

orderStatusEntries:any[]=[];
supplierOrderEntries:any[]=[];
categoryOrderEntries:any[]=[];
complianceEntries:any[]=[];
defectiveSupplierEntries:any[]=[];

riskChart:Chart|undefined;
orderStatusChart:Chart|undefined;
supplierChart:Chart|undefined;
categoryChart:Chart|undefined;
complianceChart:Chart|undefined;
defectiveChart:Chart|undefined;

chartsCreated=false;

selectedFile:File|null=null;
uploading=false;
uploadMessage='';
uploadError='';

ngOnInit():void{
this.loadDashboard();
this.loadSupplyChainAnalytics();
}

ngAfterViewInit():void{
setTimeout(()=>{
if(this.totalOrders>0){
this.createCharts();
}
},500);
}

createCharts():void{
console.log('CREATE CHARTS STARTED');
if(this.totalOrders<=0){
console.log('NO ORDERS - CHARTS NOT CREATED');
return;
}
this.destroyCharts();
this.createRiskChart();
this.createOrderStatusChart();
this.createSupplierChart();
this.createCategoryChart();
this.createComplianceChart();
this.createDefectiveChart();
this.chartsCreated=true;
console.log('ALL CHARTS CREATED');
}

loadDashboard():void{
this.dashboardService.getDashboard().subscribe({
next:(response:any)=>{
console.log('DASHBOARD RESPONSE:',response);
this.totalVendors=Number(response.total_vendors||0);
this.totalProcurements=Number(response.total_procurements||0);
this.lowRiskVendors=Number(response.low_risk_vendors||0);
this.mediumRiskVendors=Number(response.medium_risk_vendors||0);
this.highRiskVendors=Number(response.high_risk_vendors||0);
this.cdr.detectChanges();
setTimeout(()=>{
if(this.totalOrders>0){
this.createCharts();
}else{
this.createRiskChart();
}
},500);
},
error:(error:any)=>{
console.error('DASHBOARD ERROR:',error);
}
});
}

loadSupplyChainAnalytics():void{
console.log('Loading supply-chain analytics...');
this.http.get('http://127.0.0.1:8000/supply-chain/analytics').subscribe({
next:(response:any)=>{
console.log('AUTO SUPPLY CHAIN DATA:',response);
this.processSupplyChainData(response);
},
error:(error:any)=>{
console.error('SUPPLY CHAIN AUTO LOAD ERROR:',error);
this.uploadError=error?.error?.detail||'Unable to load supply-chain dataset.';
}
});
}

onFileSelected(event:any):void{
const file=event.target.files[0];
this.uploadMessage='';
this.uploadError='';
if(!file){
this.selectedFile=null;
return;
}
if(!file.name.toLowerCase().endsWith('.csv')){
this.selectedFile=null;
this.uploadError='Please select a CSV file.';
return;
}
this.selectedFile=file;
console.log('CSV FILE SELECTED:',file.name);
}

uploadSupplyChainData():void{
if(!this.selectedFile){
this.uploadError='Please select a CSV file first.';
return;
}
this.uploading=true;
this.uploadMessage='';
this.uploadError='';
const formData=new FormData();
formData.append('file',this.selectedFile);
this.http.post('http://127.0.0.1:8000/supply-chain/analytics',formData).subscribe({
next:(response:any)=>{
console.log('SUPPLY CHAIN API RESPONSE:',response);
this.processSupplyChainData(response);
this.uploading=false;
this.uploadMessage='Supply-chain CSV uploaded successfully.';
this.cdr.detectChanges();
},
error:(error:any)=>{
console.error('SUPPLY CHAIN UPLOAD ERROR:',error);
this.uploading=false;
this.uploadError=error?.error?.detail||'Unable to upload CSV file.';
}
});
}

processSupplyChainData(response:any):void{
console.log('PROCESSING SUPPLY CHAIN DATA:',response);

this.totalOrders=Number(response.total_orders||0);
this.totalSuppliers=Number(response.total_suppliers||0);
this.totalQuantity=Number(response.total_quantity||0);
this.totalDefectiveUnits=Number(response.total_defective_units||0);
this.totalPurchaseValue=Number(response.total_purchase_value||0);

this.orderStatus=response.order_status||{};
this.supplierOrders=response.supplier_orders||{};
this.categoryOrders=response.category_orders||{};
this.compliance=response.compliance||{};
this.supplierQuantity=response.supplier_quantity||{};
this.defectiveBySupplier=response.defective_by_supplier||{};

this.orderStatusEntries=Object.entries(this.orderStatus).map(([name,value])=>({
name,
value:Number(value)
}));

this.supplierOrderEntries=Object.entries(this.supplierOrders).map(([name,value])=>({
name,
value:Number(value)
}));

this.categoryOrderEntries=Object.entries(this.categoryOrders).map(([name,value])=>({
name,
value:Number(value)
}));

this.complianceEntries=Object.entries(this.compliance).map(([name,value])=>({
name,
value:Number(value)
}));

this.defectiveSupplierEntries=Object.entries(this.defectiveBySupplier).map(([name,value])=>({
name,
value:Number(value)
}));

console.log('TOTAL ORDERS:',this.totalOrders);
console.log('TOTAL SUPPLIERS:',this.totalSuppliers);
console.log('TOTAL QUANTITY:',this.totalQuantity);
console.log('TOTAL DEFECTIVE UNITS:',this.totalDefectiveUnits);
console.log('TOTAL PURCHASE VALUE:',this.totalPurchaseValue);
console.log('ORDER STATUS:',this.orderStatusEntries);
console.log('SUPPLIER ORDERS:',this.supplierOrderEntries);
console.log('CATEGORY ORDERS:',this.categoryOrderEntries);
console.log('COMPLIANCE:',this.complianceEntries);
console.log('DEFECTIVE SUPPLIERS:',this.defectiveSupplierEntries);

this.cdr.detectChanges();

setTimeout(()=>{
this.createCharts();
},500);
}

destroyCharts():void{
this.riskChart?.destroy();
this.orderStatusChart?.destroy();
this.supplierChart?.destroy();
this.categoryChart?.destroy();
this.complianceChart?.destroy();
this.defectiveChart?.destroy();

this.riskChart=undefined;
this.orderStatusChart=undefined;
this.supplierChart=undefined;
this.categoryChart=undefined;
this.complianceChart=undefined;
this.defectiveChart=undefined;
}

createRiskChart():void{
const canvas=document.getElementById('riskChart')as HTMLCanvasElement|null;
if(!canvas){
console.log('RISK CANVAS NOT FOUND');
return;
}

this.riskChart?.destroy();

this.riskChart=new Chart(canvas,{
type:'doughnut',
data:{
labels:['Low Risk','Medium Risk','High Risk'],
datasets:[{
data:[
this.lowRiskVendors,
this.mediumRiskVendors,
this.highRiskVendors
],
backgroundColor:[
'#16a34a',
'#f59e0b',
'#dc2626'
],
borderWidth:2,
borderColor:'#ffffff'
}]
},
options:{
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{
position:'bottom'
},
tooltip:{
enabled:true
}
}
}
});
}

createOrderStatusChart():void{
const canvas=document.getElementById('orderStatusChart')as HTMLCanvasElement|null;
if(!canvas)return;

this.orderStatusChart?.destroy();

this.orderStatusChart=new Chart(canvas,{
type:'doughnut',
data:{
labels:this.orderStatusEntries.map(item=>item.name),
datasets:[{
data:this.orderStatusEntries.map(item=>item.value),
backgroundColor:[
'#2563eb',
'#f59e0b',
'#8b5cf6',
'#dc2626'
],
borderWidth:2,
borderColor:'#ffffff'
}]
},
options:{
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{
position:'bottom'
}
}
}
});
}

createSupplierChart():void{
const canvas=document.getElementById('supplierChart')as HTMLCanvasElement|null;
if(!canvas)return;

this.supplierChart?.destroy();

this.supplierChart=new Chart(canvas,{
type:'bar',
data:{
labels:this.supplierOrderEntries.map(item=>item.name),
datasets:[{
label:'Orders',
data:this.supplierOrderEntries.map(item=>item.value),
backgroundColor:'#2563eb',
borderRadius:6
}]
},
options:{
responsive:true,
maintainAspectRatio:false,
scales:{
y:{
beginAtZero:true,
ticks:{
precision:0
}
}
},
plugins:{
legend:{
display:false
}
}
}
});
}

createCategoryChart():void{
const canvas=document.getElementById('categoryChart')as HTMLCanvasElement|null;
if(!canvas)return;

this.categoryChart?.destroy();

this.categoryChart=new Chart(canvas,{
type:'bar',
data:{
labels:this.categoryOrderEntries.map(item=>item.name),
datasets:[{
label:'Orders',
data:this.categoryOrderEntries.map(item=>item.value),
backgroundColor:'#7c3aed',
borderRadius:6
}]
},
options:{
responsive:true,
maintainAspectRatio:false,
scales:{
y:{
beginAtZero:true,
ticks:{
precision:0
}
}
},
plugins:{
legend:{
display:false
}
}
}
});
}

createComplianceChart():void{
const canvas=document.getElementById('complianceChart')as HTMLCanvasElement|null;
if(!canvas)return;

this.complianceChart?.destroy();

this.complianceChart=new Chart(canvas,{
type:'doughnut',
data:{
labels:this.complianceEntries.map(item=>item.name),
datasets:[{
data:this.complianceEntries.map(item=>item.value),
backgroundColor:[
'#16a34a',
'#dc2626'
],
borderWidth:2,
borderColor:'#ffffff'
}]
},
options:{
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{
position:'bottom'
}
}
}
});
}

createDefectiveChart():void{
const canvas=document.getElementById('defectiveChart')as HTMLCanvasElement|null;
if(!canvas)return;

this.defectiveChart?.destroy();

this.defectiveChart=new Chart(canvas,{
type:'bar',
data:{
labels:this.defectiveSupplierEntries.map(item=>item.name),
datasets:[{
label:'Defective Units',
data:this.defectiveSupplierEntries.map(item=>item.value),
backgroundColor:'#dc2626',
borderRadius:6
}]
},
options:{
indexAxis:'y',
responsive:true,
maintainAspectRatio:false,
scales:{
x:{
beginAtZero:true,
ticks:{
precision:0
}
}
},
plugins:{
legend:{
display:false
}
}
}
});
}

goToVendors():void{
this.router.navigate(['/vendors']);
}

goToProcurement():void{
this.router.navigate(['/procurement']);
}

goToPurchaseOrders():void{
this.router.navigate(['/purchase-orders']);
}
}