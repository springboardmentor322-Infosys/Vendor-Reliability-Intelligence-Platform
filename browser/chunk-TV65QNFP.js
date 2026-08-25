import{a as Le,c as Qe,e as Ue,f as We,g as Ge}from"./chunk-LCCUKZOT.js";import"./chunk-O4BU4GID.js";import"./chunk-E5GQQQ64.js";import{a as je,b as S,c as Ne,e as de}from"./chunk-REFPUVTO.js";import"./chunk-AKGHKATS.js";import{a as De}from"./chunk-E5RHBGRQ.js";import{b as Ee,e as Ie,f as Be,h as Fe,s as Ae,u as ze,v as Ve}from"./chunk-DT3B3RYI.js";import{a as Te,b as se,d as Re}from"./chunk-TEB7QHQA.js";import{a as ae,d as x}from"./chunk-PD7Y6TVI.js";import{a as O}from"./chunk-GTY5UYYM.js";import"./chunk-5TBMSXPR.js";import{a as Oe,b as Se}from"./chunk-XVPOST5U.js";import"./chunk-PGKRKG2L.js";import{b as Ce,c as xe,d as Me,e as ke}from"./chunk-VYACJYH7.js";import"./chunk-3IFWQZ2F.js";import{a as Pe,b as H}from"./chunk-2CLO73BY.js";import"./chunk-S2SZ2U3X.js";import"./chunk-THXVBBWZ.js";import{$ as o,$a as Q,D as he,E as fe,F as J,Gb as R,Ib as k,Kb as C,Lb as g,Mb as m,Nb as A,O as X,Ob as ie,Pb as _,Q as h,Qb as b,Sa as p,Vb as W,Wb as f,X as z,Xa as te,Xb as ye,Yb as c,Z as Y,Zb as D,_a as _e,ea as T,ec as P,fa as I,fb as u,gb as U,h as v,hb as be,ia as ee,ja as V,jb as F,ma as j,na as N,qb as ne,r as K,ra as B,rb as w,rc as G,sb as y,ub as ve,vb as we,wa as L,wb as re,xb as i,y as ue,ya as M,yb as a,z as E,za as ge,zb as oe}from"./chunk-EARZ6ID4.js";var $=["*"],Ye=["content"],et=[[["mat-drawer"]],[["mat-drawer-content"]],"*"],tt=["mat-drawer","mat-drawer-content","*"];function nt(r,s){if(r&1){let e=R();i(0,"div",1),k("click",function(){T(e);let n=C();return I(n._onBackdropClicked())}),a()}if(r&2){let e=C();f("mat-drawer-shown",e._isShowingBackdrop())}}function rt(r,s){r&1&&(i(0,"mat-drawer-content"),m(1,2),a())}var ot=[[["mat-sidenav"]],[["mat-sidenav-content"]],"*"],it=["mat-sidenav","mat-sidenav-content","*"];function at(r,s){if(r&1){let e=R();i(0,"div",1),k("click",function(){T(e);let n=C();return I(n._onBackdropClicked())}),a()}if(r&2){let e=C();f("mat-drawer-shown",e._isShowingBackdrop())}}function st(r,s){r&1&&(i(0,"mat-sidenav-content"),m(1,2),a())}var dt=`.mat-drawer-container {
  position: relative;
  z-index: 1;
  color: var(--mat-sidenav-content-text-color, var(--mat-sys-on-background));
  background-color: var(--mat-sidenav-content-background-color, var(--mat-sys-background));
  box-sizing: border-box;
  display: block;
  overflow: hidden;
}
.mat-drawer-container[fullscreen] {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
}
.mat-drawer-container[fullscreen].mat-drawer-container-has-open {
  overflow: hidden;
}
.mat-drawer-container.mat-drawer-container-explicit-backdrop .mat-drawer-side {
  z-index: 3;
}
.mat-drawer-container.ng-animate-disabled .mat-drawer-backdrop,
.mat-drawer-container.ng-animate-disabled .mat-drawer-content, .ng-animate-disabled .mat-drawer-container .mat-drawer-backdrop,
.ng-animate-disabled .mat-drawer-container .mat-drawer-content {
  transition: none;
}

.mat-drawer-backdrop {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  z-index: 3;
  visibility: hidden;
}
.mat-drawer-backdrop.mat-drawer-shown {
  visibility: visible;
  background-color: var(--mat-sidenav-scrim-color, color-mix(in srgb, var(--mat-sys-neutral-variant20) 40%, transparent));
}
.mat-drawer-transition .mat-drawer-backdrop {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: background-color, visibility;
}
@media (forced-colors: active) {
  .mat-drawer-backdrop {
    opacity: 0.5;
  }
}

.mat-drawer-content {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  overflow: auto;
}
.mat-drawer-content.mat-drawer-content-hidden {
  opacity: 0;
}
.mat-drawer-transition .mat-drawer-content {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: transform, margin-left, margin-right;
}

.mat-drawer {
  position: relative;
  z-index: 4;
  color: var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant));
  box-shadow: var(--mat-sidenav-container-elevation-shadow, none);
  background-color: var(--mat-sidenav-container-background-color, var(--mat-sys-surface));
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  width: var(--mat-sidenav-container-width, 360px);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  outline: 0;
  box-sizing: border-box;
  overflow-y: auto;
  transform: translate3d(-100%, 0, 0);
}
@media (forced-colors: active) {
  .mat-drawer, [dir=rtl] .mat-drawer.mat-drawer-end {
    border-right: solid 1px currentColor;
  }
}
@media (forced-colors: active) {
  [dir=rtl] .mat-drawer, .mat-drawer.mat-drawer-end {
    border-left: solid 1px currentColor;
    border-right: none;
  }
}
.mat-drawer.mat-drawer-side {
  z-index: 2;
}
.mat-drawer.mat-drawer-end {
  right: 0;
  transform: translate3d(100%, 0, 0);
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[dir=rtl] .mat-drawer {
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  transform: translate3d(100%, 0, 0);
}
[dir=rtl] .mat-drawer.mat-drawer-end {
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 0;
  right: auto;
  transform: translate3d(-100%, 0, 0);
}
.mat-drawer-transition .mat-drawer {
  transition: transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) {
  visibility: hidden;
  box-shadow: none;
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) .mat-drawer-inner-container {
  display: none;
}
.mat-drawer.mat-drawer-opened.mat-drawer-opened {
  transform: none;
}

.mat-drawer-side {
  box-shadow: none;
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
}
.mat-drawer-side.mat-drawer-end {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side.mat-drawer-end {
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
  border-left: none;
}

.mat-drawer-inner-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.mat-sidenav-fixed {
  position: fixed;
}
`;var ct=new Y("MAT_DRAWER_DEFAULT_AUTOSIZE",{providedIn:"root",factory:()=>!1}),me=new Y("MAT_DRAWER_CONTAINER"),Z=(()=>{class r extends S{_platform=o(O);_changeDetectorRef=o(G);_container=o(le);constructor(){let e=o(M),t=o(je),n=o(N);super(e,t,n)}ngAfterContentInit(){this._container._contentMarginChanges.subscribe(()=>{this._changeDetectorRef.markForCheck()})}_shouldBeHidden(){if(this._platform.isBrowser)return!1;let{start:e,end:t}=this._container;return e!=null&&e.mode!=="over"&&e.opened||t!=null&&t.mode!=="over"&&t.opened}static \u0275fac=function(t){return new(t||r)};static \u0275cmp=u({type:r,selectors:[["mat-drawer-content"]],hostAttrs:[1,"mat-drawer-content"],hostVars:6,hostBindings:function(t,n){t&2&&(W("margin-left",n._container._contentMargins.left,"px")("margin-right",n._container._contentMargins.right,"px"),f("mat-drawer-content-hidden",n._shouldBeHidden()))},features:[P([{provide:S,useExisting:r}]),F],ngContentSelectors:$,decls:1,vars:0,template:function(t,n){t&1&&(g(),m(0))},encapsulation:2,changeDetection:0})}return r})(),ce=(()=>{class r{_elementRef=o(M);_focusTrapFactory=o(Be);_focusMonitor=o(Ee);_platform=o(O);_ngZone=o(N);_renderer=o(_e);_interactivityChecker=o(Ie);_doc=o(V);_container=o(me,{optional:!0});_focusTrap=null;_elementFocusedBeforeDrawerWasOpened=null;_eventCleanups;_isAttached=!1;_anchor=null;get position(){return this._position}set position(e){e=e==="end"?"end":"start",e!==this._position&&(this._isAttached&&this._updatePositionInParent(e),this._position=e,this.onPositionChanged.emit())}_position="start";get mode(){return this._mode}set mode(e){this._mode=e,this._updateFocusTrapState(),this._modeChanged.next()}_mode="over";get disableClose(){return this._disableClose}set disableClose(e){this._disableClose=x(e)}_disableClose=!1;get autoFocus(){let e=this._autoFocus;return e??(this.mode==="side"?"dialog":"first-tabbable")}set autoFocus(e){(e==="true"||e==="false"||e==null)&&(e=x(e)),this._autoFocus=e}_autoFocus;get opened(){return this._opened()}set opened(e){this.toggle(x(e))}_opened=B(!1);_openedVia=null;_animationStarted=new v;_animationEnd=new v;openedChange=new j(!0);_openedStream=this.openedChange.pipe(E(e=>e),K(()=>{}));openedStart=this._animationStarted.pipe(E(()=>this.opened),J(void 0));_closedStream=this.openedChange.pipe(E(e=>!e),K(()=>{}));closedStart=this._animationStarted.pipe(E(()=>!this.opened),J(void 0));_destroyed=new v;onPositionChanged=new j;_content;_modeChanged=new v;_injector=o(ee);_changeDetectorRef=o(G);constructor(){this.openedChange.pipe(h(this._destroyed)).subscribe(e=>{e?(this._elementFocusedBeforeDrawerWasOpened=this._doc.activeElement,this._takeFocus()):this._isFocusWithinDrawer()&&this._restoreFocus(this._openedVia||"program")}),this._eventCleanups=this._ngZone.runOutsideAngular(()=>{let e=this._renderer,t=this._elementRef.nativeElement;return[e.listen(t,"keydown",n=>{n.keyCode===27&&!this.disableClose&&!Fe(n)&&this._ngZone.run(()=>{this.close(),n.stopPropagation(),n.preventDefault()})}),e.listen(t,"transitionend",this._handleTransitionEvent),e.listen(t,"transitioncancel",this._handleTransitionEvent)]}),this._animationEnd.subscribe(()=>{this.openedChange.emit(this.opened)})}_forceFocus(e,t){this._interactivityChecker.isFocusable(e)||(e.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let n=()=>{d(),l(),e.removeAttribute("tabindex")},d=this._renderer.listen(e,"blur",n),l=this._renderer.listen(e,"mousedown",n)})),e.focus(t)}_focusByCssSelector(e,t){let n=this._elementRef.nativeElement.querySelector(e);n&&this._forceFocus(n,t)}_takeFocus(){if(!this._focusTrap)return;let e=this._elementRef.nativeElement;switch(this.autoFocus){case!1:case"dialog":return;case!0:case"first-tabbable":te(()=>{!this._focusTrap.focusInitialElement()&&typeof e.focus=="function"&&e.focus()},{injector:this._injector});break;case"first-heading":this._focusByCssSelector('h1, h2, h3, h4, h5, h6, [role="heading"]');break;default:this._focusByCssSelector(this.autoFocus);break}}_restoreFocus(e){this.autoFocus!=="dialog"&&(this._elementFocusedBeforeDrawerWasOpened?this._focusMonitor.focusVia(this._elementFocusedBeforeDrawerWasOpened,e):this._elementRef.nativeElement.blur(),this._elementFocusedBeforeDrawerWasOpened=null)}_isFocusWithinDrawer(){let e=this._doc.activeElement;return!!e&&this._elementRef.nativeElement.contains(e)}ngAfterViewInit(){this._isAttached=!0,this._position==="end"&&this._updatePositionInParent("end"),this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._updateFocusTrapState())}ngOnDestroy(){this._eventCleanups.forEach(e=>e()),this._focusTrap?.destroy(),this._anchor?.remove(),this._anchor=null,this._animationStarted.complete(),this._animationEnd.complete(),this._modeChanged.complete(),this._destroyed.next(),this._destroyed.complete()}open(e){return this.toggle(!0,e)}close(){return this.toggle(!1)}_closeViaBackdropClick(){return this._setOpen(!1,!0,"mouse")}toggle(e=!this.opened,t){e&&t&&(this._openedVia=t);let n=this._setOpen(e,!e&&this._isFocusWithinDrawer(),this._openedVia||"program");return e||(this._openedVia=null),n}_setOpen(e,t,n){return e===this.opened?Promise.resolve(e?"open":"close"):(this._opened.set(e),this._container?._transitionsEnabled?(this._setIsAnimating(!0),setTimeout(()=>this._animationStarted.next())):setTimeout(()=>{this._animationStarted.next(),this._animationEnd.next()}),this._elementRef.nativeElement.classList.toggle("mat-drawer-opened",e),!e&&t&&this._restoreFocus(n),this._changeDetectorRef.markForCheck(),this._updateFocusTrapState(),new Promise(d=>{this.openedChange.pipe(fe(1)).subscribe(l=>d(l?"open":"close"))}))}_setIsAnimating(e){this._elementRef.nativeElement.classList.toggle("mat-drawer-animating",e)}_getWidth(){return this._elementRef.nativeElement.offsetWidth||0}_updateFocusTrapState(){this._focusTrap&&(this._focusTrap.enabled=this.opened&&!!this._container?._isShowingBackdrop())}_updatePositionInParent(e){if(!this._platform.isBrowser)return;let t=this._elementRef.nativeElement,n=t.parentNode;e==="end"?(this._anchor||(this._anchor=this._doc.createComment("mat-drawer-anchor"),n.insertBefore(this._anchor,t)),n.appendChild(t)):this._anchor&&this._anchor.parentNode.insertBefore(t,this._anchor)}_handleTransitionEvent=e=>{let t=this._elementRef.nativeElement;e.target===t&&this._ngZone.run(()=>{e.type==="transitionend"&&this._setIsAnimating(!1),this._animationEnd.next(e)})};static \u0275fac=function(t){return new(t||r)};static \u0275cmp=u({type:r,selectors:[["mat-drawer"]],viewQuery:function(t,n){if(t&1&&ie(Ye,5),t&2){let d;_(d=b())&&(n._content=d.first)}},hostAttrs:[1,"mat-drawer"],hostVars:12,hostBindings:function(t,n){t&2&&(ne("align",null)("tabIndex",n.mode!=="side"?"-1":null),W("visibility",!n._container&&!n.opened?"hidden":null),f("mat-drawer-end",n.position==="end")("mat-drawer-over",n.mode==="over")("mat-drawer-push",n.mode==="push")("mat-drawer-side",n.mode==="side"))},inputs:{position:"position",mode:"mode",disableClose:"disableClose",autoFocus:"autoFocus",opened:"opened"},outputs:{openedChange:"openedChange",_openedStream:"opened",openedStart:"openedStart",_closedStream:"closed",closedStart:"closedStart",onPositionChanged:"positionChanged"},exportAs:["matDrawer"],ngContentSelectors:$,decls:3,vars:0,consts:[["content",""],["cdkScrollable","",1,"mat-drawer-inner-container"]],template:function(t,n){t&1&&(g(),i(0,"div",1,0),m(2),a())},dependencies:[S],encapsulation:2,changeDetection:0})}return r})(),le=(()=>{class r{_dir=o(Pe,{optional:!0});_element=o(M);_ngZone=o(N);_changeDetectorRef=o(G);_animationDisabled=Re();_transitionsEnabled=!1;_allDrawers;_drawers=new ge;_content;_userContent;get start(){return this._start}get end(){return this._end}get autosize(){return this._autosize}set autosize(e){this._autosize=x(e)}_autosize=o(ct);get hasBackdrop(){return this._drawerHasBackdrop(this._start)||this._drawerHasBackdrop(this._end)}set hasBackdrop(e){this._backdropOverride=e==null?null:x(e)}_backdropOverride=null;backdropClick=new j;_start=null;_end=null;_left=null;_right=null;_destroyed=new v;_doCheckSubject=new v;_contentMargins={left:null,right:null};_contentMarginChanges=new v;get scrollable(){return this._userContent||this._content}_injector=o(ee);constructor(){let e=o(O),t=o(Ne);this._dir?.change.pipe(h(this._destroyed)).subscribe(()=>{this._validateDrawers(),this.updateContentMargins()}),t.change().pipe(h(this._destroyed)).subscribe(()=>this.updateContentMargins()),!this._animationDisabled&&e.isBrowser&&this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{this._element.nativeElement.classList.add("mat-drawer-transition"),this._transitionsEnabled=!0},200)})}ngAfterContentInit(){this._allDrawers.changes.pipe(X(this._allDrawers),h(this._destroyed)).subscribe(e=>{this._drawers.reset(e.filter(t=>!t._container||t._container===this)),this._drawers.notifyOnChanges()}),this._drawers.changes.pipe(X(null)).subscribe(()=>{this._validateDrawers(),this._drawers.forEach(e=>{this._watchDrawerToggle(e),this._watchDrawerPosition(e),this._watchDrawerMode(e)}),(!this._drawers.length||this._isDrawerOpen(this._start)||this._isDrawerOpen(this._end))&&this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),this._ngZone.runOutsideAngular(()=>{this._doCheckSubject.pipe(he(10),h(this._destroyed)).subscribe(()=>this.updateContentMargins())})}ngOnDestroy(){this._contentMarginChanges.complete(),this._doCheckSubject.complete(),this._drawers.destroy(),this._destroyed.next(),this._destroyed.complete()}open(){this._drawers.forEach(e=>e.open())}close(){this._drawers.forEach(e=>e.close())}updateContentMargins(){let e=0,t=0;if(this._left&&this._left.opened){if(this._left.mode=="side")e+=this._left._getWidth();else if(this._left.mode=="push"){let n=this._left._getWidth();e+=n,t-=n}}if(this._right&&this._right.opened){if(this._right.mode=="side")t+=this._right._getWidth();else if(this._right.mode=="push"){let n=this._right._getWidth();t+=n,e-=n}}e=e||null,t=t||null,(e!==this._contentMargins.left||t!==this._contentMargins.right)&&(this._contentMargins={left:e,right:t},this._ngZone.run(()=>this._contentMarginChanges.next(this._contentMargins)))}ngDoCheck(){this._autosize&&this._isPushed()&&this._ngZone.runOutsideAngular(()=>this._doCheckSubject.next())}_watchDrawerToggle(e){e._animationStarted.pipe(h(this._drawers.changes)).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),e.mode!=="side"&&e.openedChange.pipe(h(this._drawers.changes)).subscribe(()=>this._setContainerClass(e.opened))}_watchDrawerPosition(e){e.onPositionChanged.pipe(h(this._drawers.changes)).subscribe(()=>{te({read:()=>this._validateDrawers()},{injector:this._injector})})}_watchDrawerMode(e){e._modeChanged.pipe(h(ue(this._drawers.changes,this._destroyed))).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()})}_setContainerClass(e){let t=this._element.nativeElement.classList,n="mat-drawer-container-has-open";e?t.add(n):t.remove(n)}_validateDrawers(){this._start=this._end=null,this._drawers.forEach(e=>{e.position=="end"?(this._end!=null,this._end=e):(this._start!=null,this._start=e)}),this._right=this._left=null,this._dir&&this._dir.value==="rtl"?(this._left=this._end,this._right=this._start):(this._left=this._start,this._right=this._end)}_isPushed(){return this._isDrawerOpen(this._start)&&this._start.mode!="over"||this._isDrawerOpen(this._end)&&this._end.mode!="over"}_onBackdropClicked(){this.backdropClick.emit(),this._closeModalDrawersViaBackdrop()}_closeModalDrawersViaBackdrop(){[this._start,this._end].filter(e=>e&&!e.disableClose&&this._drawerHasBackdrop(e)).forEach(e=>e._closeViaBackdropClick())}_isShowingBackdrop(){return this._isDrawerOpen(this._start)&&this._drawerHasBackdrop(this._start)||this._isDrawerOpen(this._end)&&this._drawerHasBackdrop(this._end)}_isDrawerOpen(e){return e!=null&&e.opened}_drawerHasBackdrop(e){return this._backdropOverride==null?!!e&&e.mode!=="side":this._backdropOverride}static \u0275fac=function(t){return new(t||r)};static \u0275cmp=u({type:r,selectors:[["mat-drawer-container"]],contentQueries:function(t,n,d){if(t&1&&A(d,Z,5)(d,ce,5),t&2){let l;_(l=b())&&(n._content=l.first),_(l=b())&&(n._allDrawers=l)}},viewQuery:function(t,n){if(t&1&&ie(Z,5),t&2){let d;_(d=b())&&(n._userContent=d.first)}},hostAttrs:[1,"mat-drawer-container"],hostVars:2,hostBindings:function(t,n){t&2&&f("mat-drawer-container-explicit-backdrop",n._backdropOverride)},inputs:{autosize:"autosize",hasBackdrop:"hasBackdrop"},outputs:{backdropClick:"backdropClick"},exportAs:["matDrawerContainer"],features:[P([{provide:me,useExisting:r}])],ngContentSelectors:tt,decls:4,vars:2,consts:[[1,"mat-drawer-backdrop",3,"mat-drawer-shown"],[1,"mat-drawer-backdrop",3,"click"]],template:function(t,n){t&1&&(g(et),w(0,nt,1,2,"div",0),m(1),m(2,1),w(3,rt,2,0,"mat-drawer-content")),t&2&&(y(n.hasBackdrop?0:-1),p(3),y(n._content?-1:3))},dependencies:[Z],styles:[`.mat-drawer-container {
  position: relative;
  z-index: 1;
  color: var(--mat-sidenav-content-text-color, var(--mat-sys-on-background));
  background-color: var(--mat-sidenav-content-background-color, var(--mat-sys-background));
  box-sizing: border-box;
  display: block;
  overflow: hidden;
}
.mat-drawer-container[fullscreen] {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
}
.mat-drawer-container[fullscreen].mat-drawer-container-has-open {
  overflow: hidden;
}
.mat-drawer-container.mat-drawer-container-explicit-backdrop .mat-drawer-side {
  z-index: 3;
}
.mat-drawer-container.ng-animate-disabled .mat-drawer-backdrop,
.mat-drawer-container.ng-animate-disabled .mat-drawer-content, .ng-animate-disabled .mat-drawer-container .mat-drawer-backdrop,
.ng-animate-disabled .mat-drawer-container .mat-drawer-content {
  transition: none;
}

.mat-drawer-backdrop {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  z-index: 3;
  visibility: hidden;
}
.mat-drawer-backdrop.mat-drawer-shown {
  visibility: visible;
  background-color: var(--mat-sidenav-scrim-color, color-mix(in srgb, var(--mat-sys-neutral-variant20) 40%, transparent));
}
.mat-drawer-transition .mat-drawer-backdrop {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: background-color, visibility;
}
@media (forced-colors: active) {
  .mat-drawer-backdrop {
    opacity: 0.5;
  }
}

.mat-drawer-content {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  overflow: auto;
}
.mat-drawer-content.mat-drawer-content-hidden {
  opacity: 0;
}
.mat-drawer-transition .mat-drawer-content {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: transform, margin-left, margin-right;
}

.mat-drawer {
  position: relative;
  z-index: 4;
  color: var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant));
  box-shadow: var(--mat-sidenav-container-elevation-shadow, none);
  background-color: var(--mat-sidenav-container-background-color, var(--mat-sys-surface));
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  width: var(--mat-sidenav-container-width, 360px);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  outline: 0;
  box-sizing: border-box;
  overflow-y: auto;
  transform: translate3d(-100%, 0, 0);
}
@media (forced-colors: active) {
  .mat-drawer, [dir=rtl] .mat-drawer.mat-drawer-end {
    border-right: solid 1px currentColor;
  }
}
@media (forced-colors: active) {
  [dir=rtl] .mat-drawer, .mat-drawer.mat-drawer-end {
    border-left: solid 1px currentColor;
    border-right: none;
  }
}
.mat-drawer.mat-drawer-side {
  z-index: 2;
}
.mat-drawer.mat-drawer-end {
  right: 0;
  transform: translate3d(100%, 0, 0);
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[dir=rtl] .mat-drawer {
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  transform: translate3d(100%, 0, 0);
}
[dir=rtl] .mat-drawer.mat-drawer-end {
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 0;
  right: auto;
  transform: translate3d(-100%, 0, 0);
}
.mat-drawer-transition .mat-drawer {
  transition: transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) {
  visibility: hidden;
  box-shadow: none;
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) .mat-drawer-inner-container {
  display: none;
}
.mat-drawer.mat-drawer-opened.mat-drawer-opened {
  transform: none;
}

.mat-drawer-side {
  box-shadow: none;
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
}
.mat-drawer-side.mat-drawer-end {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side.mat-drawer-end {
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
  border-left: none;
}

.mat-drawer-inner-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.mat-sidenav-fixed {
  position: fixed;
}
`],encapsulation:2,changeDetection:0})}return r})(),q=(()=>{class r extends Z{static \u0275fac=(()=>{let e;return function(n){return(e||(e=L(r)))(n||r)}})();static \u0275cmp=u({type:r,selectors:[["mat-sidenav-content"]],hostAttrs:[1,"mat-drawer-content","mat-sidenav-content"],features:[P([{provide:S,useExisting:r}]),F],ngContentSelectors:$,decls:1,vars:0,template:function(t,n){t&1&&(g(),m(0))},encapsulation:2,changeDetection:0})}return r})(),pe=(()=>{class r extends ce{get fixedInViewport(){return this._fixedInViewport}set fixedInViewport(e){this._fixedInViewport=x(e)}_fixedInViewport=!1;get fixedTopGap(){return this._fixedTopGap}set fixedTopGap(e){this._fixedTopGap=ae(e)}_fixedTopGap=0;get fixedBottomGap(){return this._fixedBottomGap}set fixedBottomGap(e){this._fixedBottomGap=ae(e)}_fixedBottomGap=0;static \u0275fac=(()=>{let e;return function(n){return(e||(e=L(r)))(n||r)}})();static \u0275cmp=u({type:r,selectors:[["mat-sidenav"]],hostAttrs:[1,"mat-drawer","mat-sidenav"],hostVars:16,hostBindings:function(t,n){t&2&&(ne("tabIndex",n.mode!=="side"?"-1":null)("align",null),W("top",n.fixedInViewport?n.fixedTopGap:null,"px")("bottom",n.fixedInViewport?n.fixedBottomGap:null,"px"),f("mat-drawer-end",n.position==="end")("mat-drawer-over",n.mode==="over")("mat-drawer-push",n.mode==="push")("mat-drawer-side",n.mode==="side")("mat-sidenav-fixed",n.fixedInViewport))},inputs:{fixedInViewport:"fixedInViewport",fixedTopGap:"fixedTopGap",fixedBottomGap:"fixedBottomGap"},exportAs:["matSidenav"],features:[P([{provide:ce,useExisting:r}]),F],ngContentSelectors:$,decls:3,vars:0,consts:[["content",""],["cdkScrollable","",1,"mat-drawer-inner-container"]],template:function(t,n){t&1&&(g(),i(0,"div",1,0),m(2),a())},dependencies:[S],encapsulation:2,changeDetection:0})}return r})(),Ze=(()=>{class r extends le{_allDrawers=void 0;_content=void 0;static \u0275fac=(()=>{let e;return function(n){return(e||(e=L(r)))(n||r)}})();static \u0275cmp=u({type:r,selectors:[["mat-sidenav-container"]],contentQueries:function(t,n,d){if(t&1&&A(d,q,5)(d,pe,5),t&2){let l;_(l=b())&&(n._content=l.first),_(l=b())&&(n._allDrawers=l)}},hostAttrs:[1,"mat-drawer-container","mat-sidenav-container"],hostVars:2,hostBindings:function(t,n){t&2&&f("mat-drawer-container-explicit-backdrop",n._backdropOverride)},exportAs:["matSidenavContainer"],features:[P([{provide:me,useExisting:r},{provide:le,useExisting:r}]),F],ngContentSelectors:it,decls:4,vars:2,consts:[[1,"mat-drawer-backdrop",3,"mat-drawer-shown"],[1,"mat-drawer-backdrop",3,"click"]],template:function(t,n){t&1&&(g(ot),w(0,at,1,2,"div",0),m(1),m(2,1),w(3,st,2,0,"mat-sidenav-content")),t&2&&(y(n.hasBackdrop?0:-1),p(3),y(n._content?-1:3))},dependencies:[q],styles:[dt],encapsulation:2,changeDetection:0})}return r})(),qe=(()=>{class r{static \u0275fac=function(t){return new(t||r)};static \u0275mod=U({type:r});static \u0275inj=z({imports:[de,H,de]})}return r})();var mt=["*",[["mat-toolbar-row"]]],pt=["*","mat-toolbar-row"],ut=(()=>{class r{static \u0275fac=function(t){return new(t||r)};static \u0275dir=be({type:r,selectors:[["mat-toolbar-row"]],hostAttrs:[1,"mat-toolbar-row"],exportAs:["matToolbarRow"]})}return r})(),$e=(()=>{class r{_elementRef=o(M);_platform=o(O);_document=o(V);color;_toolbarRows;constructor(){}ngAfterViewInit(){this._platform.isBrowser&&(this._checkToolbarMixedModes(),this._toolbarRows.changes.subscribe(()=>this._checkToolbarMixedModes()))}_checkToolbarMixedModes(){this._toolbarRows.length}static \u0275fac=function(t){return new(t||r)};static \u0275cmp=u({type:r,selectors:[["mat-toolbar"]],contentQueries:function(t,n,d){if(t&1&&A(d,ut,5),t&2){let l;_(l=b())&&(n._toolbarRows=l)}},hostAttrs:[1,"mat-toolbar"],hostVars:6,hostBindings:function(t,n){t&2&&(ye(n.color?"mat-"+n.color:""),f("mat-toolbar-multiple-rows",n._toolbarRows.length>0)("mat-toolbar-single-row",n._toolbarRows.length===0))},inputs:{color:"color"},exportAs:["matToolbar"],ngContentSelectors:pt,decls:2,vars:0,template:function(t,n){t&1&&(g(mt),m(0),m(1,1))},styles:[`.mat-toolbar {
  background: var(--mat-toolbar-container-background-color, var(--mat-sys-surface));
  color: var(--mat-toolbar-container-text-color, var(--mat-sys-on-surface));
}
.mat-toolbar, .mat-toolbar h1, .mat-toolbar h2, .mat-toolbar h3, .mat-toolbar h4, .mat-toolbar h5, .mat-toolbar h6 {
  font-family: var(--mat-toolbar-title-text-font, var(--mat-sys-title-large-font));
  font-size: var(--mat-toolbar-title-text-size, var(--mat-sys-title-large-size));
  line-height: var(--mat-toolbar-title-text-line-height, var(--mat-sys-title-large-line-height));
  font-weight: var(--mat-toolbar-title-text-weight, var(--mat-sys-title-large-weight));
  letter-spacing: var(--mat-toolbar-title-text-tracking, var(--mat-sys-title-large-tracking));
  margin: 0;
}
@media (forced-colors: active) {
  .mat-toolbar {
    outline: solid 1px;
  }
}
.mat-toolbar .mat-form-field-underline,
.mat-toolbar .mat-form-field-ripple,
.mat-toolbar .mat-focused .mat-form-field-ripple {
  background-color: currentColor;
}
.mat-toolbar .mat-form-field-label,
.mat-toolbar .mat-focused .mat-form-field-label,
.mat-toolbar .mat-select-value,
.mat-toolbar .mat-select-arrow,
.mat-toolbar .mat-form-field.mat-focused .mat-select-arrow {
  color: inherit;
}
.mat-toolbar .mat-input-element {
  caret-color: currentColor;
}
.mat-toolbar .mat-mdc-button-base.mat-mdc-button-base.mat-unthemed {
  --mat-button-text-label-text-color: var(--mat-toolbar-container-text-color, var(--mat-sys-on-surface));
  --mat-button-outlined-label-text-color: var(--mat-toolbar-container-text-color, var(--mat-sys-on-surface));
}

.mat-toolbar-row, .mat-toolbar-single-row {
  display: flex;
  box-sizing: border-box;
  padding: 0 16px;
  width: 100%;
  flex-direction: row;
  align-items: center;
  white-space: nowrap;
  height: var(--mat-toolbar-standard-height, 64px);
}
@media (max-width: 599px) {
  .mat-toolbar-row, .mat-toolbar-single-row {
    height: var(--mat-toolbar-mobile-height, 56px);
  }
}

.mat-toolbar-multiple-rows {
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  width: 100%;
  min-height: var(--mat-toolbar-standard-height, 64px);
}
@media (max-width: 599px) {
  .mat-toolbar-multiple-rows {
    min-height: var(--mat-toolbar-mobile-height, 56px);
  }
}
`],encapsulation:2,changeDetection:0})}return r})();var Ke=(()=>{class r{static \u0275fac=function(t){return new(t||r)};static \u0275mod=U({type:r});static \u0275inj=z({imports:[H]})}return r})();var ft=(r,s)=>s.route;function gt(r,s){if(r&1&&(i(0,"a",6)(1,"mat-icon",17),c(2),a(),i(3,"span",18),c(4),a()()),r&2){let e=s.$implicit;re("routerLink",e.route),p(2),D(e.icon),p(2),D(e.label)}}function _t(r,s){if(r&1){let e=R();i(0,"button",19),k("click",function(){T(e);let n=C();return I(n.toggleSidenav())}),i(1,"mat-icon"),c(2,"menu"),a()()}}var Je=class r{constructor(s,e,t){this.auth=s;this.router=e;this.breakpoint=t}auth;router;breakpoint;sidenavOpened=B(!0);isMobile=B(!1);adminNavItems=[{label:"Dashboard",route:"/dashboard",icon:"dashboard"},{label:"Profile",route:"/profile",icon:"person"},{label:"Users",route:"/users",icon:"group"},{label:"Vendors",route:"/vendors",icon:"store"},{label:"Procurement",route:"/procurement",icon:"inventory_2"},{label:"Purchase Orders",route:"/purchase-orders",icon:"shopping_cart"},{label:"Contracts",route:"/contracts",icon:"description"},{label:"Performance",route:"/performance",icon:"trending_up"},{label:"Analytics",route:"/analytics",icon:"analytics"},{label:"Reports",route:"/reports",icon:"assessment"},{label:"Reliability",route:"/reliability",icon:"verified"},{label:"Communication",route:"/communication",icon:"forum"},{label:"Invoices",route:"/invoices",icon:"receipt_long"},{label:"Compliance",route:"/compliance",icon:"verified_user"},{label:"Notifications",route:"/notifications",icon:"notifications"}];vendorNavItems=[{label:"Vendor Dashboard",route:"/vendor-dashboard",icon:"dashboard"},{label:"My Profile",route:"/vendor-profile",icon:"person"},{label:"My Orders",route:"/vendor-orders",icon:"shopping_cart"},{label:"My Contracts",route:"/vendor-contracts",icon:"description"},{label:"My Performance",route:"/vendor-performance",icon:"trending_up"},{label:"Reliability",route:"/reliability",icon:"verified"},{label:"Communication",route:"/communication",icon:"forum"},{label:"Invoices",route:"/invoices",icon:"receipt_long"},{label:"Compliance",route:"/compliance",icon:"verified_user"},{label:"Notifications",route:"/notifications",icon:"notifications"}];ngOnInit(){this.breakpoint.observe([se.Handset,se.TabletPortrait]).subscribe(s=>{this.isMobile.set(s.matches),this.sidenavOpened.set(!s.matches)}),this.auth.isLoggedIn()&&!this.auth.currentUser()&&this.auth.loadProfile().subscribe({error:()=>this.auth.logout()})}get navItems(){return this.auth.currentUser()?.role==="Vendor"?this.vendorNavItems:this.adminNavItems}get roleLabel(){switch(this.auth.currentUser()?.role){case"Administrator":case"Admin":case"admin":return"Administrator";case"Procurement Manager":case"procurement_manager":return"Procurement Manager";case"Supply Chain Manager":case"supply_chain_manager":return"Supply Chain Manager";case"Vendor":case"vendor":return"Vendor";case"Finance Officer":case"finance_officer":return"Finance Officer";case"Auditor":case"auditor":return"Auditor";default:return"User"}}get pageTitle(){let s=this.router.url,e={"vendor-dashboard":"Vendor Dashboard","vendor-profile":"My Profile","vendor-orders":"My Orders","vendor-contracts":"My Contracts","vendor-performance":"My Performance",users:"User Management",vendors:"Vendor Management",procurement:"Procurement","purchase-orders":"Purchase Orders",contracts:"Contracts",performance:"Performance",analytics:"Analytics",reports:"Reports",notifications:"Notifications",communication:"Communication",compliance:"Contracts & Compliance",invoices:"Invoice Management",profile:"Profile Management",reliability:"Vendor Reliability"},t=Object.keys(e).find(n=>s.includes(n));return t?e[t]:"Dashboard"}toggleSidenav(){this.sidenavOpened.update(s=>!s)}logout(){this.auth.logout()}static \u0275fac=function(e){return new(e||r)(Q(De),Q(xe),Q(Te))};static \u0275cmp=u({type:r,selectors:[["app-layout"]],decls:45,vars:6,consts:[[1,"layout-container"],[1,"layout-sidenav",3,"mode","opened"],[1,"sidenav-brand"],[1,"brand-icon"],[1,"brand-text"],[1,"menu-label"],["mat-list-item","","routerLinkActive","active-link",3,"routerLink"],[1,"menu-label","secondary"],[1,"sidebar-footer"],[1,"profile"],["mat-stroked-button","",1,"logout-btn",3,"click"],[1,"layout-toolbar"],["mat-icon-button",""],[1,"toolbar-title"],[1,"spacer"],[1,"top-avatar"],[1,"layout-content"],["matListItemIcon",""],["matListItemTitle",""],["mat-icon-button","",3,"click"]],template:function(e,t){if(e&1&&(i(0,"mat-sidenav-container",0)(1,"mat-sidenav",1)(2,"div",2)(3,"div",3)(4,"mat-icon"),c(5,"verified_user"),a()(),i(6,"div",4)(7,"h2"),c(8,"VendorIQ"),a(),i(9,"p"),c(10,"Vendor Reliability Intelligence Platform"),a()()(),i(11,"div",5),c(12,"MAIN MENU"),a(),i(13,"mat-nav-list"),ve(14,gt,5,3,"a",6,ft),a(),i(16,"div",7),c(17,"ACCOUNT"),a(),i(18,"div",8)(19,"div",9)(20,"mat-icon"),c(21,"account_circle"),a(),i(22,"div")(23,"strong"),c(24),a(),i(25,"small"),c(26),a()()(),i(27,"button",10),k("click",function(){return t.logout()}),i(28,"mat-icon"),c(29,"logout"),a(),c(30," Logout"),a()()(),i(31,"mat-sidenav-content")(32,"mat-toolbar",11),w(33,_t,3,0,"button",12),i(34,"span",13),c(35),a(),oe(36,"span",14),i(37,"button",12)(38,"mat-icon"),c(39,"notifications_none"),a()(),i(40,"span",15)(41,"mat-icon"),c(42,"account_circle"),a()()(),i(43,"main",16),oe(44,"router-outlet"),a()()()),e&2){let n;p(),re("mode",t.isMobile()?"over":"side")("opened",t.sidenavOpened()),p(13),we(t.navItems),p(10),D(((n=t.auth.currentUser())==null?null:n.full_name)||"User"),p(2),D(t.roleLabel),p(7),y(t.isMobile()?33:-1),p(2),D(t.pageTitle)}},dependencies:[Ce,Me,ke,qe,pe,Ze,q,Ke,$e,Ge,We,Ue,Qe,Le,Se,Oe,Ve,ze,Ae],styles:[".layout-container[_ngcontent-%COMP%]{height:100vh;background:#f7f7fb}.layout-sidenav[_ngcontent-%COMP%]{width:244px;background:#211967;color:#fff;border:0}.sidenav-brand[_ngcontent-%COMP%]{display:flex;align-items:center;gap:10px;padding:18px 16px 20px;border-bottom:1px solid rgba(255,255,255,.08)}.brand-icon[_ngcontent-%COMP%]{width:33px;height:33px;border-radius:8px;background:#fff;color:#342b91;display:grid;place-items:center}.brand-icon[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{font-size:18px}.brand-text[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{font-size:17px;margin:0}.brand-text[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{font-size:7px;color:#c8c5df;margin:2px 0 0}.menu-label[_ngcontent-%COMP%]{font-size:7px;letter-spacing:1px;color:#a7a3c6;padding:16px 16px 6px;font-weight:800}.menu-label.secondary[_ngcontent-%COMP%]{padding-top:6px}.layout-sidenav[_ngcontent-%COMP%]   mat-nav-list[_ngcontent-%COMP%]{padding:0 9px}.layout-sidenav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{height:38px;margin:2px 0;border-radius:7px;color:#d8d5e7}.layout-sidenav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{font-size:17px;color:#b7b2d1}.layout-sidenav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{font-size:9px}.layout-sidenav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover, .active-link[_ngcontent-%COMP%]{background:#40368e!important;color:#fff!important}.active-link[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{color:#fff!important}.sidebar-footer[_ngcontent-%COMP%]{padding:10px}.profile[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;background:#ffffff12}.profile[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{color:#c8c3ef;font-size:28px;width:28px;height:28px}.profile[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%], .profile[_ngcontent-%COMP%]   small[_ngcontent-%COMP%]{display:block}.profile[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{font-size:8px}.profile[_ngcontent-%COMP%]   small[_ngcontent-%COMP%]{font-size:7px;color:#bcb8d1;margin-top:2px}.logout-btn[_ngcontent-%COMP%]{width:100%;margin-top:8px;border-color:#686294;color:#fff!important;height:32px;font-size:9px}.logout-btn[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{font-size:14px}.layout-toolbar[_ngcontent-%COMP%]{height:58px;background:#fff;color:#2a2f53;box-shadow:0 1px #e9e9ef}.toolbar-title[_ngcontent-%COMP%]{font-size:12px;font-weight:700}.spacer[_ngcontent-%COMP%]{flex:1}.top-avatar[_ngcontent-%COMP%]{color:#5548a4;margin-left:4px}.top-avatar[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{font-size:26px;width:26px;height:26px}.layout-content[_ngcontent-%COMP%]{padding:22px 24px;min-height:calc(100vh - 58px);background:#f7f7fb}@media(max-width:800px){.layout-content[_ngcontent-%COMP%]{padding:15px}}"]})};export{Je as LayoutComponent};
