import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContractService } from '../../../../core/services/contract.service';

@Component({
  selector: 'app-contract-upload',
  templateUrl: './contract-upload.component.html',
  styleUrls: ['./contract-upload.component.css']
})
export class ContractUploadComponent implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  contractForm: FormGroup;
  selectedFile: File | null = null;
  complianceFlags = ['Insurance Missing', 'GST Missing', 'ISO Expired', 'NDA Missing', 'Signed Copy Missing'];

  constructor(
    private fb: FormBuilder,
    private contractService: ContractService
  ) {
    this.contractForm = this.fb.group({
      title: ['', Validators.required],
      vendor_id: ['', Validators.required],
      purchase_order_id: [''],
      contract_type: [''],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      contract_value: [''],
      currency: ['USD'],
      terms: [''],
      compliance_flags: [[]],
      renewal_required: [false],
      auto_renew: [false]
    });
  }

  ngOnInit(): void {}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] as File;
  }

  onComplianceChange(event: any) {
    const selectedOptions = Array.from(event.target.selectedOptions).map((opt: any) => opt.value);
    this.contractForm.patchValue({ compliance_flags: selectedOptions });
  }

  onSubmit() {
    if (this.contractForm.valid && this.selectedFile) {
      this.contractService.createContract(this.contractForm.value).subscribe({
        next: (contract) => {
          this.contractService.uploadContractDocument(contract.id, this.selectedFile!).subscribe({
            next: () => this.closeModal.emit(),
            error: (err) => console.error('Error uploading file', err)
          });
        },
        error: (err) => console.error('Error creating contract', err)
      });
    }
  }

  onCancel() {
    this.closeModal.emit();
  }
}
