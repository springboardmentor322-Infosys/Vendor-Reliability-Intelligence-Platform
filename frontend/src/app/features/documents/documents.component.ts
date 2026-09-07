import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Document Repository</h1>
        <p class="text-sm text-gray-500 mt-1">Secure storage for compliance certifications, invoices, and onboarding files.</p>
      </div>
      <div>
        <button class="bg-indigo-600 text-white font-semibold px-4 py-2 text-sm rounded-md shadow hover:bg-indigo-700 transition">Upload File</button>
      </div>
    </div>
    
    <div class="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="col-span-1">
         <ul class="space-y-1">
            <li><a class="block px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-sm">All Documents</a></li>
            <li><a class="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md font-medium text-sm transition">Invoices</a></li>
            <li><a class="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md font-medium text-sm transition">Compliance & KYC</a></li>
            <li><a class="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md font-medium text-sm transition">Contracts</a></li>
         </ul>
      </div>
      <div class="col-span-3">
         <div class="card border border-gray-100 shadow-sm rounded-xl overflow-hidden p-0">
            <div class="border-b border-gray-100 p-4 flex justify-between items-center bg-gray-50">
               <h3 class="font-bold text-gray-800 text-sm">Recently Uploaded</h3>
               <input type="text" placeholder="Search..." class="border border-gray-200 rounded px-3 py-1.5 text-xs w-48">
            </div>
            <table class="w-full text-left whitespace-nowrap">
               <thead class="bg-white border-b-2 border-gray-50 uppercase text-[10px] text-gray-400 font-bold tracking-widest">
                  <tr>
                     <th class="px-6 py-4">File Name</th>
                     <th class="px-6 py-4">Category</th>
                     <th class="px-6 py-4 text-right">Date Uploaded</th>
                  </tr>
               </thead>
               <tbody>
                  <tr class="border-b last:border-0 hover:bg-gray-50">
                     <td class="px-6 py-4 text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <span class="p-1 bg-red-100 text-red-600 rounded"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg></span>
                        Business License 2024.pdf
                     </td>
                     <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Compliance</span></td>
                     <td class="px-6 py-4 text-xs font-medium text-gray-500 text-right">10 Jan 2024</td>
                  </tr>
                  <tr class="border-b last:border-0 hover:bg-gray-50">
                     <td class="px-6 py-4 text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <span class="p-1 bg-red-100 text-red-600 rounded"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg></span>
                        Tax Certificate.pdf
                     </td>
                     <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Compliance</span></td>
                     <td class="px-6 py-4 text-xs font-medium text-gray-500 text-right">10 Jan 2024</td>
                  </tr>
                  <tr class="border-b last:border-0 hover:bg-gray-50">
                     <td class="px-6 py-4 text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <span class="p-1 bg-green-100 text-green-600 rounded"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg></span>
                        Invoice_PO-2024-1025.xlsx
                     </td>
                     <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">Invoices</span></td>
                     <td class="px-6 py-4 text-xs font-medium text-gray-500 text-right">24 May 2024</td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>
    </div>
  `
})
export class DocumentsComponent { }
