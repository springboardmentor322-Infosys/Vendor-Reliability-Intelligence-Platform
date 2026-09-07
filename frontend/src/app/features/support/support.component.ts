import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-support',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-head">
      <div>
        <h1>Help & Support</h1>
        <p>Access knowledge base or contact system administrators.</p>
      </div>
    </div>
    <div class="card mt-4 p-6 text-center text-[var(--slate)]">
      <p>Support center available.</p>
    </div>
  `
})
export class SupportComponent { }
