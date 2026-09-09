import {Component,OnInit,signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Finance} from '../../services/finance';
import {Procurement} from '../../services/procurement';
import {Invoice} from '../../services/invoice';
@Component({selector:'app-finance-dashboard',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./finance-dashboard.html',styleUrl:'./finance-dashboard.css'})
export class FinanceDashboard implements OnInit{
 Math=Math; summary=signal<any>({department_budgets:[]}); budgets=signal<any[]>([]); requests=signal<any[]>([]); invoices=signal<any[]>([]); loading=signal(true); error=signal('');
 constructor(private finance:Finance,private procurement:Procurement,private invoice:Invoice){}
 ngOnInit(){this.load();}
 load(){this.loading.set(true);this.finance.getSummary().subscribe({next:r=>{this.summary.set(r);this.loading.set(false)},error:e=>{console.error(e);this.error.set('Unable to load finance summary.');this.loading.set(false)}});this.finance.getBudgets().subscribe({next:r=>this.budgets.set(r),error:e=>console.error(e)});this.procurement.getProcurementRequests().subscribe({next:r=>this.requests.set(r.filter(x=>x.status==='Pending'||x.status==='Rejected').slice(0,20)),error:e=>console.error(e)});this.invoice.getInvoices().subscribe({next:r=>this.invoices.set(r.slice(0,20)),error:e=>console.error(e)});}
 approve(id:number){this.procurement.approveProcurementRequest(id).subscribe({next:()=>this.load(),error:e=>alert(e?.error?.detail||'Approval failed')});}
 reject(id:number){if(prompt('Enter reason for rejection:')===null)return;this.procurement.rejectProcurementRequest(id).subscribe({next:()=>this.load(),error:e=>alert(e?.error?.detail||'Rejection failed')});}
 saveBudget(b:any){const v=Number(b.allocated_limit);if(!Number.isFinite(v)||v<0){alert('Budget must be a non-negative number.');return}this.finance.updateBudget(b.id,v).subscribe({next:()=>this.load(),error:e=>alert(e?.error?.detail||'Budget update failed')});}
 money(v:number){return new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(Number(v||0));}
}
