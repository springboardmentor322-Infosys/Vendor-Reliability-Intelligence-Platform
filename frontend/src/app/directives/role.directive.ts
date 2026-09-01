import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Auth } from '../services/auth';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class RoleDirective {

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private auth: Auth
  ) {}

  @Input()
  set appHasRole(roles: string | string[]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    this.viewContainer.clear();
    if (this.auth.hasAnyRole(allowedRoles)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}