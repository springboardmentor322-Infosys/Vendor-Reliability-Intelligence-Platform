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
    groups:[{label:"Main", items:[
      {id:"dashboard", label:"Dashboard"},
      {id:"requests", label:"Procurement Requests"},
      {id:"pos", label:"Purchase Orders"},
      {id:"vendors", label:"Vendor Assignment"},
      {id:"contracts", label:"Contracts"},
      {id:"invoices", label:"Invoices"},
      {id:"communication", label:"Communication"},
      {id:"reports", label:"Reports"},
      {id:"notifications", label:"Notifications"}
    ]}]
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
    groups:[{label:"Main", items:[
      {id:"dashboard", label:"Dashboard"},
      {id:"profile", label:"Vendor Profile"},
      {id:"pos", label:"Purchase Orders"},
      {id:"contracts", label:"Contracts & Compliance"},
      {id:"invoices", label:"Invoices & Payments"},
      {id:"communication", label:"Communication"},
      {id:"documents", label:"Documents"},
      {id:"notifications", label:"Notifications"}
    ]}]
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
  if(currentRole==='vendor'){
    const v = vendors[0];
    return head("Vendor Dashboard","Welcome back, "+v.contact+". Here's how "+v.name+" is performing.") +
    `<div class="kpi-row">
      ${kpi("Reliability Score", v.score+"/100", "High reliability band","up")}
      ${kpi("Total Purchase Orders","28","This year","up")}
      ${kpi("On-Time Delivery",v.onTime+"%","vs last 90 days","up")}
      ${kpi("Quality Rating",v.quality+"/5","vs last 90 days","up")}
      ${kpi("Pending Payments","$32,450","2 invoices","down")}
    </div>
    <div class="grid-2">
      ${card("Overall Reliability Score", `<div class="gauge-wrap">${gaugeSvg(v.score)}<div class="gauge-label">Based on delivery, quality, communication & compliance</div></div>`)}
      ${card("Performance Summary (last 90 days)", `${bar("On-Time Deliveries",25,30)}${bar("Delayed Deliveries",2,30)}${bar("Quality Score (/5)",4.6,5)}${bar("Order Completion Rate",96,100)}`)}
    </div>
    <div class="grid-2">
      ${card("Recent Purchase Orders", tableHtml(["PO Number","Item","Status","Delivery"], purchaseOrders.filter(p=>p.vendor==='TechBuild Solutions').slice(0,5).map(p=>[p.id,p.item,badgeFor(p.status),p.delivery])), "View all")}
      ${card("Important Documents", ["Business License","Tax Certificate","Insurance Certificate","ISO 9001 Certification"].map(d=>`<div class="doc-row"><span>${d}</span><span class="meta">Download</span></div>`).join(""))}
    </div>`;
  }
  if(currentRole==='admin'){
    return head("Admin Dashboard","Organization-wide snapshot across vendors, procurement and compliance.") +
    `<div class="kpi-row">
      ${kpi("Total Users","248","+12.5% vs last 30 days","up")}
      ${kpi("Total Vendors","156","+8.3% vs last 30 days","up")}
      ${kpi("Total Purchase Orders","1,248","+15.7% vs last 30 days","up")}
      ${kpi("Total Spend","$2.48M","+18.6% vs last 30 days","up")}
      ${kpi("Compliance Score","92%","+5.3% vs last 30 days","up")}
    </div>
    <div class="grid-2">
      ${card("Vendor Reliability Distribution", legendDist())}
      ${card("Top 5 Vendors by Reliability Score", tableHtml(["Vendor","Category","Score"], vendors.slice(0,5).map(v=>[v.name,v.cat,v.score])),"View all vendors")}
    </div>
    <div class="grid-3">
      ${card("Contract Alerts", `<div class="legend"><div class="row"><span class="name"><span class="dot amber"></span>Expiring soon</span><b>8</b></div><div class="row"><span class="name"><span class="dot red"></span>Expired</span><b>5</b></div><div class="row"><span class="name"><span class="dot slate"></span>Pending renewal</span><b>12</b></div></div>`)}
      ${card("Compliance Overview", `<div class="legend"><div class="row"><span class="name"><span class="dot green"></span>Compliant</span><b>85 (76%)</b></div><div class="row"><span class="name"><span class="dot amber"></span>At risk</span><b>18 (16%)</b></div><div class="row"><span class="name"><span class="dot red"></span>Non-compliant</span><b>9 (8%)</b></div></div>`)}
      ${card("System Health", ["Backend Services","Database","Storage","Email Service","API Gateway"].map(s=>`<div class="doc-row"><span>${s}</span>${badgeFor("Active")}</div>`).join(""))}
    </div>
    ${card("Recent System Activity", `<div class="timeline">${auditLogs.slice(0,5).map(a=>`<div class="tl-item"><span class="tdot"></span><div><div>${a.action}</div><div class="t">${a.t} · ${a.who}</div></div></div>`).join("")}</div>`)}`;
  }
  if(currentRole==='pm'){
    return head("Procurement Dashboard","Your active buying cycle at a glance.") +
    `<div class="kpi-row">
      ${kpi("Active Purchase Orders","28","This month","up")}
      ${kpi("Pending Approvals","5","Needs your review","down")}
      ${kpi("Total Spend (MTD)","$362K","+9% vs last month","up")}
      ${kpi("Vendors Assigned","34","Across open POs","up")}
    </div>
    <div class="grid-2">
      ${card("Purchase Orders by Status", `${bar("Delivered",3,8)}${bar("In Transit",2,8)}${bar("Approved",1,8)}${bar("Pending",2,8)}`)}
      ${card("Recent Purchase Orders", tableHtml(["PO Number","Vendor","Status"], purchaseOrders.slice(0,5).map(p=>[p.id,p.vendor,badgeFor(p.status)])),"View all")}
    </div>
    ${card("Contract Renewals Due", tableHtml(["Contract","Vendor","Expiry","Status"], contracts.slice(0,4).map(c=>[c.id,c.vendor,c.expiry,badgeFor(c.status)])))}`;
  }
  if(currentRole==='scm'){
    return head("Supply Chain Dashboard","Vendor reliability and risk overview.") +
    `<div class="kpi-row">
      ${kpi("Avg Reliability Score","78/100","+3.1 vs last quarter","up")}
      ${kpi("Vendors at Risk","23","High + Medium risk","down")}
      ${kpi("On-Time Delivery Rate","92.6%","+1.2% vs last quarter","up")}
      ${kpi("Avg Issue Resolution","1.8 days","-0.3 days","up")}
    </div>
    <div class="grid-2">
      ${card("Reliability Distribution", legendDist())}
      ${card("Vendors Requiring Attention", tableHtml(["Vendor","Score","Risk"], vendors.filter(v=>v.risk!=='Low').map(v=>[v.name,v.score,badgeFor(v.risk)])),"View all")}
    </div>
    ${card("Performance Trend (6 months)", trendSvg())}`;
  }
  if(currentRole==='finance'){
    return head("Finance Dashboard","Invoices, payments and vendor cost overview.") +
    `<div class="kpi-row">
      ${kpi("Total Invoiced (YTD)","$1.86M","+11% vs last year","up")}
      ${kpi("Pending Payments","$74,750","4 invoices","down")}
      ${kpi("Overdue Invoices","1","$42,300","down")}
      ${kpi("Avg Payment Cycle","18 days","-2 days","up")}
    </div>
    ${card("Invoices Awaiting Action", tableHtml(["Invoice","Vendor","Amount","Status"], invoices.map(i=>[i.id,i.vendor,i.amount,badgeFor(i.status)])),"View all invoices")}`;
  }
  if(currentRole==='auditor'){
    return head("Audit Dashboard","Read-only compliance and activity oversight.") +
    `<div class="kpi-row">
      ${kpi("Compliance Score","92%","Organization-wide","up")}
      ${kpi("Non-Compliant Vendors","9","8% of total","down")}
      ${kpi("Contracts Expired","5","Needs renewal or exit","down")}
      ${kpi("Audit Events (7d)","142","Logged actions","up")}
    </div>
    <div class="grid-2">
      ${card("Compliance Overview", `<div class="legend"><div class="row"><span class="name"><span class="dot green"></span>Compliant</span><b>85 (76%)</b></div><div class="row"><span class="name"><span class="dot amber"></span>At risk</span><b>18 (16%)</b></div><div class="row"><span class="name"><span class="dot red"></span>Non-compliant</span><b>9 (8%)</b></div></div>`)}
      ${card("Recent Audit Log Entries", `<div class="timeline">${auditLogs.slice(0,5).map(a=>`<div class="tl-item"><span class="tdot"></span><div><div>${a.action}</div><div class="t">${a.t} · ${a.who}</div></div></div>`).join("")}</div>`,"View full log")}
    </div>`;
  }
};

export function legendDist(){
  const bands = [["Excellent (80-100)",45,"green"],["Good (60-79)",58,"teal"],["Average (40-59)",32,"amber"],["Poor (20-39)",15,"red"],["Critical (0-19)",6,"red"]];
  return `<div class="legend">${bands.map(b=>`<div class="row"><span class="name"><span class="dot ${b[2]}"></span>${b[0]}</span><b>${b[1]}</b></div>`).join("")}</div>`;
}
export function trendSvg(){
  return `<svg width="100%" height="120" viewBox="0 0 560 120" preserveAspectRatio="none">
    <polyline points="0,70 90,60 180,66 270,45 360,50 450,32 540,26" fill="none" stroke="#0E7C7B" stroke-width="2.5"/>
    <polyline points="0,90 90,82 180,88 270,70 360,74 450,58 540,54" fill="none" stroke="#B9762C" stroke-width="2.5"/>
  </svg><div class="legend" style="flex-direction:row;gap:18px;margin-top:6px;"><span class="name"><span class="dot teal"></span>On-time delivery</span><span class="name"><span class="dot amber"></span>Reliability score</span></div>`;
}
export function tableHtml(cols, rows){
  return `<table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr class="clickrow">${r.map((c,i)=>`<td class="${i===0?'idcell':''}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

pages.vendors = function(){
  return head("Vendor Management","Registered vendor profiles, categories and approval status.", `<button class="btn-sm">Filter</button><button class="btn-sm solid">+ Register Vendor</button>`) +
  card("All Vendors", tableHtml(["Vendor ID","Name","Category","Reliability Score","Risk","Since"], vendors.map(v=>[v.id,v.name,v.cat,v.score,badgeFor(v.risk),v.since])));
};
pages.profile = function(){
  const v = vendors[0];
  return head("Vendor Profile","Your organization's profile as seen by procurement.", `<button class="btn-sm solid">Edit Profile</button>`) +
  `<div class="grid-2">
    ${card("Company Details", `<div class="legend">
      <div class="row"><span class="name">Vendor ID</span><b class="mono">${v.id}</b></div>
      <div class="row"><span class="name">Category</span><b>${v.cat}</b></div>
      <div class="row"><span class="name">Vendor Since</span><b>${v.since}</b></div>
      <div class="row"><span class="name">Primary Contact</span><b>${v.contact}</b></div>
      <div class="row"><span class="name">Contact Email</span><b>${v.email}</b></div>
      <div class="row"><span class="name">Contact Phone</span><b>${v.phone}</b></div>
    </div>`)}
    ${card("Reliability Snapshot", `<div class="gauge-wrap">${gaugeSvg(v.score)}<div class="gauge-label">${v.band} · ${v.risk} risk</div></div>`)}
  </div>
  ${card("Verification Status", `<div class="doc-row"><span>Verified Vendor</span>${badgeFor("Active")}</div><div class="doc-row"><span>Business License</span>${badgeFor("Compliant")}</div><div class="doc-row"><span>Insurance Certificate</span><span class="badge amber">Renewal due</span></div>`)}`;
};
pages.vendorDetail = function(v){
  return head(v.name, v.id+" · "+v.cat, `<button class="btn-sm">Message</button><button class="btn-sm solid">Edit</button>`) +
  `<div class="grid-2">
    ${card("Contact & Account", `<div class="legend">
      <div class="row"><span class="name">Contact</span><b>${v.contact}</b></div>
      <div class="row"><span class="name">Email</span><b>${v.email}</b></div>
      <div class="row"><span class="name">Phone</span><b>${v.phone}</b></div>
      <div class="row"><span class="name">Vendor Since</span><b>${v.since}</b></div>
      <div class="row"><span class="name">Risk Level</span>${badgeFor(v.risk)}</div>
    </div>`)}
    ${card("Reliability Score", `<div class="gauge-wrap">${gaugeSvg(v.score)}<div class="gauge-label">${v.band}</div></div>`)}
  </div>
  ${card("Purchase Order History", tableHtml(["PO Number","Item","Amount","Status"], purchaseOrders.filter(p=>p.vendor===v.name).map(p=>[p.id,p.item,p.amount,badgeFor(p.status)])))}`;
};

pages.procurement = pages.requests = function(){
  return head(currentPage==='requests'?"Procurement Requests":"Procurement Overview","Requests moving through the approval pipeline.", `<button class="btn-sm solid">+ New Request</button>`) +
  `<div class="kpi-row">${kpi("Open Requests","14","Awaiting approval","down")}${kpi("Approved (7d)","22","+4 vs last week","up")}${kpi("Avg Approval Time","19 hrs","Within SLA","up")}</div>` +
  card("Requests", tableHtml(["Request ID","Requested Item","Department","Status"], [
    ["REQ-2024-441","Server Racks (x4)","IT",badgeFor("Pending")],
    ["REQ-2024-440","Site Safety Gear","Operations",badgeFor("Approved")],
    ["REQ-2024-439","Diesel Generators","Facilities",badgeFor("Pending")],
    ["REQ-2024-438","Office Furniture","Admin",badgeFor("Ordered")]
  ]));
};
pages.pos = function(){
  return head("Purchase Orders","Track every order from creation to delivery.", `<button class="btn-sm">Export</button><button class="btn-sm solid">+ Create PO</button>`) +
  card("Purchase Order List", tableHtml(["PO Number","Vendor","Item / Service","Amount","Status","Delivery Date"], purchaseOrders.map(p=>[p.id,p.vendor,p.item,p.amount,badgeFor(p.status),p.delivery])));
};
pages.contracts = function(){
  return head(currentRole==='auditor'?"Contract Compliance":"Contracts & Compliance","Repository, renewal tracking and certification status.", currentRole!=='auditor'?`<button class="btn-sm solid">+ Add Contract</button>`:"") +
  card("Contracts", tableHtml(["Contract ID","Vendor","Type","Status","Expiry Date"], contracts.map(c=>[c.id,c.vendor,c.type,badgeFor(c.status),c.expiry])));
};
pages.compliance = function(){
  return head("Compliance Monitoring","Organization-wide compliance posture across active vendors.") +
  `<div class="grid-2">
    ${card("Compliance Overview", `<div class="legend"><div class="row"><span class="name"><span class="dot green"></span>Compliant</span><b>85 (76%)</b></div><div class="row"><span class="name"><span class="dot amber"></span>At risk</span><b>18 (16%)</b></div><div class="row"><span class="name"><span class="dot red"></span>Non-compliant</span><b>9 (8%)</b></div></div>`)}
    ${card("Certifications Nearing Expiry", tableHtml(["Vendor","Certification","Expiry"], [["TechBuild Solutions","ISO 9001","20 Mar 2025"],["Global Steel Corp","ISO 14001","02 Feb 2025"],["Coastal Freight Ltd","Transport License","11 Jun 2024"]]))}
  </div>`;
};
pages.invoices = function(){
  return head(currentRole==='vendor'?"Invoices & Payments":"Invoices & Payments","Invoice status and payment schedules.", currentRole!=='vendor'&&currentRole!=='auditor'?`<button class="btn-sm solid">+ Record Invoice</button>`:"") +
  card("Invoices", tableHtml(["Invoice ID","Vendor","Amount","Status","Due Date"], invoices.map(i=>[i.id,i.vendor,i.amount,badgeFor(i.status),i.due])));
};
pages.payhistory = function(){
  return head("Vendor Payment History","Historical payments grouped by vendor.") +
  card("Payment History", tableHtml(["Vendor","Total Paid (YTD)","Last Payment","On-Time Rate"], [
    ["Global Steel Corp","$612,400","01 Jun 2024","98%"],
    ["TechBuild Solutions","$248,760","24 May 2024","94%"],
    ["QuickLogistics","$186,200","—","81%"],
    ["BuildRight Services","$142,900","18 May 2024","96%"]
  ]));
};
pages.communication = function(){
  return head("Communication","Direct messaging and file sharing with vendors.") +
  `<div class="grid-2">
    ${card("Conversation — TechBuild Solutions", `<div class="msg-thread">
      <div class="msg in"><div class="who">TechBuild Solutions · 2h ago</div>PO-2024-0987 has shipped, ETA 18 May.</div>
      <div class="msg out"><div class="who">You · 1h ago</div>Noted — please share the carrier tracking number.</div>
      <div class="msg in"><div class="who">TechBuild Solutions · 40m ago</div>Tracking: 1Z999AA10123456784</div>
    </div>`)}
    ${card("Recent Threads", ["Global Steel Corp","QuickLogistics","BuildRight Services","OneFix Maintenance"].map(n=>`<div class="doc-row"><span>${n}</span><span class="meta">View</span></div>`).join(""))}
  </div>`;
};
pages.performance = function(){
  return head(currentRole==='scm'?"Vendor Performance":"Performance Analytics","Delivery, quality and responsiveness metrics per vendor.") +
  `<div class="grid-2">
    ${card("Performance Summary", `${bar("On-Time Deliveries",25,30)}${bar("Delayed Deliveries",2,30)}${bar("Quality Score (/5)",4.6,5)}${bar("Response Time (hrs)",12,24)}${bar("Order Completion Rate",96,100)}`)}
    ${card("Performance Trend (6 months)", trendSvg())}
  </div>
  ${card("Vendor Performance Table", tableHtml(["Vendor","On-Time %","Quality","Response Time"], vendors.map(v=>[v.name,v.onTime+"%",v.quality+"/5",Math.round(24-v.score/6)+" hrs"])))}`;
};
pages.reliability = function(){
  return head("Reliability Scoring","Composite score from delivery, quality, compliance and communication data.") +
  `<div class="grid-2">
    ${card("Score Distribution", legendDist())}
    ${card("Reliability Factors (org average)", `${bar("Delivery History",84,100)}${bar("Product Quality",81,100)}${bar("Communication Efficiency",76,100)}${bar("Contract Compliance",88,100)}${bar("Issue Resolution",73,100)}`)}
  </div>
  ${card("Vendor Ranking", tableHtml(["Rank","Vendor","Score","Risk Level"], vendors.slice().sort((a,b)=>b.score-a.score).map((v,i)=>[i+1,v.name,v.score,badgeFor(v.risk)])))}`;
};
pages.delivery = function(){
  return head("Delivery Tracking","In-flight and recent delivery status across all open purchase orders.") +
  card("Deliveries", tableHtml(["PO Number","Vendor","Item","Status","Expected"], purchaseOrders.map(p=>[p.id,p.vendor,p.item,badgeFor(p.status),p.delivery])));
};
pages.risk = function(){
  return head("Risk Assessment","Vendors flagged by procurement risk level.") +
  card("Vendors by Risk Level", tableHtml(["Vendor","Category","Score","Risk Level"], vendors.filter(v=>v.risk!=='Low').map(v=>[v.name,v.cat,v.score,badgeFor(v.risk)])));
};
pages.users = function(){
  return head("User Management","Organization accounts and their assigned roles.", `<button class="btn-sm solid">+ Invite User</button>`) +
  card("Users", tableHtml(["Name","Email","Role","Status"], users.map(u=>[u.name,u.email,u.role,badgeFor(u.status)])));
};
pages["roles-perms"] = function(){
  return head("Roles & Permissions","Control what each role can see and do across VendorIQ.") +
  Object.keys(roles).map(k=>card(roles[k].label, roles[k].groups.flatMap(g=>g.items).map(it=>`<div class="toggle-row"><span>${it.label}</span><div class="toggle on"></div></div>`).join(""))).join("");
};
pages.settings = function(){
  return head("System Settings","Platform-wide configuration.") +
  `<div class="grid-2">
    ${card("General", `<div class="toggle-row"><span>Two-factor authentication required</span><div class="toggle on"></div></div><div class="toggle-row"><span>Auto-approve vendors above 80 score</span><div class="toggle"></div></div><div class="toggle-row"><span>Email notifications</span><div class="toggle on"></div></div><div class="toggle-row"><span>SMS notifications</span><div class="toggle"></div></div>`)}
    ${card("Data & Backup", `<div class="doc-row"><span>Last automated backup</span><span class="meta">Today, 02:00</span></div><div class="doc-row"><span>Backup frequency</span><span class="meta">Daily</span></div><div class="doc-row"><span>Data retention</span><span class="meta">36 months</span></div>`)}
  </div>`;
};
pages.audit = function(){
  return head("Audit Logs","System-wide activity trail across all roles.", `<button class="btn-sm">Export CSV</button>`) +
  card("Activity", `<div class="timeline">${auditLogs.map(a=>`<div class="tl-item"><span class="tdot"></span><div><div>${a.action}</div><div class="t">${a.t} · ${a.who}</div></div></div>`).join("")}</div>`);
};
pages.reports = function(){
  return head("Reports & Exports","Generate and download procurement, vendor and compliance reports.") +
  `<div class="grid-3">
    ${card("Vendor Performance Report", `<p style="font-size:12.5px;color:var(--slate);margin:0 0 14px;">Delivery, quality and response metrics per vendor.</p><button class="btn-sm solid">Generate PDF</button>`)}
    ${card("Procurement Spend Report", `<p style="font-size:12.5px;color:var(--slate);margin:0 0 14px;">Spend breakdown by vendor and category.</p><button class="btn-sm solid">Generate Excel</button>`)}
    ${card("Compliance Report", `<p style="font-size:12.5px;color:var(--slate);margin:0 0 14px;">Certification and contract compliance status.</p><button class="btn-sm solid">Generate PDF</button>`)}
  </div>
  ${card("Scheduled Reports", tableHtml(["Report","Frequency","Last Sent"], [["Weekly Procurement Summary","Weekly","27 May 2024"],["Monthly Compliance Digest","Monthly","01 May 2024"]]))}`;
};
pages.notifications = function(){
  return head("Notifications","Alerts across vendor approvals, deliveries, contracts and compliance.") +
  card("All Notifications", `<div class="timeline">
    <div class="tl-item"><span class="tdot"></span><div><div>Your invoice INV-2024-087 has been approved</div><div class="t">2 hours ago</div></div></div>
    <div class="tl-item"><span class="tdot"></span><div><div>PO-2024-0987 status updated to In Transit</div><div class="t">5 hours ago</div></div></div>
    <div class="tl-item"><span class="tdot"></span><div><div>New message from Procurement Manager</div><div class="t">1 day ago</div></div></div>
    <div class="tl-item"><span class="tdot"></span><div><div>Contract CT-2024-0456 is expiring in 15 days</div><div class="t">1 day ago</div></div></div>
    <div class="tl-item"><span class="tdot"></span><div><div>Insurance document is due for update</div><div class="t">2 days ago</div></div></div>
  </div>`);
};
pages.documents = function(){
  return head("Documents","Certifications and files shared with procurement.", `<button class="btn-sm solid">+ Upload Document</button>`) +
  card("Your Documents", [
    ["Business License","Uploaded 10 Jan 2024"],["Tax Certificate","Uploaded 10 Jan 2024"],
    ["Insurance Certificate","Uploaded 15 Feb 2024"],["Quality Certification (ISO 9001)","Uploaded 20 Mar 2024"]
  ].map(d=>`<div class="doc-row"><span>${d[0]}</span><span class="meta">${d[1]} · Download</span></div>`).join(""));
};

export function renderPage(){
  document.getElementById('crumb-page').textContent = pageLabel(currentPage);
  const fn = pages[currentPage] || pages.dashboard;
  document.getElementById('page-content').innerHTML = fn();
}
