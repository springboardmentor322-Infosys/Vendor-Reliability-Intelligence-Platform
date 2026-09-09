import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ContractDocumentService } from '../../services/contract-document.service';

@Component({
  selector: 'app-contract-documents',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './contract-documents.html',
  styleUrl: './contract-documents.css'
})
export class ContractDocuments implements OnInit {

  // ==========================================
  // DATA
  // ==========================================

  documents = signal<any[]>([]);

  // ==========================================
  // CONTRACT
  // ==========================================

  // Contract ID is TEXT because the UI uses:
  // CNT-2026-0001
  contractId = '';

  // Actual numeric database Contract.id
  selectedContractDbId: number | null = null;

  // ==========================================
  // USER / ROLE
  // ==========================================

  isAuditor = false;

  // ==========================================
  // FORM
  // ==========================================

  certificationName = '';
  certificationNumber = '';
  issueDate = '';
  expiryDate = '';
  status = 'Active';

  // ==========================================
  // FILE
  // ==========================================

  selectedFile: File | null = null;

  // ==========================================
  // LOADING
  // ==========================================

  loading = signal(false);
  uploading = signal(false);

  // ==========================================
  // FORM VISIBILITY
  // ==========================================

  showForm = signal(false);
  editMode = signal(false);

  selectedDocumentId: number | null = null;

  // ==========================================
  // MESSAGES
  // ==========================================

  successMessage = '';
  errorMessage = '';

  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private documentService: ContractDocumentService
  ) {}

  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {
    this.detectUserRole();
  }

  // ==========================================
  // DETECT USER ROLE
  // ==========================================

  detectUserRole(): void {

    this.isAuditor = false;

    const storageKeys = [
      'role',
      'userRole',
      'currentUser',
      'user',
      'loggedInUser',
      'authUser'
    ];

    const storages = [
      window.localStorage,
      window.sessionStorage
    ];

    for (const storage of storages) {

      for (const key of storageKeys) {

        const rawValue = storage.getItem(key);

        if (!rawValue) {
          continue;
        }

        let roleValue = rawValue;

        try {
          const parsed = JSON.parse(rawValue);

          if (typeof parsed === 'string') {
            roleValue = parsed;
          } else if (parsed?.role) {
            roleValue = parsed.role;
          } else if (parsed?.user?.role) {
            roleValue = parsed.user.role;
          }
        } catch {
          // Value was plain text, so use it directly.
        }

        if (
          String(roleValue)
            .trim()
            .toLowerCase() === 'auditor'
        ) {
          this.isAuditor = true;
          return;
        }
      }
    }
  }

  // ==========================================
  // LOAD DOCUMENTS
  // ==========================================

  loadDocuments(): void {

    const enteredId = this.contractId.trim();

    if (!enteredId) {

      this.errorMessage =
        'Please enter a Contract ID.';

      this.documents.set([]);

      return;
    }

    this.loading.set(true);

    this.errorMessage = '';
    this.successMessage = '';

    /*
     * UI Contract ID:
     *
     * CNT-2026-0001
     *
     * Backend expects numeric:
     *
     * 1
     */

    const match = enteredId.match(/-(\d+)$/);

    if (!match) {

      this.loading.set(false);

      this.documents.set([]);

      this.errorMessage =
        'Please enter a valid Contract ID, for example CNT-2026-0001.';

      return;
    }

    const numericId = Number(match[1]);

    if (!numericId || numericId < 1) {

      this.loading.set(false);

      this.documents.set([]);

      this.errorMessage =
        'Please enter a valid Contract ID.';

      return;
    }

    this.selectedContractDbId = numericId;

    this.documentService
      .getContractDocuments(numericId)
      .subscribe({

        next: (response: any[]) => {

          this.documents.set(response || []);

          this.loading.set(false);
        },

        error: (error: any) => {

          console.error(
            'Failed to load documents:',
            error
          );

          this.documents.set([]);

          this.loading.set(false);

          this.errorMessage =
            this.getErrorMessage(
              error,
              'Unable to load contract documents.'
            );
        }

      });
  }

  // ==========================================
  // ERROR MESSAGE
  // ==========================================

  getErrorMessage(
    error: any,
    fallback: string
  ): string {

    if (typeof error?.error === 'string') {
      return error.error;
    }

    if (typeof error?.error?.detail === 'string') {
      return error.error.detail;
    }

    if (typeof error?.message === 'string') {
      return error.message;
    }

    return fallback;
  }

  // ==========================================
  // OPEN ADD FORM
  // ==========================================

  openAddForm(): void {

    if (this.isAuditor) {

      this.errorMessage =
        'Auditors have read-only access to contract documentation.';

      return;
    }

    if (!this.selectedContractDbId) {

      this.errorMessage =
        'Please load a valid Contract ID first.';

      return;
    }

    this.editMode.set(false);

    this.selectedDocumentId = null;

    this.resetForm();

    this.showForm.set(true);
  }

  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  openEditForm(
    selectedDocument: any
  ): void {

    if (this.isAuditor) {

      this.errorMessage =
        'Auditors have read-only access to contract documentation.';

      return;
    }

    this.editMode.set(true);

    this.selectedDocumentId =
      selectedDocument.id;

    this.certificationName =
      selectedDocument.certification_name || '';

    this.certificationNumber =
      selectedDocument.certification_number || '';

    this.issueDate =
      selectedDocument.issue_date || '';

    this.expiryDate =
      selectedDocument.expiry_date || '';

    this.status =
      selectedDocument.status || 'Active';

    this.selectedFile = null;

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

    this.certificationName = '';
    this.certificationNumber = '';
    this.issueDate = '';
    this.expiryDate = '';
    this.status = 'Active';

    this.selectedFile = null;
    this.selectedDocumentId = null;
  }

  // ==========================================
  // FILE SELECT
  // ==========================================

  onFileSelected(
    event: Event
  ): void {

    if (this.isAuditor) {
      return;
    }

    const input =
      event.target as HTMLInputElement;

    if (
      input.files &&
      input.files.length > 0
    ) {

      this.selectedFile =
        input.files[0];

      this.errorMessage = '';
    }
  }

  // ==========================================
  // SAVE DOCUMENT
  // ==========================================

  saveDocument(): void {

    if (this.isAuditor) {

      this.errorMessage =
        'Auditors have read-only access to contract documentation.';

      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    // ==========================================
    // VALIDATE CONTRACT
    // ==========================================

    if (!this.selectedContractDbId) {

      this.errorMessage =
        'Please load a valid Contract ID first.';

      return;
    }

    // ==========================================
    // VALIDATE CERTIFICATION
    // ==========================================

    if (!this.certificationName.trim()) {

      this.errorMessage =
        'Certification name is required.';

      return;
    }

    // ==========================================
    // VALIDATE DATES
    // ==========================================

    if (
      this.issueDate &&
      this.expiryDate &&
      this.expiryDate < this.issueDate
    ) {

      this.errorMessage =
        'Expiry date cannot be before issue date.';

      return;
    }

    const fileToUpload =
      this.selectedFile;

    // ==========================================
    // REQUEST DATA
    // ==========================================

    const data = {

      contract_id:
        this.selectedContractDbId,

      certification_name:
        this.certificationName.trim(),

      certification_number:
        this.certificationNumber.trim(),

      issue_date:
        this.issueDate || null,

      expiry_date:
        this.expiryDate || null,

      status:
        this.status
    };

    // ==========================================
    // UPDATE
    // ==========================================

    if (
      this.editMode() &&
      this.selectedDocumentId
    ) {

      const documentId =
        this.selectedDocumentId;

      this.documentService
        .updateContractDocument(
          documentId,
          data
        )
        .subscribe({

          next: () => {

            this.successMessage =
              'Document information updated successfully.';

            if (fileToUpload) {

              this.uploadFile(
                documentId,
                fileToUpload
              );
            }

            this.showForm.set(false);

            this.resetForm();

            this.loadDocuments();
          },

          error: (error: any) => {

            console.error(
              'Failed to update document:',
              error
            );

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to update document.'
              );
          }

        });

      return;
    }

    // ==========================================
    // CREATE
    // ==========================================

    this.documentService
      .createContractDocument(data)
      .subscribe({

        next: (response: any) => {

          console.log(
            'Document created:',
            response
          );

          const documentId =
            response?.id;

          if (!documentId) {

            this.errorMessage =
              'Document was created, but no document ID was returned.';

            return;
          }

          this.showForm.set(false);

          this.resetForm();

          if (fileToUpload) {

            this.uploadFile(
              documentId,
              fileToUpload
            );

          } else {

            this.successMessage =
              'Document record created successfully.';

            this.loadDocuments();
          }
        },

        error: (error: any) => {

          console.error(
            'Failed to create document:',
            error
          );

          this.errorMessage =
            this.getErrorMessage(
              error,
              'Unable to create document.'
            );
        }

      });
  }

  // ==========================================
  // UPLOAD FILE
  // ==========================================

  uploadFile(
    documentId: number,
    file: File
  ): void {

    if (this.isAuditor) {
      return;
    }

    this.uploading.set(true);

    this.errorMessage = '';

    this.documentService
      .uploadDocument(
        documentId,
        file
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Upload successful:',
            response
          );

          this.uploading.set(false);

          this.successMessage =
            'Document uploaded successfully.';

          this.loadDocuments();
        },

        error: (error: any) => {

          console.error(
            'Failed to upload document:',
            error
          );

          this.uploading.set(false);

          this.errorMessage =
            this.getErrorMessage(
              error,
              'Unable to upload document.'
            );
        }

      });
  }

  // ==========================================
  // DELETE DOCUMENT
  // ==========================================

  deleteDocument(
    documentId: number
  ): void {

    if (this.isAuditor) {

      this.errorMessage =
        'Auditors have read-only access to contract documentation.';

      return;
    }

    const confirmed =
      confirm(
        'Are you sure you want to delete this document?'
      );

    if (!confirmed) {
      return;
    }

    this.documentService
      .deleteContractDocument(documentId)
      .subscribe({

        next: () => {

          this.successMessage =
            'Document deleted successfully.';

          this.loadDocuments();
        },

        error: (error: any) => {

          console.error(
            'Failed to delete document:',
            error
          );

          this.errorMessage =
            this.getErrorMessage(
              error,
              'Unable to delete document.'
            );
        }

      });
  }

  // ==========================================
  // DOWNLOAD DOCUMENT
  // ==========================================

  downloadDocument(
    selectedDocument: any
  ): void {

    if (!selectedDocument?.id) {

      this.errorMessage =
        'Invalid document.';

      return;
    }

    this.documentService
      .downloadDocument(
        selectedDocument.id
      )
      .subscribe({

        next: (blob: Blob) => {

          const url =
            window.URL.createObjectURL(
              blob
            );

          const anchor =
            window.document.createElement('a');

          anchor.href = url;

          anchor.download =
            selectedDocument.document_name ||
            'contract-document';

          window.document.body.appendChild(
            anchor
          );

          anchor.click();

          anchor.remove();

          window.URL.revokeObjectURL(
            url
          );
        },

        error: (error: any) => {

          console.error(
            'Failed to download document:',
            error
          );

          this.errorMessage =
            this.getErrorMessage(
              error,
              'Unable to download document.'
            );
        }

      });
  }

  // ==========================================
  // EXPIRY STATUS
  // ==========================================

  getExpiryStatus(
    expiryDate: string
  ): string {

    if (!expiryDate) {
      return 'No Expiry';
    }

    const today =
      new Date();

    const expiry =
      new Date(expiryDate);

    today.setHours(
      0,
      0,
      0,
      0
    );

    expiry.setHours(
      0,
      0,
      0,
      0
    );

    if (expiry < today) {
      return 'Expired';
    }

    const difference =
      expiry.getTime() -
      today.getTime();

    const days =
      Math.ceil(
        difference /
        (1000 * 60 * 60 * 24)
      );

    if (days <= 30) {
      return 'Expiring Soon';
    }

    return 'Active';
  }
}