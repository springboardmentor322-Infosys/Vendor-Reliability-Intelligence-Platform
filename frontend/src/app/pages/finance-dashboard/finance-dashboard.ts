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
 invoiceStatusEntries(): Array<{status:string;count:number}> {
  const counts: Record<string, number> = {};
  for (const invoice of this.invoices()) {
    const status = invoice.status || 'Unknown';
    counts[status] = (counts[status] || 0) + 1;
  }
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
 }

 invoiceStatusTotal(): number {
  return this.invoices().length;
 }

 invoiceDonutBackground(): string {
  const entries = this.invoiceStatusEntries();
  const total = this.invoiceStatusTotal();
  if (!total || !entries.length) return '#eef2f7';

  const colors = ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8', '#3b82f6'];
  let start = 0;
  const stops: string[] = [];

  entries.forEach((entry, index) => {
    const end = start + (entry.count / total) * 100;
    stops.push(`${colors[index % colors.length]} ${start}% ${end}%`);
    start = end;
  });

  return `conic-gradient(${stops.join(', ')})`;
 }

 invoiceStatusClass(status:string): string {
  const key = status.toLowerCase();
  if (key.includes('paid') || key.includes('complete')) return 'invoice-good';
  if (key.includes('pending') || key.includes('due')) return 'invoice-warn';
  if (key.includes('reject') || key.includes('cancel')) return 'invoice-bad';
  return 'invoice-neutral';
 }

 requestDepartmentEntries(): Array<{department:string;amount:number}> {
  const totals: Record<string, number> = {};
  for (const request of this.requests()) {
    const department = request.department || 'General';
    totals[department] = (totals[department] || 0) + (Number(request.estimated_amount) || 0);
  }
  return Object.entries(totals)
    .map(([department, amount]) => ({ department, amount }))
    .sort((a,b) => b.amount - a.amount);
 }

 requestDepartmentPercentage(amount:number): number {
  const max = Math.max(...this.requestDepartmentEntries().map(x => x.amount), 0);
  if (max <= 0) return 0;
  return Math.max(5, Math.round((amount / max) * 100));
 }

 approve(id:number){this.procurement.approveProcurementRequest(id).subscribe({next:()=>this.load(),error:e=>alert(e?.error?.detail||'Approval failed')});}
 reject(id:number){if(prompt('Enter reason for rejection:')===null)return;this.procurement.rejectProcurementRequest(id).subscribe({next:()=>this.load(),error:e=>alert(e?.error?.detail||'Rejection failed')});}
 saveBudget(b:any){const v=Number(b.allocated_limit);if(!Number.isFinite(v)||v<0){alert('Budget must be a non-negative number.');return}this.finance.updateBudget(b.id,v).subscribe({next:()=>this.load(),error:e=>alert(e?.error?.detail||'Budget update failed')});}
 money(v:number){return new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(Number(v||0));}
}
