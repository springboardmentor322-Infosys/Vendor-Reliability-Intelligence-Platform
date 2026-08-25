import{a as h}from"./chunk-E5RHBGRQ.js";import"./chunk-PGKRKG2L.js";import"./chunk-VYACJYH7.js";import"./chunk-S2SZ2U3X.js";import{j as x,p as g}from"./chunk-THXVBBWZ.js";import{$a as d,Ab as n,Bb as t,Kb as f,Sa as m,Yb as o,_b as c,fb as l,rb as p,sb as s}from"./chunk-EARZ6ID4.js";function u(i,r){if(i&1&&(n(0,"div",0)(1,"div",2)(2,"h1"),o(3,`
Vendor Performance
`),t(),n(4,"p"),o(5,`
Performance analysis and reliability score
`),t()(),n(6,"div",3)(7,"h2"),o(8),t(),n(9,"div",4),o(10),t(),n(11,"p"),o(12,`
Overall Performance Score
`),t()(),n(13,"div",5)(14,"div",6)(15,"h3"),o(16,`
Delivery Score
`),t(),n(17,"p"),o(18),t()(),n(19,"div",6)(20,"h3"),o(21,`
Quality Score
`),t(),n(22,"p"),o(23),t()(),n(24,"div",6)(25,"h3"),o(26,`
Reliability Score
`),t(),n(27,"p"),o(28),t()(),n(29,"div",6)(30,"h3"),o(31,`
Compliance Score
`),t(),n(32,"p"),o(33),t()()()()),i&2){let e=f();m(8),c(`
`,e.performance.vendor_name,`
`),m(2),c(" ",e.performance.overall_score,"% "),m(8),c(`
`,e.performance.delivery_score,`%
`),m(5),c(`
`,e.performance.quality_score,`%
`),m(5),c(`
`,e.performance.reliability_score,`%
`),m(5),c(`
`,e.performance.compliance_score,`%
`)}}function P(i,r){i&1&&(n(0,"div",1),o(1," No performance data found. "),t())}var E=class i{constructor(r,e){this.http=r;this.auth=e}http;auth;performance=null;loading=!0;apiUrl="http://127.0.0.1:8000/performance";vendorApi="http://127.0.0.1:8000/vendors";ngOnInit(){let r=this.auth.currentUser();r?this.loadPerformance(r.email):this.auth.loadProfile().subscribe({next:e=>{this.loadPerformance(e.email)},error:e=>{console.error("Profile Error:",e),this.loading=!1}})}loadPerformance(r){this.http.get(this.vendorApi).subscribe({next:e=>{let a=e.find(v=>v.email===r);console.log("Vendor:",a),a?this.getPerformance(a.vendor_name):this.loading=!1},error:e=>{console.error("Vendor API Error:",e),this.loading=!1}})}getPerformance(r){this.http.get(this.apiUrl).subscribe({next:e=>{console.log("ALL PERFORMANCE:",e),this.performance=e.find(a=>a.vendor_name===r),console.log("MY PERFORMANCE:",this.performance),this.loading=!1},error:e=>{console.error("Performance API Error:",e),this.loading=!1}})}static \u0275fac=function(e){return new(e||i)(d(g),d(h))};static \u0275cmp=l({type:i,selectors:[["app-vendor-performance"]],decls:2,vars:1,consts:[[1,"performance-container"],[1,"empty"],[1,"header"],[1,"main-score"],[1,"score"],[1,"metrics"],[1,"metric-box"]],template:function(e,a){e&1&&p(0,u,34,6,"div",0)(1,P,2,0,"div",1),e&2&&s(a.performance?0:1)},dependencies:[x],styles:[".container[_ngcontent-%COMP%], .performance-container[_ngcontent-%COMP%]{width:95%;max-width:1200px;margin:30px auto}.header[_ngcontent-%COMP%]{margin-bottom:30px}.header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%]{margin:0;font-size:32px;color:#111827;font-weight:700}.header[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{color:#64748b;margin-top:8px}.main-score[_ngcontent-%COMP%]{background:#fff;padding:30px;border-radius:20px;box-shadow:0 8px 25px #00000014;display:flex;justify-content:space-between;align-items:center;margin-bottom:30px}.main-score[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{margin:0;color:#111827;font-size:24px}.score[_ngcontent-%COMP%]{background:#dcfce7;color:#166534;padding:12px 22px;border-radius:30px;font-size:22px;font-weight:700}.main-score[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{color:#64748b;margin-left:20px}.metrics[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:25px}.metric-box[_ngcontent-%COMP%]{background:#fff;padding:25px;border-radius:16px;text-align:center;box-shadow:0 8px 20px #00000014}.metric-box[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%]{margin:0;color:#475569;font-size:16px}.metric-box[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin-top:15px;font-size:32px;font-weight:700;color:#111827}.empty[_ngcontent-%COMP%]{margin-top:40px;text-align:center;padding:40px;background:#fff;border-radius:18px;color:#64748b;font-size:18px}@media(max-width:768px){.main-score[_ngcontent-%COMP%]{flex-direction:column;align-items:flex-start;gap:15px}.metrics[_ngcontent-%COMP%]{grid-template-columns:1fr}}"]})};export{E as VendorPerformanceComponent};
