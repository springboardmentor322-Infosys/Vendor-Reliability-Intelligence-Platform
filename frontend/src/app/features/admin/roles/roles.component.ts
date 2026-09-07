import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-roles',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-head">
      <div>
        <h1>Roles & Permissions</h1>
        <p>Manage system access levels and permission groups.</p>
      </div>
    </div>
    <div class="card mt-4 p-6 text-center text-[var(--slate)]">
      <p>Roles management interface active.</p>
    </div>
  `
})
export class RolesComponent { }
