import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-system-logs',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-head">
      <div>
        <h1>System Logs</h1>
        <p>Core infrastructure and application tracing.</p>
      </div>
    </div>
    <div class="card mt-4 p-6 text-center text-[var(--slate)]">
      <p>System logs securely loaded.</p>
    </div>
  `
})
export class SystemLogsComponent { }
