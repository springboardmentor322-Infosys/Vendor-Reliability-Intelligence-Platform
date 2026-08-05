import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-pr-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pr-dashboard.component.html'
})
export class PrDashboardComponent implements OnInit {
  prs: any[] = [];
  
  showModal = false;
  selectedPR: any = null;
  
  showCreateModal = false;
  newPR: any = {
    department: '',
    description: '',
    items: [{ item_name: '', quantity: 1, estimated_cost: 0.0 }]
  };

  currentRoleKey = '';

  constructor(
    private procurementService: ProcurementService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        const roleMap: any = {
          'Administrator': 'admin',
          'Procurement Manager': 'pm',
          'Supply Chain Manager': 'scm',
          'Finance Officer': 'finance',
          'Auditor': 'auditor',
          'Vendor': 'vendor'
        };
        this.currentRoleKey = roleMap[user.role?.name] || 'admin';
      }
    });
    this.loadData();
  }

  loadData() {
    this.procurementService.getProcurementRequests().subscribe(res => {
      this.prs = res;
    });
  }

  openPR(pr: any) {
    this.selectedPR = pr;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedPR = null;
  }

  updateStatus(status: string) {
    if (!this.selectedPR) return;
    this.procurementService.updateProcurementRequestStatus(this.selectedPR.id, status).subscribe(res => {
      this.selectedPR.status = res.status;
      const idx = this.prs.findIndex(p => p.id === res.id);
      if (idx !== -1) this.prs[idx] = res;
      // Keep modal open so they see the status change, or close it if desired
    });
  }

  // Create PR Form Logic
  openCreateModal() {
    this.newPR = {
      department: '',
      description: '',
      items: [{ item_name: '', quantity: 1, estimated_cost: 0.0 }]
    };
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  addItem() {
    this.newPR.items.push({ item_name: '', quantity: 1, estimated_cost: 0.0 });
  }

  removeItem(index: number) {
    if (this.newPR.items.length > 1) {
      this.newPR.items.splice(index, 1);
    }
  }

  get newPRTotal() {
    return this.newPR.items.reduce((acc: number, it: any) => acc + (it.quantity * it.estimated_cost), 0);
  }

  submitPR() {
    if (!this.newPR.department) return alert('Department is required');
    for (let item of this.newPR.items) {
      if (!item.item_name || item.quantity < 1 || item.estimated_cost <= 0) {
        return alert('All items must have a name, quantity > 0, and cost > 0');
      }
    }
    
    this.procurementService.createProcurementRequest(this.newPR).subscribe(res => {
      this.prs.push(res);
      this.closeCreateModal();
    });
  }
}
