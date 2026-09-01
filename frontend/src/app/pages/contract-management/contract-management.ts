import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { RoleDirective } from '../../directives/role.directive';

import { FormsModule } from '@angular/forms';

import { Contract } from '../../services/contract';

import { Vendor } from '../../services/vendor';


@Component({
  selector: 'app-contract-management',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RoleDirective
  ],

  templateUrl:
    './contract-management.html',

  styleUrl:
    './contract-management.css'
})


export class ContractManagement
  implements OnInit {


  // ==========================================
  // CONTRACT DATA
  // ==========================================

  contracts =
    signal<any[]>([]);


  // ==========================================
  // VENDOR DATA
  // ==========================================

  vendors =
    signal<any[]>([]);


  // ==========================================
  // EXPIRY ALERTS
  // ==========================================

  expiryAlerts =
    signal<any[]>([]);


  // ==========================================
  // CONTRACT SUMMARY
  // ==========================================

  contractSummary =
    signal<any>({

      total_contracts: 0,

      active_contracts: 0,

      expired_contracts: 0,

      expiring_soon: 0,

      compliant_contracts: 0,

      non_compliant_contracts: 0,

      pending_compliance: 0,

      pending_renewals: 0,

      renewed_contracts: 0,

      not_renewing_contracts: 0

    });


  // ==========================================
  // LOADING
  // ==========================================

  loading =
    signal(false);

  alertLoading =
    signal(false);

  summaryLoading =
    signal(false);

  documentLoading =
    signal(false);


  // ==========================================
  // FORM
  // ==========================================

  showForm =
    signal(false);


  editingContractId:
    number | null = null;


  // ==========================================
  // FORM DATA
  // ==========================================

  selectedVendorId:
    number | null = null;


  contractName =
    '';


  contractNumber =
    '';


  contractValue =
    0;


  startDate =
    '';


  expiryDate =
    '';


  status =
    'Active';


  // ==========================================
  // RENEWAL
  // ==========================================

  renewalStatus =
    'Pending';


  renewalDate =
    '';


  // ==========================================
  // COMPLIANCE
  // ==========================================

  complianceStatus =
    'Compliant';


  description =
    '';


  // ==========================================
  // CONTRACT DOCUMENTS
  // ==========================================

  contractDocuments =
    signal<any[]>([]);


  selectedDocumentContractId:
    number | null = null;


  // ==========================================
  // DOCUMENT FORM
  // ==========================================

  showDocumentForm =
    signal(false);


  certificationName =
    '';


  certificationNumber =
    '';


  certificationIssueDate =
    '';


  certificationExpiryDate =
    '';


  certificationStatus =
    'Active';


  selectedFile:
    File | null = null;


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(

    private contractService:
      Contract,

    private vendorService:
      Vendor

  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadContracts();

    this.loadVendors();

    this.loadExpiryAlerts();

    this.loadContractSummary();

  }


  // ==========================================
  // LOAD CONTRACTS
  // ==========================================

  loadContracts(): void {

    this.loading.set(true);


    this.contractService
      .getContracts()
      .subscribe({

        next: (response: any[]) => {

          console.log(
            'Contracts loaded:',
            response
          );

          this.contracts.set(
            response
          );

          this.loading.set(false);

        },


        error: (error: any) => {

          console.error(
            'Failed to load contracts:',
            error
          );

          this.contracts.set([]);

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // LOAD VENDORS
  // ==========================================

  loadVendors(): void {

    this.vendorService
      .getVendors()
      .subscribe({

        next: (response: any[]) => {

          console.log(
            'Vendors loaded:',
            response
          );

          this.vendors.set(
            response
          );

        },


        error: (error: any) => {

          console.error(
            'Failed to load vendors:',
            error
          );

          this.vendors.set([]);

        }

      });

  }


  // ==========================================
  // LOAD EXPIRY ALERTS
  // ==========================================

  loadExpiryAlerts(): void {

    this.alertLoading.set(true);


    this.contractService
      .getExpiryAlerts()
      .subscribe({

        next: (response: any[]) => {

          this.expiryAlerts.set(
            response
          );

          this.alertLoading.set(false);

        },


        error: (error: any) => {

          console.error(
            'Failed to load expiry alerts:',
            error
          );

          this.expiryAlerts.set([]);

          this.alertLoading.set(false);

        }

      });

  }


  // ==========================================
  // LOAD CONTRACT SUMMARY
  // ==========================================

  loadContractSummary(): void {

    this.summaryLoading.set(true);


    this.contractService
      .getContractSummary()
      .subscribe({

        next: (response: any) => {

          console.log(
            'Contract summary:',
            response
          );

          this.contractSummary.set(
            response
          );

          this.summaryLoading.set(false);

        },


        error: (error: any) => {

          console.error(
            'Failed to load contract summary:',
            error
          );

          this.summaryLoading.set(false);

        }

      });

  }


  // ==========================================
  // REFRESH ALL DATA
  // ==========================================

  refreshData(): void {

    this.loadContracts();

    this.loadVendors();

    this.loadExpiryAlerts();

    this.loadContractSummary();

  }


  // ==========================================
  // OPEN ADD FORM
  // ==========================================

  openAddForm(): void {

    this.resetForm();

    this.editingContractId =
      null;

    this.showForm.set(true);

  }


  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  openEditForm(
    contract: any
  ): void {

    this.editingContractId =
      contract.id;


    this.selectedVendorId =
      contract.vendor_id;


    this.contractName =
      contract.contract_name;


    this.contractNumber =
      contract.contract_number;


    this.contractValue =
      Number(
        contract.contract_value || 0
      );


    this.startDate =
      contract.start_date;


    this.expiryDate =
      contract.expiry_date;


    this.status =
      contract.status;


    this.renewalStatus =
      contract.renewal_status ||
      'Pending';


    this.renewalDate =
      contract.renewal_date ||
      '';


    this.complianceStatus =
      contract.compliance_status;


    this.description =
      contract.description ||
      '';


    this.showForm.set(true);

  }


  // ==========================================
  // CLOSE FORM
  // ==========================================

  closeForm(): void {

    this.showForm.set(false);

    this.resetForm();

  }


  // ==========================================
  // RESET FORM
  // ==========================================

  resetForm(): void {

    this.editingContractId =
      null;


    this.selectedVendorId =
      null;


    this.contractName =
      '';


    this.contractNumber =
      '';


    this.contractValue =
      0;


    this.startDate =
      '';


    this.expiryDate =
      '';


    this.status =
      'Active';


    this.renewalStatus =
      'Pending';


    this.renewalDate =
      '';


    this.complianceStatus =
      'Compliant';


    this.description =
      '';

  }


  // ==========================================
  // SAVE CONTRACT
  // ==========================================

  saveContract(): void {


    // ========================================
    // VALIDATION
    // ========================================

    if (
      this.selectedVendorId === null
    ) {

      alert(
        'Please select a vendor.'
      );

      return;

    }


    if (
      !this.contractName.trim()
    ) {

      alert(
        'Please enter contract name.'
      );

      return;

    }


    if (
      !this.contractNumber.trim()
    ) {

      alert(
        'Please enter contract number.'
      );

      return;

    }


    if (
      this.contractValue < 0
    ) {

      alert(
        'Contract value cannot be negative.'
      );

      return;

    }


    if (!this.startDate) {

      alert(
        'Please select start date.'
      );

      return;

    }


    if (!this.expiryDate) {

      alert(
        'Please select expiry date.'
      );

      return;

    }


    if (
      this.expiryDate <
      this.startDate
    ) {

      alert(
        'Expiry date cannot be before start date.'
      );

      return;

    }


    // ========================================
    // RENEWAL DATE VALIDATION
    // ========================================

    if (
      this.renewalDate &&
      this.renewalDate <
      this.expiryDate
    ) {

      alert(
        'Renewal date cannot be before the contract expiry date.'
      );

      return;

    }


    // ========================================
    // REQUEST DATA
    // ========================================

    const data = {

      vendor_id:
        this.selectedVendorId,

      contract_name:
        this.contractName.trim(),

      contract_number:
        this.contractNumber.trim(),

      contract_value:
        this.contractValue,

      start_date:
        this.startDate,

      expiry_date:
        this.expiryDate,

      status:
        this.status,

      renewal_status:
        this.renewalStatus,

      renewal_date:
        this.renewalDate ||
        null,

      compliance_status:
        this.complianceStatus,

      description:
        this.description.trim() ||
        null

    };


    console.log(
      'Saving contract:',
      data
    );


    // ========================================
    // UPDATE CONTRACT
    // ========================================

    if (
      this.editingContractId !== null
    ) {

      const contractId =
        this.editingContractId;


      this.contractService
        .updateContract(
          contractId,
          data
        )
        .subscribe({

          next: (response: any) => {

            console.log(
              'Contract updated:',
              response
            );

            alert(
              'Contract updated successfully.'
            );

            this.closeForm();

            this.refreshData();

          },


          error: (error: any) => {

            console.error(
              'Update contract error:',
              error
            );

            alert(
              error?.error?.detail ||
              error?.error?.message ||
              'Failed to update contract.'
            );

          }

        });


      return;

    }


    // ========================================
    // CREATE CONTRACT
    // ========================================

    this.contractService
      .createContract(data)
      .subscribe({

        next: (response: any) => {

          console.log(
            'Contract created:',
            response
          );

          alert(
            'Contract created successfully.'
          );

          this.closeForm();

          this.refreshData();

        },


        error: (error: any) => {

          console.error(
            'Create contract error:',
            error
          );

          alert(
            error?.error?.detail ||
            error?.error?.message ||
            'Failed to create contract.'
          );

        }

      });

  }


  // ==========================================
  // DELETE CONTRACT
  // ==========================================

  deleteContract(
    id: number
  ): void {

    console.log(
      'Delete button clicked. Contract ID:',
      id
    );


    const confirmed =
      confirm(
        'Are you sure you want to delete this contract?'
      );


    if (!confirmed) {

      console.log(
        'Contract deletion cancelled.'
      );

      return;

    }


    console.log(
      'Sending DELETE request for contract:',
      id
    );


    this.contractService
      .deleteContract(id)
      .subscribe({

        next: (response: any) => {

          console.log(
            'Delete response:',
            response
          );


          alert(
            'Contract deleted successfully.'
          );


          // Immediately remove from UI
          this.contracts.update(
            currentContracts =>
              currentContracts.filter(
                contract =>
                  contract.id !== id
              )
          );


          // Refresh backend data
          this.loadContracts();

          this.loadExpiryAlerts();

          this.loadContractSummary();

        },


        error: (error: any) => {

          console.error(
            'Delete contract error:',
            error
          );


          console.error(
            'Status:',
            error?.status
          );


          console.error(
            'Error body:',
            error?.error
          );


          alert(
            error?.error?.detail ||
            error?.error?.message ||
            `Failed to delete contract. HTTP Status: ${error?.status || 'Unknown'}`
          );

        }

      });

  }


  // ==========================================
  // GET VENDOR NAME
  // ==========================================

  getVendorName(
    vendorId: number
  ): string {

    const vendor =
      this.vendors().find(
        item =>
          item.id ===
          vendorId
      );


    return vendor
      ? vendor.vendor_name
      : `Vendor #${vendorId}`;

  }


  // ==========================================
  // FORMAT VALUE
  // ==========================================

  formatValue(
    value: number
  ): string {

    return Number(
      value || 0
    ).toLocaleString(
      'en-IN'
    );

  }


  // ==========================================
  // STATUS CLASS
  // ==========================================

  getStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'Active':

        return 'status-active';


      case 'Expired':

        return 'status-expired';


      case 'Suspended':

        return 'status-suspended';


      default:

        return '';

    }

  }


  // ==========================================
  // COMPLIANCE CLASS
  // ==========================================

  getComplianceClass(
    status: string
  ): string {

    switch (status) {

      case 'Compliant':

        return 'compliance-good';


      case 'Non-Compliant':

        return 'compliance-danger';


      case 'Pending':

        return 'compliance-warning';


      default:

        return '';

    }

  }


  // ==========================================
  // RENEWAL CLASS
  // ==========================================

  getRenewalClass(
    status: string
  ): string {

    switch (status) {

      case 'Renewed':

        return 'renewal-renewed';


      case 'Not Renewing':

        return 'renewal-not-renewing';


      case 'Pending':

        return 'renewal-pending';


      default:

        return '';

    }

  }


  // ==========================================
  // EXPIRY CLASS
  // ==========================================

  getExpiryClass(
    days: number
  ): string {

    if (days <= 7) {

      return 'expiry-danger';

    }


    if (days <= 30) {

      return 'expiry-warning';

    }


    return 'expiry-normal';

  }


  // ==========================================
  // LOAD CONTRACT DOCUMENTS
  // ==========================================

  loadContractDocuments(
    contractId: number
  ): void {

    this.selectedDocumentContractId =
      contractId;

    this.documentLoading.set(true);


    this.contractService
      .getContractDocuments(
        contractId
      )
      .subscribe({

        next: (response: any[]) => {

          this.contractDocuments.set(
            response
          );

          this.documentLoading.set(false);

        },


        error: (error: any) => {

          console.error(
            'Failed to load contract documents:',
            error
          );

          this.contractDocuments.set([]);

          this.documentLoading.set(false);

          alert(
            error?.error?.detail ||
            'Failed to load contract documents.'
          );

        }

      });

  }


  // ==========================================
  // OPEN DOCUMENT FORM
  // ==========================================

  openDocumentForm(
    contractId: number
  ): void {

    this.selectedDocumentContractId =
      contractId;

    this.resetDocumentForm();

    this.showDocumentForm.set(true);

    this.loadContractDocuments(
      contractId
    );

  }


  // ==========================================
  // CLOSE DOCUMENT FORM
  // ==========================================

  closeDocumentForm(): void {

    this.showDocumentForm.set(false);

    this.resetDocumentForm();

  }


  // ==========================================
  // RESET DOCUMENT FORM
  // ==========================================

  resetDocumentForm(): void {

    this.certificationName =
      '';

    this.certificationNumber =
      '';

    this.certificationIssueDate =
      '';

    this.certificationExpiryDate =
      '';

    this.certificationStatus =
      'Active';

    this.selectedFile =
      null;

  }


  // ==========================================
  // FILE SELECT
  // ==========================================

  onFileSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    if (
      input.files &&
      input.files.length > 0
    ) {

      this.selectedFile =
        input.files[0];

    } else {

      this.selectedFile =
        null;

    }

  }


  // ==========================================
  // CREATE CERTIFICATION
  // ==========================================

  createCertification(): void {

    if (
      this.selectedDocumentContractId === null
    ) {

      alert(
        'Please select a contract.'
      );

      return;

    }


    if (
      !this.certificationName.trim()
    ) {

      alert(
        'Please enter certification name.'
      );

      return;

    }


    if (
      this.certificationIssueDate &&
      this.certificationExpiryDate &&
      this.certificationExpiryDate <
      this.certificationIssueDate
    ) {

      alert(
        'Certification expiry date cannot be before issue date.'
      );

      return;

    }


    const data = {

      contract_id:
        this.selectedDocumentContractId,

      certification_name:
        this.certificationName.trim(),

      certification_number:
        this.certificationNumber.trim() ||
        null,

      issue_date:
        this.certificationIssueDate ||
        null,

      expiry_date:
        this.certificationExpiryDate ||
        null,

      status:
        this.certificationStatus

    };


    this.documentLoading.set(true);


    this.contractService
      .createContractDocument(data)
      .subscribe({

        next: (response: any) => {

          const documentId =
            response?.id;


          if (
            this.selectedFile &&
            documentId
          ) {

            this.uploadDocument(
              documentId
            );

          } else {

            alert(
              'Certification created successfully.'
            );

            this.loadContractDocuments(
              this.selectedDocumentContractId!
            );

            this.resetDocumentForm();

            this.documentLoading.set(false);

          }

        },


        error: (error: any) => {

          console.error(
            'Create certification error:',
            error
          );

          this.documentLoading.set(false);

          alert(
            error?.error?.detail ||
            'Failed to create certification.'
          );

        }

      });

  }


  // ==========================================
  // UPLOAD DOCUMENT
  // ==========================================

  uploadDocument(
    documentId: number
  ): void {

    if (!this.selectedFile) {

      return;

    }


    this.contractService
      .uploadContractDocument(
        documentId,
        this.selectedFile
      )
      .subscribe({

        next: () => {

          alert(
            'Certification and document uploaded successfully.'
          );


          if (
            this.selectedDocumentContractId !== null
          ) {

            this.loadContractDocuments(
              this.selectedDocumentContractId
            );

          }


          this.resetDocumentForm();

          this.documentLoading.set(false);

        },


        error: (error: any) => {

          console.error(
            'Upload document error:',
            error
          );

          this.documentLoading.set(false);

          alert(
            error?.error?.detail ||
            'Certification was created, but document upload failed.'
          );


          if (
            this.selectedDocumentContractId !== null
          ) {

            this.loadContractDocuments(
              this.selectedDocumentContractId
            );

          }

        }

      });

  }


  // ==========================================
  // DELETE CONTRACT DOCUMENT
  // ==========================================

  deleteContractDocument(
    documentId: number
  ): void {

    const confirmed =
      confirm(
        'Are you sure you want to delete this certification/document?'
      );


    if (!confirmed) {

      return;

    }


    this.contractService
      .deleteContractDocument(
        documentId
      )
      .subscribe({

        next: () => {

          alert(
            'Certification/document deleted successfully.'
          );


          if (
            this.selectedDocumentContractId !== null
          ) {

            this.loadContractDocuments(
              this.selectedDocumentContractId
            );

          }

        },


        error: (error: any) => {

          console.error(
            'Delete document error:',
            error
          );

          alert(
            error?.error?.detail ||
            'Failed to delete certification/document.'
          );

        }

      });

  }


  // ==========================================
  // DOCUMENT STATUS CLASS
  // ==========================================

  getDocumentStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'Active':

        return 'document-active';


      case 'Expired':

        return 'document-expired';


      case 'Pending':

        return 'document-pending';


      default:

        return '';

    }

  }


  // ==========================================
  // GET FILE NAME
  // ==========================================

  getFileName(
    document: any
  ): string {

    return (
      document?.document_name ||
      'No document uploaded'
    );

  }

}