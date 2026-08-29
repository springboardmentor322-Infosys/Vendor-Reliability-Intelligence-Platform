import { Component, OnInit } from '@angular/core';
import { ContractService, Contract } from '../../../../core/services/contract.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-contract-list',
  templateUrl: './contract-list.component.html',
  styleUrls: ['./contract-list.component.css']
})
export class ContractListComponent implements OnInit {
  contracts: Contract[] = [];
  canUpload = false;
  showUploadModal = false;

  // Filters
  filterSearch = '';
  filterStatus = '';
  filterVendorId = '';
  filterCompliance = '';

  complianceFlags = ['Insurance Missing', 'GST Missing', 'ISO Expired', 'NDA Missing', 'Signed Copy Missing'];

  constructor(
    private contractService: ContractService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadContracts();
    this.checkPermissions();
  }

  checkPermissions() {
    this.authService.currentUser$.subscribe(user => {
      if (user && user.role) {
        const role = user.role.name;
        this.canUpload = role === 'Administrator' || role === 'Procurement Manager';
      }
    });
  }

  loadContracts() {
    const vendorId = this.filterVendorId ? parseInt(this.filterVendorId, 10) : undefined;
    
    this.contractService.getContracts(vendorId, this.filterStatus, this.filterSearch, this.filterCompliance).subscribe({
      next: (data) => this.contracts = data,
      error: (err) => console.error('Error loading contracts', err)
    });
  }

  applyFilters() {
    this.loadContracts();
  }
  
  clearFilters() {
    this.filterSearch = '';
    this.filterStatus = '';
    this.filterVendorId = '';
    this.filterCompliance = '';
    this.loadContracts();
  }

  openUploadDialog() {
    this.showUploadModal = true;
  }

  closeUploadDialog() {
    this.showUploadModal = false;
    this.loadContracts();
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'Active': return 'badge green';
      case 'Expired': return 'badge dark-red';
      case 'Expiring Soon': return 'badge orange';
      case 'Renewed': return 'badge green';
      case 'Terminated': return 'badge gray';
      default: return 'badge gray';
    }
  }
}
