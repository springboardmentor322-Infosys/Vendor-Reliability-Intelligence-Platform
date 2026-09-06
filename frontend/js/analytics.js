let analyticsCharts={};

function analyticsMoney(v){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v)||0)}
function destroyAnalyticsCharts(){Object.values(analyticsCharts).forEach(c=>{try{c.destroy()}catch(e){}});analyticsCharts={}}
function makeKpi(label,value,icon){return `<div class="analytics-kpi"><i class="${icon}"></i><span>${label}</span><strong>${value}</strong></div>`}
function chart(id,type,labels,data,label){const canvas=document.getElementById(id);if(!canvas)return;analyticsCharts[id]=new Chart(canvas,{type,data:{labels,datasets:[{label,data,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}})}

async function loadAnalytics(){
 const start=document.getElementById("analyticsStart")?.value||"";
 const end=document.getElementById("analyticsEnd")?.value||"";
 try{
  const data=await getAnalyticsOverview(start,end); const s=data.summary||{};
  document.getElementById("analyticsKpis").innerHTML=[
   makeKpi("Average reliability",`${s.average_reliability||0}%`,"fa-solid fa-shield-heart"),
   makeKpi("Average compliance",`${s.average_compliance||0}%`,"fa-solid fa-circle-check"),
   makeKpi("Procurement value",analyticsMoney(s.procurement_value),"fa-solid fa-indian-rupee-sign"),
   makeKpi("On-time delivery",`${s.on_time_rate||0}%`,"fa-solid fa-truck-fast"),
   makeKpi("Invoice value",analyticsMoney(s.invoice_value),"fa-solid fa-file-invoice-dollar"),
   makeKpi("Average quality",`${s.average_quality||0}%`,"fa-solid fa-clipboard-check")
  ].join("");
  destroyAnalyticsCharts();
  const months=data.monthly_procurement||[];
  chart("procurementTrendAnalytics","line",months.map(x=>x.period),months.map(x=>x.value),"Procurement value");
  chart("vendorCategoryAnalytics","doughnut",(data.vendor_categories||[]).map(x=>x.category),(data.vendor_categories||[]).map(x=>x.count),"Vendors");
  chart("deliveryStatusAnalytics","bar",(data.delivery_status||[]).map(x=>x.status),(data.delivery_status||[]).map(x=>x.count),"Deliveries");
  chart("paymentStatusAnalytics","doughnut",(data.payment_status||[]).map(x=>x.status),(data.payment_status||[]).map(x=>x.count),"Invoices");
  const vendors=data.top_vendors||[]; const cv=document.getElementById("topVendorsAnalytics");
  if(cv) analyticsCharts.top=new Chart(cv,{type:"bar",data:{labels:vendors.map(x=>x.vendor_name),datasets:[{label:"Reliability",data:vendors.map(x=>x.reliability_score)},{label:"Compliance",data:vendors.map(x=>x.compliance_score)}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100}}}});
  const insights=[];
  insights.push(["Delivery risk",`${s.delayed_deliveries||0} delayed deliveries are recorded for the selected period.`]);
  insights.push(["Payment exposure",`${s.pending_invoices||0} pending and ${s.overdue_invoices||0} overdue invoices require attention.`]);
  insights.push(["Quality signal",`${s.failed_inspections||0} inspections failed, with an average quality score of ${s.average_quality||0}%.`]);
  insights.push(["Supplier health",`${s.active_vendors||0} active vendors are currently registered, with average reliability of ${s.average_reliability||0}%.`]);
  document.getElementById("analyticsInsights").innerHTML=insights.map(x=>`<div class="insight"><strong>${x[0]}</strong><span>${x[1]}</span></div>`).join("");
 }catch(e){console.error("Analytics load failed",e); document.getElementById("analyticsInsights").innerHTML='<div class="insight"><strong>Analytics unavailable</strong><span>Unable to load analytics data. Check the API server and permissions.</span></div>'}
}

document.addEventListener("DOMContentLoaded",async()=>{await getCurrentUser();loadAnalytics();document.getElementById("applyAnalytics")?.addEventListener("click",loadAnalytics);document.getElementById("resetAnalytics")?.addEventListener("click",()=>{document.getElementById("analyticsStart").value="";document.getElementById("analyticsEnd").value="";loadAnalytics()})});
