import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ContractsRoutingModule } from './contracts-routing.module';
import { ContractListComponent } from './components/contract-list/contract-list.component';
import { ContractDetailsComponent } from './components/contract-details/contract-details.component';
import { ContractUploadComponent } from './components/contract-upload/contract-upload.component';

@NgModule({
  declarations: [
    ContractListComponent,
    ContractDetailsComponent,
    ContractUploadComponent
  ],
  imports: [
    CommonModule,
    ContractsRoutingModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class ContractsModule { }
