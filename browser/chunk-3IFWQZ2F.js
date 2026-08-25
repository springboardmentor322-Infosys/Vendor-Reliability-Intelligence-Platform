import{$ as d,Qa as l,W as c,ca as s,fb as f,ia as p,pb as u,xc as m}from"./chunk-EARZ6ID4.js";var i=new WeakMap,h=(()=>{class e{_appRef;_injector=d(p);_environmentInjector=d(s);load(t){let n=this._appRef=this._appRef||this._injector.get(u),o=i.get(n);o||(o={loaders:new Set,refs:[]},i.set(n,o),n.onDestroy(()=>{i.get(n)?.refs.forEach(y=>y.destroy()),i.delete(n)})),o.loaders.has(t)||(o.loaders.add(t),o.refs.push(m(t,{environmentInjector:this._environmentInjector})))}static \u0275fac=function(n){return new(n||e)};static \u0275prov=c({token:e,factory:e.\u0275fac,providedIn:"root"})}return e})();var T=(()=>{class e{static \u0275fac=function(n){return new(n||e)};static \u0275cmp=f({type:e,selectors:[["ng-component"]],exportAs:["cdkVisuallyHidden"],decls:0,vars:0,template:function(n,o){},styles:[`.cdk-visually-hidden {
  border: 0;
  clip: rect(0 0 0 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
  white-space: nowrap;
  outline: 0;
  -webkit-appearance: none;
  -moz-appearance: none;
  left: 0;
}
[dir=rtl] .cdk-visually-hidden {
  left: auto;
  right: 0;
}
`],encapsulation:2,changeDetection:0})}return e})(),r;function v(){if(r===void 0&&(r=null,typeof window<"u")){let e=window;e.trustedTypes!==void 0&&(r=e.trustedTypes.createPolicy("angular#components",{createHTML:a=>a}))}return r}function w(e){return v()?.createHTML(e)||e}function _(e,a,t){let n=t.sanitize(l.HTML,a);e.innerHTML=w(n||"")}export{h as a,T as b,w as c,_ as d};
