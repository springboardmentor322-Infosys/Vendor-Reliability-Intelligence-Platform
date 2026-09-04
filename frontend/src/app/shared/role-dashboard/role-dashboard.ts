import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

interface Metric { label: string; value: string; change: string; icon: string; tone: string; }
interface Row { title: string; subtitle: string; value: string; status?: string; }

@Component({
  selector: 'app-role-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './role-dashboard.html',
  styleUrl: './role-dashboard.css'
})
export class RoleDashboardComponent implements OnInit {
  role = '';
  title = '';
  subtitle = '';
  metrics: Metric[] = [];
  chartTitle = '';
  chartSubtitle = '';
  chartValues = [34, 42, 39, 58, 66, 72, 78];
  secondaryChart = [58, 48, 64, 54, 72, 68, 84];
  donut = 86;
  donutLabel = 'Compliance';
  tableTitle = '';
  tableRows: Row[] = [];
  sideCards: {title:string; value:string; note:string; icon:string; tone:string}[] = [];
  quickActions: {label:string; route:string; icon:string}[] = [];
  alerts: {title:string; detail:string; severity:string}[] = [];
  currentUserName = 'User';
  loading = true;

  private readonly fallback = {
    procurement: { metrics: [['Total POs','128','+12%','shopping_cart','blue'],['Active POs','32','+8%','inventory_2','green'],['Orders in Transit','18','+9%','local_shipping','purple'],['Total Spend (YTD)','₹24,80,500','+18%','payments','orange'],['Delayed Deliveries','7','-11%','warning','red'],['Avg. Reliability Score','87/100','+4%','verified','cyan']], donut: 74, donutLabel:'Completed', chart:'Spend Analysis (YTD)', table:'Recent Purchase Orders', rows:[['PO-2025-0472','ABC Industries','₹85,000','In Progress'],['PO-2025-0471','Global Components','₹41,500','Delivered'],['PO-2025-0469','Prime Suppliers','₹68,200','Pending'],['PO-2025-0468','Techno Solutions','₹24,300','Approved'],['PO-2025-0467','Speed Logistics','₹18,600','In Transit']] },
    supply: { metrics: [['Total Suppliers','245','+7%','groups','blue'],['Active Purchase Orders','128','+10%','assignment','green'],['On-Time Delivery','92.4%','+2.1%','schedule','cyan'],['Supply Chain Risk','Medium','No change','shield','orange'],['Inventory Value','₹758.6M','+5.8%','inventory','purple'],['Supply Chain Cost (YTD)','₹24.8M','-6.4%','payments','red']], donut: 84, donutLabel:'Good / Excellent', chart:'Supply Chain Performance Trend', table:'Recent Purchase Orders', rows:[['PO-2025-0472','ABC Industries','In Transit','May 28, 2025'],['PO-2025-0471','Global Components','Delivered','May 26, 2025'],['PO-2025-0469','Prime Suppliers','In Progress','May 25, 2025'],['PO-2025-0468','Techno Solutions','Confirmed','May 24, 2025'],['PO-2025-0467','Speed Logistics','Confirmed','May 23, 2025']] },
    finance: { metrics: [['Total Spend (YTD)','₹24,80,500','+16.2%','payments','blue'],['Total Savings (YTD)','₹5,42,500','+12.5%','trending_down','green'],['Total Payments (YTD)','₹21,50,300','+8.1%','account_balance','purple'],['Budget Utilization','82.6%','₹20.6M / ₹25M','pie_chart','orange'],['Pending Payments','₹3,20,800','8 invoices','pending','red'],['Cash Flow (This Month)','₹8,75,600','+19.1%','account_balance_wallet','cyan']], donut: 82.6, donutLabel:'Budget Used', chart:'Monthly Spend Trend', table:'Recent Invoices', rows:[['INV-2025-0450','ABC Industries','₹1,45,000','Paid'],['INV-2025-0449','Global Components','₹85,500','Paid'],['INV-2025-0448','Prime Suppliers','₹72,300','Pending'],['INV-2025-0447','Techno Solutions','₹63,100','Paid'],['INV-2025-0446','Speed Logistics','₹48,900','Overdue']] },
    auditor: { metrics: [['Audits Conducted','36','+6 this month','fact_check','blue'],['Compliance Score','86.5%','+4.7%','verified_user','green'],['Open Audit Findings','14','3 high risk','warning','orange'],['High Risk Vendors','8','No change','gpp_bad','red'],['Pending Approvals','19','+5 this week','pending_actions','purple'],['Overdue Actions','7','-2 this week','assignment_late','cyan']], donut: 86.5, donutLabel:'Overall Compliance', chart:'Audit Findings Summary', table:'Recent Audit Findings', rows:[['AF-2025-0081','ABC Industries','Documentation','High','Open'],['AF-2025-0080','Global Components','Process Audit','Medium','In Review'],['AF-2025-0079','Prime Suppliers','Compliance','High','Open'],['AF-2025-0078','Techno Solutions','Safety','Low','Resolved'],['AF-2025-0077','Speed Logistics','Delivery Controls','Medium','In Progress']] }
  };

  constructor(private http: HttpClient, private route: ActivatedRoute, public auth: AuthService) {}

  ngOnInit(): void {
    this.role = String(this.route.snapshot.data['dashboardRole'] || '').toLowerCase();
    this.currentUserName = this.auth.currentUser()?.full_name || this.auth.getStoredUser()?.full_name || 'User';
    this.configure();
    this.loadData();
  }

  private configure(): void {
    if (this.role === 'procurement') {
      this.title = 'Procurement Dashboard';
      this.subtitle = "Here's what's happening with your procurement operations today.";
      this.chartTitle = 'Spend Analysis (YTD)';
      this.tableTitle = 'Recent Purchase Orders';
      this.applyFallback(this.fallback.procurement);
      this.quickActions = [{label:'Create Purchase Order',route:'/add-purchase-order',icon:'add_shopping_cart'},{label:'New Procurement Request',route:'/add-procurement',icon:'post_add'},{label:'View Vendors',route:'/vendors',icon:'store'},{label:'Reports',route:'/reports',icon:'assessment'}];
    } else if (this.role === 'supply') {
      this.title = 'Supply Chain Dashboard';
      this.subtitle = "Here's your supply chain overview and performance summary.";
      this.chartTitle = 'Supply Chain Performance Trend';
      this.tableTitle = 'Recent Purchase Orders';
      this.applyFallback(this.fallback.supply);
      this.quickActions = [{label:'Supplier Performance',route:'/performance',icon:'trending_up'},{label:'Track Orders',route:'/purchase-orders',icon:'local_shipping'},{label:'View Vendors',route:'/vendors',icon:'store'},{label:'Reliability',route:'/reliability',icon:'verified'}];
    } else if (this.role === 'finance') {
      this.title = 'Finance Dashboard';
      this.subtitle = "Here's your financial summary and performance overview.";
      this.chartTitle = 'Monthly Spend Trend';
      this.tableTitle = 'Recent Invoices';
      this.applyFallback(this.fallback.finance);
      this.quickActions = [{label:'Create Invoice',route:'/invoices',icon:'receipt_long'},{label:'Approve Payments',route:'/invoices',icon:'check_circle'},{label:'Budget Report',route:'/reports',icon:'summarize'},{label:'Financial Reports',route:'/reports',icon:'assessment'}];
    } else {
      this.title = 'Auditor Dashboard';
      this.subtitle = "Here's your audit, vendor risk and compliance overview.";
      this.chartTitle = 'Audit Findings Summary';
      this.tableTitle = 'Recent Audit Findings';
      this.applyFallback(this.fallback.auditor);
      this.quickActions = [{label:'Create Audit Report',route:'/reports',icon:'description'},{label:'View Findings',route:'/compliance',icon:'fact_check'},{label:'Risk Assessment',route:'/reliability',icon:'gpp_maybe'},{label:'Document Control',route:'/compliance',icon:'folder'}];
    }
  }

  private applyFallback(config: any): void {
    this.metrics = config.metrics.map((m:any) => ({label:m[0],value:m[1],change:m[2],icon:m[3],tone:m[4]}));
    this.donut = config.donut;
    this.donutLabel = config.donutLabel;
    this.tableRows = config.rows.map((r:string[]) => ({title:r[0],subtitle:r[1],value:r[2],status:r[3]}));
    this.sideCards = this.sideCardsForRole();
    this.alerts = this.alertsForRole();
  }

  private loadData(): void {
    const calls = {
      vendors: this.http.get<any[]>(`${environment.apiUrl}/vendors/`).pipe(catchError(() => of([]))),
      orders: this.http.get<any[]>(`${environment.apiUrl}/purchase-orders/`).pipe(catchError(() => of([]))),
      performance: this.http.get<any[]>(`${environment.apiUrl}/performance/`).pipe(catchError(() => of([]))),
      invoices: this.http.get<any[]>(`${environment.apiUrl}/invoices/`).pipe(catchError(() => of([]))),
      procurement: this.http.get<any[]>(`${environment.apiUrl}/procurement/`).pipe(catchError(() => of([]))),
      contracts: this.http.get<any[]>(`${environment.apiUrl}/contracts/`).pipe(catchError(() => of([]))),
      notifications: this.http.get<any[]>(`${environment.apiUrl}/notifications/`).pipe(catchError(() => of([])))
    };
    forkJoin(calls).subscribe({
      next: data => {
        const vendors = data.vendors;
        const orders = data.orders;
        const perf = data.performance;
        const invoices = data.invoices;
        const procurement = data.procurement;
        const contracts = data.contracts;
        const notifications = data.notifications;
        if (vendors.length) {
          const approved = vendors.filter(v => ['Approved','Active'].includes(v.status)).length;
          const risk = vendors.filter(v => ['Rejected','Pending','Under Review'].includes(v.status)).length;
          if (this.role === 'supply') this.metrics[0].value = String(vendors.length);
          if (this.role === 'procurement') this.metrics[5].value = perf.length ? `${Math.round(perf.reduce((s,p)=>s+(+p.overall_score||0),0)/perf.length)}/100` : this.metrics[5].value;
          this.sideCards[0].value = String(approved);
          this.sideCards[1].value = String(risk);
        }
        if (orders.length) {
          const spend = orders.reduce((s,o)=>s+(+o.total_amount||0),0);
          const delayed = orders.filter(o=>['Delayed','Partial Delivery'].includes(o.status)).length;
          if (this.role === 'procurement') { this.metrics[0].value=String(orders.length); this.metrics[4].value=String(delayed); this.metrics[3].value=`₹${spend.toLocaleString('en-IN')}`; }
          if (this.role === 'supply') { this.metrics[1].value=String(orders.filter(o=>['Approved','Shipped','Delivered','Completed','In Transit'].includes(o.status)).length); this.metrics[5].value=`₹${spend.toLocaleString('en-IN')}`; }
          if (this.role === 'finance') this.metrics[0].value=`₹${spend.toLocaleString('en-IN')}`;
          this.tableRows = orders.slice(-5).reverse().map(o=>({title:`PO-${String(o.id).padStart(4,'0')}`,subtitle:o.vendor_name,value:`₹${(+o.total_amount||0).toLocaleString('en-IN')}`,status:o.status}));
        }
        if (invoices.length && this.role === 'finance') {
          const paid = invoices.filter(i=>String(i.status).toLowerCase()==='paid').reduce((s,i)=>s+(+i.amount||0),0);
          const pending = invoices.filter(i=>String(i.status).toLowerCase()==='pending').reduce((s,i)=>s+(+i.amount||0),0);
          this.metrics[2].value=`₹${paid.toLocaleString('en-IN')}`;
          this.metrics[4].value=`₹${pending.toLocaleString('en-IN')}`;
          this.tableRows=invoices.slice(0,5).map(i=>({title:i.invoice_number||`INV-${i.id}`,subtitle:i.vendor_name,value:`₹${(+i.amount||0).toLocaleString('en-IN')}`,status:i.status}));
        }
        if (procurement.length && this.role === 'procurement') {
          this.sideCards[2].value=String(procurement.filter(p=>p.status==='Pending').length);
        }
        if (contracts.length && this.role === 'auditor') {
          const compliant=contracts.filter(c=>['active','compliant'].includes(String(c.compliance_flag||'').toLowerCase())).length;
          this.donut=contracts.length ? Math.round(compliant/contracts.length*1000)/10 : this.donut;
        }
        if (notifications.length) this.alerts = notifications.slice(0,4).map(n=>({title:n.title,detail:n.message,severity:n.severity||'info'}));
        this.loading=false;
      },
      error: () => { this.loading=false; }
    });
  }

  private sideCardsForRole() {
    if (this.role === 'finance') return [{title:'Paid Invoices',value:'842',note:'+12.5% this month',icon:'check_circle',tone:'green'},{title:'Pending Invoices',value:'212',note:'Needs attention',icon:'pending',tone:'orange'},{title:'Overdue Invoices',value:'102',note:'-1.3% this month',icon:'warning',tone:'red'},{title:'Total Budget',value:'₹25.0M',note:'82.6% utilized',icon:'account_balance',tone:'purple'}];
    if (this.role === 'auditor') return [{title:'Compliant Vendors',value:'86',note:'77% of assessed',icon:'verified',tone:'green'},{title:'High Risk Vendors',value:'8',note:'Immediate review',icon:'gpp_bad',tone:'red'},{title:'Pending Actions',value:'19',note:'5 added this week',icon:'pending_actions',tone:'orange'},{title:'Evidence Items',value:'248',note:'Documents reviewed',icon:'folder',tone:'purple'}];
    if (this.role === 'supply') return [{title:'Approved Suppliers',value:'205',note:'84% of suppliers',icon:'verified',tone:'green'},{title:'At Risk Suppliers',value:'32',note:'Needs monitoring',icon:'warning',tone:'orange'},{title:'Orders Delivered',value:'88',note:'This month',icon:'local_shipping',tone:'cyan'},{title:'Inventory Health',value:'92%',note:'Good',icon:'inventory',tone:'purple'}];
    return [{title:'Approved Vendors',value:'112',note:'87.5% of active',icon:'verified',tone:'green'},{title:'At Risk Vendors',value:'16',note:'Requires review',icon:'warning',tone:'orange'},{title:'Pending Requests',value:'10',note:'Awaiting approval',icon:'pending_actions',tone:'purple'},{title:'Active Contracts',value:'96',note:'8 near expiry',icon:'description',tone:'cyan'}];
  }

  private alertsForRole() {
    if (this.role === 'finance') return [{title:'High spend alert',detail:'Raw Materials category exceeded monthly threshold.',severity:'warning'},{title:'Payment due',detail:'Invoice INV-2025-0448 is due soon.',severity:'error'},{title:'Budget utilization',detail:'Current utilization is 82.6%.',severity:'info'}];
    if (this.role === 'auditor') return [{title:'New high-risk vendor identified',detail:'Review the latest risk assessment.',severity:'error'},{title:'Compliance score updated',detail:'Overall compliance remains above target.',severity:'success'},{title:'Audit action overdue',detail:'One evidence item needs attention.',severity:'warning'}];
    if (this.role === 'supply') return [{title:'Delivery delay',detail:'One purchase order is delayed.',severity:'error'},{title:'Supplier risk increased',detail:'A supplier moved to medium risk.',severity:'warning'},{title:'Inventory health',detail:'Safety stock coverage remains healthy.',severity:'success'}];
    return [{title:'Delivery delay',detail:'A purchase order needs attention.',severity:'error'},{title:'New vendor approval',detail:'A vendor application is awaiting review.',severity:'warning'},{title:'Contract expiry',detail:'A contract is nearing its renewal date.',severity:'info'}];
  }

  get chartPoints(): string { return this.chartValues.map((v,i)=>`${i*116},${220-v*1.8}`).join(' '); }
  get secondaryPoints(): string { return this.secondaryChart.map((v,i)=>`${i*116},${220-v*1.8}`).join(' '); }
  track(_:number, item: any): string { return item.label || item.title; }
}
