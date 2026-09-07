import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-payhistory',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-head">
      <div>
        <h1>Payment History</h1>
        <p>Ledger of historical settlements and transactions.</p>
      </div>
    </div>
    <div class="card mt-4 p-6 text-center text-[var(--slate)]">
      <p>Payment history ledger ready.</p>
    </div>
  `
})
export class PayHistoryComponent { }
