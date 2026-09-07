import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContractService, Contract } from '../../../../core/services/contract.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-contract-details',
  templateUrl: './contract-details.component.html',
  styleUrls: ['./contract-details.component.css']
})
export class ContractDetailsComponent implements OnInit {
  contract: Contract | null = null;
  apiUrl = environment.apiBaseUrl;
  daysUntilExpiry: number | null = null;
  selectedFile: File | null = null;
  uploading = false;

  constructor(
    private route: ActivatedRoute,
    private contractService: ContractService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadContract(+id);
    }
  }

  loadContract(id: number) {
    this.contractService.getContract(id).subscribe({
      next: (data) => {
        this.contract = data;
        this.calculateExpiry();
      },
      error: (err) => console.error('Error loading contract', err)
    });
  }

  calculateExpiry() {
    if (this.contract && this.contract.end_date) {
      const end = new Date(this.contract.end_date).getTime();
      const now = new Date().getTime();
      const diff = end - now;
      this.daysUntilExpiry = Math.ceil(diff / (1000 * 3600 * 24));
    }
  }

  getExpiryBadgeClass(): string {
    if (this.daysUntilExpiry === null) return 'badge gray';
    if (this.daysUntilExpiry <= 30) return 'badge red';
    if (this.daysUntilExpiry <= 60) return 'badge orange';
    if (this.daysUntilExpiry <= 90) return 'badge amber';
    return 'badge green';
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  uploadContractPdf() {
    if (!this.selectedFile || !this.contract) return;
    this.uploading = true;
    this.contractService.uploadContractDocument(this.contract.id, this.selectedFile).subscribe({
      next: (res) => {
        alert('Document uploaded successfully!');
        this.uploading = false;
        this.selectedFile = null;
        this.loadContract(this.contract!.id);
      },
      error: (err) => {
        alert(err.error?.detail || 'Upload failed');
        this.uploading = false;
      }
    });
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

  downloadDocument() {
    if (this.contract?.uploaded_document_path) {
      window.open(`${this.apiUrl}/contracts/${this.contract.id}/download`, '_blank');
    }
  }
}
