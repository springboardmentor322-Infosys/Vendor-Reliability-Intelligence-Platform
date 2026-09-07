import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-exports',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-head pb-4 border-b border-gray-200">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Data Exports</h1>
        <p class="text-sm text-gray-500 mt-1">Raw underlying system data dumps for offline analysis (CSV/Excel/JSON).</p>
      </div>
    </div>
    
    <div class="mt-8">
       <div class="bg-white p-6 shadow-sm border border-gray-100 rounded-xl max-w-lg">
           <h3 class="font-bold text-gray-800 mb-2">Export Vendors</h3>
           <p class="text-sm text-gray-500 mb-4">Download a full catalog of all approved and pending vendors in the system.</p>
           <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">Export CSV</button>
       </div>
    </div>
  `
})
export class ExportsComponent implements OnInit {
    constructor() { }
    ngOnInit() { }
}
