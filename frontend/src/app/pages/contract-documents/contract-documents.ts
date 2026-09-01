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
  // SELECTED CONTRACT
  // ==========================================

  contractId: number | null = null;


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

    // Documents are loaded after
    // entering a Contract ID.

  }


  // ==========================================
  // LOAD DOCUMENTS
  // ==========================================

  loadDocuments(): void {

    if (!this.contractId) {

      this.errorMessage =
        'Please enter a valid Contract ID.';

      return;

    }


    this.loading.set(true);

    this.errorMessage = '';

    this.successMessage = '';


    this.documentService
      .getContractDocuments(this.contractId)
      .subscribe({

        next: (response: any[]) => {

          this.documents.set(response);

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
            error?.error?.detail ||
            'Unable to load contract documents.';

        }

      });

  }


  // ==========================================
  // OPEN ADD FORM
  // ==========================================

  openAddForm(): void {

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

    this.successMessage = '';

    this.errorMessage = '';


    // ------------------------------------------
    // VALIDATE CONTRACT
    // ------------------------------------------

    if (!this.contractId) {

      this.errorMessage =
        'Please enter a Contract ID.';

      return;

    }


    // ------------------------------------------
    // VALIDATE CERTIFICATION
    // ------------------------------------------

    if (!this.certificationName.trim()) {

      this.errorMessage =
        'Certification name is required.';

      return;

    }


    // ------------------------------------------
    // VALIDATE DATES
    // ------------------------------------------

    if (
      this.issueDate &&
      this.expiryDate &&
      this.expiryDate < this.issueDate
    ) {

      this.errorMessage =
        'Expiry date cannot be before issue date.';

      return;

    }


    // ------------------------------------------
    // IMPORTANT:
    // KEEP THE FILE BEFORE RESETTING FORM
    // ------------------------------------------

    const fileToUpload =
      this.selectedFile;


    // ------------------------------------------
    // REQUEST DATA
    // ------------------------------------------

    const data = {

      contract_id:
        this.contractId,

      certification_name:
        this.certificationName.trim(),

      certification_number:
        this.certificationNumber.trim(),

      issue_date:
        this.issueDate,

      expiry_date:
        this.expiryDate,

      status:
        this.status

    };


    // ==========================================
    // UPDATE EXISTING DOCUMENT
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


            // ----------------------------------
            // UPLOAD NEW FILE IF SELECTED
            // ----------------------------------

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
              error?.error?.detail ||
              'Unable to update document.';

          }

        });


      return;

    }


    // ==========================================
    // CREATE NEW DOCUMENT
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


          // ----------------------------------
          // CHECK DOCUMENT ID
          // ----------------------------------

          if (!documentId) {

            this.errorMessage =
              'Document was created, but no document ID was returned.';

            return;

          }


          // ----------------------------------
          // CLOSE FORM
          // ----------------------------------

          this.showForm.set(false);

          this.resetForm();


          // ----------------------------------
          // UPLOAD FILE
          // ----------------------------------

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
            error?.error?.detail ||
            'Unable to create document.';

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
            error?.error?.detail ||
            'Unable to upload document.';

        }

      });

  }


  // ==========================================
  // DELETE DOCUMENT
  // ==========================================

  deleteDocument(
    documentId: number
  ): void {

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
            error?.error?.detail ||
            'Unable to delete document.';

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


          // Use window.document so there
          // is no naming conflict.

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
            error?.error?.detail ||
            'Unable to download document.';

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


    // Remove time portion so that
    // date comparison is more reliable.

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


    // ------------------------------------------
    // EXPIRED
    // ------------------------------------------

    if (expiry < today) {

      return 'Expired';

    }


    // ------------------------------------------
    // DAYS REMAINING
    // ------------------------------------------

    const difference =
      expiry.getTime() -
      today.getTime();


    const days =
      Math.ceil(
        difference /
        (1000 * 60 * 60 * 24)
      );


    // ------------------------------------------
    // EXPIRING SOON
    // ------------------------------------------

    if (days <= 30) {

      return 'Expiring Soon';

    }


    // ------------------------------------------
    // ACTIVE
    // ------------------------------------------

    return 'Active';

  }

}