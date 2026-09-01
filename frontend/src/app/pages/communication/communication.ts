import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RoleDirective } from '../../directives/role.directive';
import { FormsModule } from '@angular/forms';

import { Communication } from '../../services/communication';
import { Vendor } from '../../services/vendor';


@Component({
  selector: 'app-communication',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RoleDirective
  ],
  templateUrl: './communication.html',
  styleUrl: './communication.css'
})
export class CommunicationPage implements OnInit {


  // ==========================================
  // COMMUNICATION DATA
  // ==========================================

  communications =
    signal<any[]>([]);


  // ==========================================
  // VENDOR DATA
  // ==========================================

  vendors =
    signal<any[]>([]);


  // ==========================================
  // LOADING
  // ==========================================

  loading =
    signal(false);

  sending =
    signal(false);


  // ==========================================
  // FILTER
  // ==========================================

  selectedFilter =
    'All';

  selectedVendorFilter =
    'all';


  // ==========================================
  // FORM
  // ==========================================

  selectedVendorId:
    number | null = null;

  communicationType =
    'Vendor Message';

  subject = '';

  message = '';

  fileName = '';

  filePath = '';

  selectedFile:
    File | null = null;


  // ==========================================
  // FORM VISIBILITY
  // ==========================================

  showForm =
    signal(false);


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private communicationService:
      Communication,

    private vendorService:
      Vendor
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadVendors();

    this.loadCommunications();

  }


  // ==========================================
  // LOAD VENDORS
  // ==========================================

  loadVendors(): void {

    this.vendorService
      .getVendors()
      .subscribe({

        next: (response: any[]) => {

          this.vendors.set(
            response
          );

        },

        error: (error: any) => {

          console.error(
            'Failed to load vendors:',
            error
          );

        }

      });

  }


  // ==========================================
  // LOAD ALL COMMUNICATIONS
  // ==========================================

  loadCommunications(): void {

    this.loading.set(true);


    this.communicationService
      .getCommunications()
      .subscribe({

        next: (response: any[]) => {

          this.communications.set(
            response
          );

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load communications:',
            error
          );

          this.communications.set([]);

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // LOAD BY VENDOR
  // ==========================================

  loadVendorCommunications(
    vendorId: number
  ): void {

    this.loading.set(true);


    this.communicationService
      .getVendorCommunications(
        vendorId
      )
      .subscribe({

        next: (response: any[]) => {

          this.communications.set(
            response
          );

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load vendor communications:',
            error
          );

          this.communications.set([]);

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // LOAD BY TYPE
  // ==========================================

  loadTypeCommunications(
    type: string
  ): void {

    this.loading.set(true);


    this.communicationService
      .getCommunicationsByType(
        type
      )
      .subscribe({

        next: (response: any[]) => {

          this.communications.set(
            response
          );

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to filter communications:',
            error
          );

          this.communications.set([]);

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // FILTER COMMUNICATIONS
  // ==========================================

  filterCommunications(): void {

    const type =
      this.selectedFilter;

    const vendor =
      this.selectedVendorFilter;


    /*
     * If both filters are All,
     * load everything.
     */

    if (
      type === 'All' &&
      vendor === 'all'
    ) {

      this.loadCommunications();

      return;

    }


    /*
     * If only vendor is selected
     */

    if (
      type === 'All' &&
      vendor !== 'all'
    ) {

      this.loadVendorCommunications(
        Number(vendor)
      );

      return;

    }


    /*
     * If only type is selected
     */

    if (
      type !== 'All' &&
      vendor === 'all'
    ) {

      this.loadTypeCommunications(
        type
      );

      return;

    }


    /*
     * If BOTH vendor and type are selected,
     * load vendor communications first,
     * then filter the returned data by type.
     */

    this.loading.set(true);


    this.communicationService
      .getVendorCommunications(
        Number(vendor)
      )
      .subscribe({

        next: (response: any[]) => {

          const filtered =
            response.filter(
              item =>
                item.communication_type ===
                type
            );


          this.communications.set(
            filtered
          );

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to filter communications:',
            error
          );

          this.communications.set([]);

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // VENDOR FILTER CHANGE
  // ==========================================

  onVendorFilterChange(
    vendorId: string
  ): void {

    this.selectedVendorFilter =
      vendorId || 'all';

    this.filterCommunications();

  }


  // ==========================================
  // TYPE FILTER CHANGE
  // ==========================================

  onTypeFilterChange(
    type: string
  ): void {

    this.selectedFilter =
      type || 'All';

    this.filterCommunications();

  }


  // ==========================================
  // OPEN FORM
  // ==========================================

  openForm(): void {

    this.resetForm();

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

    this.selectedVendorId =
      null;

    this.communicationType =
      'Vendor Message';

    this.subject = '';

    this.message = '';

    this.fileName = '';

    this.filePath = '';

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
      !input.files ||
      input.files.length === 0
    ) {

      this.selectedFile =
        null;

      this.fileName =
        '';

      this.filePath =
        '';

      return;

    }


    this.selectedFile =
      input.files[0];


    this.fileName =
      this.selectedFile.name;


    this.filePath =
      '';

  }


  // ==========================================
  // UPLOAD FILE
  // ==========================================

  uploadSelectedFile(): void {

    if (!this.selectedFile) {

      alert(
        'Please select a file first.'
      );

      return;

    }


    this.sending.set(true);


    this.communicationService
      .uploadFile(
        this.selectedFile
      )
      .subscribe({

        next: (response: any) => {

          this.sending.set(false);


          this.fileName =
            response.file_name;


          this.filePath =
            response.file_path;


          alert(
            'File uploaded successfully.'
          );

        },

        error: (error: any) => {

          console.error(
            'File upload error:',
            error
          );


          this.sending.set(false);


          this.selectedFile =
            null;

          this.fileName =
            '';

          this.filePath =
            '';


          alert(
            error?.error?.detail ||
            'Failed to upload file.'
          );

        }

      });

  }


  // ==========================================
  // DOWNLOAD FILE
  // ==========================================

  downloadFile(
    filePath: string
  ): void {

    if (!filePath) {

      return;

    }


    const url =
      this.communicationService
        .getFileUrl(
          filePath
        );


    window.open(
      url,
      '_blank'
    );

  }


  // ==========================================
  // SEND COMMUNICATION
  // ==========================================

  sendCommunication(): void {

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
      !this.message.trim()
    ) {

      alert(
        'Please enter a message.'
      );

      return;

    }


    // ========================================
    // REQUEST DATA
    // ========================================

    const data = {

      vendor_id:
        this.selectedVendorId,

      communication_type:
        this.communicationType,

      subject:
        this.subject.trim() || null,

      message:
        this.message.trim(),

      file_name:
        this.fileName.trim() || null,

      file_path:
        this.filePath.trim() || null

    };


    // ========================================
    // SEND
    // ========================================

    this.sending.set(true);


    this.communicationService
      .createCommunication(data)
      .subscribe({

        next: () => {

          alert(
            'Communication sent successfully.'
          );

          this.sending.set(false);

          this.closeForm();

          this.filterCommunications();

        },

        error: (error: any) => {

          console.error(
            'Send communication error:',
            error
          );

          this.sending.set(false);

          alert(
            error?.error?.detail ||
            'Failed to send communication.'
          );

        }

      });

  }


  // ==========================================
  // DELETE COMMUNICATION
  // ==========================================

  deleteCommunication(
    id: number
  ): void {

    const confirmed =
      confirm(
        'Are you sure you want to delete this communication?'
      );


    if (!confirmed) {

      return;

    }


    this.communicationService
      .deleteCommunication(id)
      .subscribe({

        next: () => {

          alert(
            'Communication deleted successfully.'
          );

          this.filterCommunications();

        },

        error: (error: any) => {

          console.error(
            'Delete communication error:',
            error
          );

          alert(
            error?.error?.detail ||
            'Failed to delete communication.'
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
          item.id === vendorId
      );


    return vendor
      ? vendor.vendor_name
      : `Vendor #${vendorId}`;

  }


  // ==========================================
  // FORMAT DATE
  // ==========================================

  formatDate(
    dateValue: string
  ): string {

    if (!dateValue) {

      return '';

    }


    return new Date(
      dateValue
    ).toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );

  }


  // ==========================================
  // TYPE CLASS
  // ==========================================

  getTypeClass(
    type: string
  ): string {

    switch (type) {

      case 'Vendor Message':

        return 'type-vendor';


      case 'Procurement Discussion':

        return 'type-procurement';


      case 'Activity Log':

        return 'type-activity';


      default:

        return '';

    }

  }


  // ==========================================
  // TOTAL MESSAGES
  // ==========================================

  getTotalMessages(): number {

    return this.communications().length;

  }


  // ==========================================
  // PROCUREMENT COUNT
  // ==========================================

  getProcurementCount(): number {

    return this.communications()
      .filter(
        item =>
          item.communication_type ===
          'Procurement Discussion'
      )
      .length;

  }


  // ==========================================
  // VENDOR MESSAGE COUNT
  // ==========================================

  getVendorMessageCount(): number {

    return this.communications()
      .filter(
        item =>
          item.communication_type ===
          'Vendor Message'
      )
      .length;

  }


  // ==========================================
  // ACTIVITY LOG COUNT
  // ==========================================

  getActivityLogCount(): number {

    return this.communications()
      .filter(
        item =>
          item.communication_type ===
          'Activity Log'
      )
      .length;

  }

}