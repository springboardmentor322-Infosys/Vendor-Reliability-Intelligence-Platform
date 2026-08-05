// @ts-nocheck
export const vendors = [
  {id:"VDR-2024-1025", name:"TechBuild Solutions", cat:"IT Vendors", score:89, band:"Excellent", risk:"Low", onTime:92.6, quality:4.6, since:"15 Jan 2023", contact:"John Doe", email:"contact@techbuild.com", phone:"+1 987 654 3210"},
  {id:"VDR-2024-0991", name:"Global Steel Corp", cat:"Raw Material Suppliers", score:92, band:"Excellent", risk:"Low", onTime:95.1, quality:4.8, since:"03 Feb 2021", contact:"Maria Kane", email:"ops@globalsteel.com", phone:"+1 555 221 9090"},
  {id:"VDR-2024-0876", name:"QuickLogistics", cat:"Logistics Partners", score:85, band:"Good", risk:"Low", onTime:88.4, quality:4.3, since:"19 Jun 2022", contact:"Sam Rae", email:"dispatch@quicklog.com", phone:"+1 555 664 2201"},
  {id:"VDR-2024-0742", name:"BuildRight Services", cat:"Service Providers", score:79, band:"Good", risk:"Medium", onTime:81.0, quality:4.0, since:"11 Nov 2022", contact:"Priya Nair", email:"hello@buildright.com", phone:"+1 555 903 1187"},
  {id:"VDR-2024-0651", name:"OneFix Maintenance", cat:"Maintenance Vendors", score:76, band:"Good", risk:"Medium", onTime:78.2, quality:3.9, since:"27 Mar 2023", contact:"D. Alvarez", email:"support@onefix.com", phone:"+1 555 442 8830"},
  {id:"VDR-2024-0518", name:"ABC Industrial Supplies", cat:"Equipment Vendors", score:58, band:"Average", risk:"Medium", onTime:69.5, quality:3.4, since:"02 May 2024", contact:"K. Osei", email:"sales@abcindustrial.com", phone:"+1 555 118 4470"},
  {id:"VDR-2024-0409", name:"Coastal Freight Ltd", cat:"Logistics Partners", score:38, band:"Poor", risk:"High", onTime:54.0, quality:2.8, since:"14 Sep 2023", contact:"R. Chen", email:"info@coastalfreight.com", phone:"+1 555 776 2290"},
  {id:"VDR-2024-0350", name:"Northline Components", cat:"Raw Material Suppliers", score:19, band:"Critical", risk:"High", onTime:41.2, quality:2.1, since:"08 Jan 2024", contact:"T. Brooks", email:"orders@northline.com", phone:"+1 555 300 6612"}
];

export const purchaseOrders = [
  {id:"PO-2024-1258", vendor:"Global Steel Corp", item:"Steel Rods (5T)", amount:"$125,000", status:"Delivered", order:"28 May 2024", delivery:"30 May 2024"},
  {id:"PO-2024-1257", vendor:"TechSupply Ltd", item:"IT Equipment", amount:"$85,400", status:"In Transit", order:"27 May 2024", delivery:"02 Jun 2024"},
  {id:"PO-2024-1256", vendor:"QuickLogistics", item:"Freight Handling", amount:"$42,300", status:"Pending", order:"26 May 2024", delivery:"05 Jun 2024"},
  {id:"PO-2024-1255", vendor:"BuildRight Services", item:"Site Maintenance", amount:"$68,750", status:"Approved", order:"25 May 2024", delivery:"01 Jun 2024"},
  {id:"PO-2024-1254", vendor:"OneFix Maintenance", item:"HVAC Servicing", amount:"$18,600", status:"Pending", order:"24 May 2024", delivery:"03 Jun 2024"},
  {id:"PO-2024-0987", vendor:"TechBuild Solutions", item:"Cement 50kg", amount:"$9,220", status:"In Transit", order:"08 May 2024", delivery:"18 May 2024"},
  {id:"PO-2024-0945", vendor:"TechBuild Solutions", item:"Electrical Panels", amount:"$14,050", status:"Pending", order:"05 May 2024", delivery:"—"},
  {id:"PO-2024-0912", vendor:"TechBuild Solutions", item:"Safety Helmets", amount:"$2,140", status:"Delivered", order:"28 Apr 2024", delivery:"05 May 2024"}
];

export const contracts = [
  {id:"CT-2024-0456", vendor:"TechBuild Solutions", type:"Master Supply Agreement", status:"Expiring Soon", expiry:"30 May 2024"},
  {id:"CT-2024-0441", vendor:"Global Steel Corp", type:"Raw Material Supply", status:"Active", expiry:"14 Dec 2024"},
  {id:"CT-2024-0430", vendor:"QuickLogistics", type:"Logistics Services", status:"Active", expiry:"20 Jan 2025"},
  {id:"CT-2024-0398", vendor:"Coastal Freight Ltd", type:"Freight Agreement", status:"Non-Compliant", expiry:"11 Jun 2024"},
  {id:"CT-2024-0377", vendor:"Northline Components", type:"Component Supply", status:"Expired", expiry:"02 Apr 2024"}
];

export const invoices = [
  {id:"INV-2024-0876", vendor:"TechBuild Solutions", amount:"$32,450", status:"Pending", due:"15 Jun 2024"},
  {id:"INV-2024-0854", vendor:"Global Steel Corp", amount:"$125,000", status:"Paid", due:"01 Jun 2024"},
  {id:"INV-2024-0839", vendor:"QuickLogistics", amount:"$42,300", status:"Overdue", due:"20 May 2024"},
  {id:"INV-2024-0820", vendor:"BuildRight Services", amount:"$68,750", status:"Paid", due:"18 May 2024"}
];

export const users = [
  {name:"Ava Thompson", email:"ava.t@org.com", role:"Administrator", status:"Active"},
  {name:"Marcus Webb", email:"marcus.w@org.com", role:"Procurement Manager", status:"Active"},
  {name:"Priya Nair", email:"priya.n@org.com", role:"Supply Chain Manager", status:"Active"},
  {name:"Daniel Cho", email:"daniel.c@org.com", role:"Finance Officer", status:"Active"},
  {name:"Layla Haddad", email:"layla.h@org.com", role:"Auditor", status:"Invited"},
  {name:"John Doe", email:"contact@techbuild.com", role:"Vendor", status:"Active"}
];

export const auditLogs = [
  {t:"2 min ago", who:"Ava Thompson", action:"Approved vendor \"ABC Industrial Supplies\" registration"},
  {t:"15 min ago", who:"System", action:"PO-2024-1258 marked as Delivered"},
  {t:"1 hour ago", who:"Marcus Webb", action:"Contract CT-2024-0456 flagged as expiring in 15 days"},
  {t:"3 hours ago", who:"Daniel Cho", action:"Invoice INV-2024-0876 approved for payment"},
  {t:"5 hours ago", who:"Priya Nair", action:"Reliability score recalculated for Coastal Freight Ltd"},
  {t:"Yesterday", who:"Layla Haddad", action:"Exported Q2 compliance audit report"}
];

/* ============================================================ ROLE CONFIG ============================================================ */
export const roles = {
  admin:{
    label:"Administrator", initials:"AT", name:"Ava Thompson",
    groups:[
      {label:"Main", items:[
        {id:"dashboard", label:"Dashboard"},
        {id:"users", label:"User Management"},
        {id:"vendors", label:"Vendor Management"},
        {id:"procurement", label:"Procurement Overview"},
        {id:"contracts", label:"Contracts & Compliance"},
        {id:"invoices", label:"Invoices & Payments"},
        {id:"communication", label:"Communication"},
        {id:"performance", label:"Performance Analytics"},
        {id:"reports", label:"Reports & Exports"},
        {id:"notifications", label:"Notifications"}
      ]},
      {label:"Administration", items:[
        {id:"roles-perms", label:"Roles & Permissions"},
        {id:"settings", label:"System Settings"},
        {id:"audit", label:"Audit Logs"}
      ]}
    ]
  },
  pm:{
    label:"Procurement Manager", initials:"MW", name:"Marcus Webb",
    groups:[
      {label:"MAIN MENU", items:[
        {id:"dashboard", label:"Procurement Overview"},
        {id:"pm_requests", label:"Procurement Requests"},
        {id:"pm_pos", label:"Purchase Orders"},
        {id:"pm_vendors", label:"Vendor Management"},
        {id:"pm_contracts", label:"Contracts Repository"},
        {id:"pm_invoices", label:"Invoices"},
        {id:"pm_communication", label:"Communication"},
        {id:"pm_notifications", label:"Notifications"}
      ]},
      {label:"REPORTS", items:[
        {id:"pm_reports_proc", label:"Procurement Reports"},
        {id:"pm_reports_spend", label:"Spend Analytics"},
        {id:"pm_reports_export", label:"Export Data"}
      ]}
    ]
  },
  scm:{
    label:"Supply Chain Manager", initials:"PN", name:"Priya Nair",
    groups:[{label:"Main", items:[
      {id:"dashboard", label:"Dashboard"},
      {id:"performance", label:"Vendor Performance"},
      {id:"reliability", label:"Reliability Scoring"},
      {id:"delivery", label:"Delivery Tracking"},
      {id:"risk", label:"Risk Assessment"},
      {id:"vendors", label:"Vendor Directory"},
      {id:"reports", label:"Analytics & Reports"},
      {id:"notifications", label:"Notifications"}
    ]}]
  },
  finance:{
    label:"Finance Officer", initials:"DC", name:"Daniel Cho",
    groups:[{label:"Main", items:[
      {id:"dashboard", label:"Dashboard"},
      {id:"invoices", label:"Invoices & Payments"},
      {id:"pos", label:"Purchase Orders"},
      {id:"payhistory", label:"Vendor Payment History"},
      {id:"reports", label:"Financial Reports"},
      {id:"notifications", label:"Notifications"}
    ]}]
  },
  auditor:{
    label:"Auditor", initials:"LH", name:"Layla Haddad",
    groups:[{label:"Main", items:[
      {id:"dashboard", label:"Dashboard"},
      {id:"compliance", label:"Compliance Monitoring"},
      {id:"contracts", label:"Contract Compliance"},
      {id:"audit", label:"Audit Logs"},
      {id:"reports", label:"Audit Reports"}
    ]}]
  },
  vendor:{
    label:"Vendor", initials:"JD", name:"John Doe",
    groups:[
      {label:"MAIN MENU", items:[
        {id:"dashboard", label:"Dashboard"},
        {id:"vendor_profile", label:"Vendor Profile"},
        {id:"vendor_performance", label:"Performance Overview"},
        {id:"vendor_pos", label:"Purchase Orders"},
        {id:"vendor_contracts", label:"Contracts & Compliance"},
        {id:"vendor_invoices", label:"Invoices & Payments"},
        {id:"vendor_communication", label:"Communication"},
        {id:"vendor_documents", label:"Documents"},
        {id:"vendor_notifications", label:"Notifications"}
      ]},
      {label:"REPORTS", items:[
        {id:"vendor_reports_perf", label:"Performance Reports"},
        {id:"vendor_reports_order", label:"Order Reports"},
        {id:"vendor_reports_comp", label:"Compliance Reports"},
        {id:"vendor_reports_export", label:"Export Reports"}
      ]},
      {label:"ACCOUNT", items:[
        {id:"vendor_settings", label:"Settings"},
        {id:"vendor_support", label:"Help & Support"}
      ]}
    ]
  }
};

export let currentRole = "admin";
export let selectedRole = "admin";
export let currentPage = "dashboard";

/* ============================================================ VIEW SWITCH ============================================================ */
export function showView(v){
  document.getElementById('view-landing').classList.toggle('hidden', v!=='landing');
  document.getElementById('view-login').classList.toggle('hidden', v!=='login');
  document.getElementById('view-forgot').classList.toggle('hidden', v!=='forgot');
  document.getElementById('view-reset').classList.toggle('hidden', v!=='reset');
  document.getElementById('view-app').classList.toggle('hidden', v!=='app');
  window.scrollTo(0,0);
  if(v==='login') buildRoleSelect();
}
export function scrollToId(id){document.getElementById(id).scrollIntoView({behavior:'smooth'});}

export function buildRoleSelect(){
  const el = document.getElementById('role-select');
  el.innerHTML = Object.keys(roles).map(k=>`
    <button class="role-pick ${k===selectedRole?'active':''}" onclick="pickRole('${k}')">
      <span class="ic"></span>${roles[k].label}
    </button>`).join('');
}
export function pickRole(k){ selectedRole = k; buildRoleSelect(); }

export function loginAs(k){
  currentRole = k;
  currentPage = "dashboard";
  const r = roles[k];
  document.getElementById('sb-role-label').textContent = r.label + " Workspace";
  document.getElementById('sb-avatar').textContent = r.initials;
  document.getElementById('tb-avatar').textContent = r.initials;
  document.getElementById('sb-who').innerHTML = r.name + '<span>'+r.label+'</span>';
  buildSidebar();
  renderPage();
  showView('app');
}

export function buildSidebar(){
  const r = roles[currentRole];
  const el = document.getElementById('nav-scroll');
  el.innerHTML = r.groups.map(g=>`
    <div class="nav-group-label">${g.label}</div>
    ${g.items.map(it=>`<a class="nav-item ${it.id===currentPage?'active':''}" onclick="goTo('${it.id}')"><span class="ic"></span>${it.label}</a>`).join('')}
  `).join('');
}

export function goTo(pageId){
  currentPage = pageId;
  buildSidebar();
  renderPage();
}

export function pageLabel(id){
  for(const g of roles[currentRole].groups){ for(const it of g.items){ if(it.id===id) return it.label; } }
  return id;
}

/* ============================================================ COMPONENT HELPERS ============================================================ */
export function kpi(label, val, delta, up){
  return `<div class="kpi"><div class="lbl"><span>${label}</span></div><div class="val">${val}</div><div class="delta ${up?'up':'down'}">${delta}</div></div>`;
}
export function badgeFor(status){
  const map = {
    "Delivered":"green","Paid":"green","Active":"green","Compliant":"green","Low":"green","Excellent":"green","Good":"teal",
    "In Transit":"teal","Pending":"amber","Approved":"teal","Expiring Soon":"amber","Medium":"amber","Average":"amber","Invited":"amber",
    "Overdue":"red","Non-Compliant":"red","Expired":"red","High":"red","Poor":"red","Critical":"red"
  };
  return `<span class="badge ${map[status]||'slate'}">${status}</span>`;
}
export function gaugeSvg(score){
  const pct = Math.max(0,Math.min(100,score))/100;
  const totalLen = 220; const dash = totalLen*pct;
  let color = score>=80?'#2F8F5B':score>=60?'#0E7C7B':score>=40?'#B9762C':'#BD4438';
  return `<svg width="170" height="105" viewBox="0 0 170 105">
    <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="#EEF1F2" stroke-width="12"/>
    <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${dash} ${totalLen}"/>
    <text x="85" y="76" text-anchor="middle" font-family="IBM Plex Mono" font-size="26" font-weight="600" fill="#132436">${score}</text>
    <text x="85" y="94" text-anchor="middle" font-family="IBM Plex Sans" font-size="10" fill="#5B6B75">/ 100</text>
  </svg>`;
}
export function bar(name, val, max){
  return `<div class="bar-row"><div class="name">${name}</div><div class="bar-track"><div class="bar-fill" style="width:${(val/max*100)}%"></div></div><div class="num">${val}</div></div>`;
}
export function head(title, sub, actions){
  return `<div class="page-head"><div><h1>${title}</h1><p>${sub||''}</p></div><div class="page-actions">${actions||''}</div></div>`;
}
export function card(title, body, link){
  return `<div class="card"><div class="card-head"><h3>${title}</h3>${link?`<a>${link} →</a>`:''}</div><div class="card-body">${body}</div></div>`;
}

/* ============================================================ PAGE RENDERERS ============================================================ */
export const pages: any = {};

pages.dashboard = function(){
  // The dashboard summary is now dynamically handled by proper Angular components (e.g. AdminDashboardComponent).
  // This renderer function is intentionally left empty so it doesn't conflict.
  return '';
}


pages.vendor_profile = function(){ return head("Vendor Profile","Manage your company details and primary contacts.") + card("Profile Information","Content for Vendor Profile goes here."); }
pages.vendor_performance = function(){ return head("Performance Overview","Detailed breakdown of your performance metrics.") + card("Performance Metrics","Content for Performance Overview goes here."); }
pages.vendor_pos = function(){ return head("Purchase Orders","Track all active and past purchase orders.") + card("Orders List","Content for Purchase Orders goes here."); }
pages.vendor_contracts = function(){ return head("Contracts & Compliance","View active contracts and compliance status.") + card("Contracts List","Content for Contracts & Compliance goes here."); }
pages.vendor_invoices = function(){ return head("Invoices & Payments","Track your submitted invoices and payment statuses.") + card("Invoices List","Content for Invoices & Payments goes here."); }
pages.vendor_communication = function(){ return head("Communication","Messages and correspondence with procurement managers.") + card("Messages","Content for Communication goes here."); }
pages.vendor_documents = function(){ return head("Documents","Manage uploaded certificates and licenses.") + card("Document Repository","Content for Documents goes here."); }
pages.vendor_notifications = function(){ return head("Notifications","Recent alerts and system notifications.") + card("Recent Notifications","Content for Notifications goes here."); }
pages.vendor_reports_perf = function(){ return head("Performance Reports","Generate and download historical performance reports.") + card("Generate Report","Content for Performance Reports goes here."); }
pages.vendor_reports_order = function(){ return head("Order Reports","Generate and download historical order volume reports.") + card("Generate Report","Content for Order Reports goes here."); }
pages.vendor_reports_comp = function(){ return head("Compliance Reports","Generate and download compliance audit reports.") + card("Generate Report","Content for Compliance Reports goes here."); }
pages.vendor_reports_export = function(){ return head("Export Reports","Export raw data across all modules.") + card("Export Tools","Content for Export Reports goes here."); }
pages.vendor_settings = function(){ return head("Settings","Manage your account preferences and security.") + card("Account Settings","Content for Settings goes here."); }
pages.vendor_support = function(){ return head("Help & Support","Access knowledge base or contact system administrators.") + card("Support Center","Content for Help & Support goes here."); }


pages.pm_requests = function(){ return head("Procurement Requests","Create and manage PRs across departments.") + card("PR List","Content for Procurement Requests goes here."); }
pages.pm_pos = function(){ return head("Purchase Orders","Track PO fulfillment and delivery status.") + card("PO Tracker","Content for Purchase Orders goes here."); }
pages.pm_vendors = function(){ return head("Vendor Management","Assign vendors to PRs and manage vendor relationships.") + card("Vendor Table","Content for Vendor Management goes here."); }
pages.pm_contracts = function(){ return head("Contracts Repository","View and negotiate vendor contracts.") + card("Contracts","Content for Contracts Repository goes here."); }
pages.pm_invoices = function(){ return head("Invoices","Approve or dispute vendor invoices.") + card("Invoices List","Content for Invoices goes here."); }
pages.pm_communication = function(){ return head("Communication","Message thread with vendors and internal teams.") + card("Messages","Content for Communication goes here."); }
pages.pm_notifications = function(){ return head("Notifications","Alerts for PO deliveries and PR approvals.") + card("Notifications","Content for Notifications goes here."); }
pages.pm_reports_proc = function(){ return head("Procurement Reports","Analytics on PR volume and fulfillment times.") + card("Procurement Reports","Content for Procurement Reports goes here."); }
pages.pm_reports_spend = function(){ return head("Spend Analytics","Breakdown of spend by vendor and category.") + card("Spend Analytics","Content for Spend Analytics goes here."); }
pages.pm_reports_export = function(){ return head("Export Data","Export raw procurement data to CSV/Excel.") + card("Export","Content for Export Data goes here."); }

