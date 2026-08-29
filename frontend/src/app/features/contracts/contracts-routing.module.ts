import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContractListComponent } from './components/contract-list/contract-list.component';
import { ContractDetailsComponent } from './components/contract-details/contract-details.component';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  { 
    path: '', 
    component: ContractListComponent,
    canActivate: [roleGuard(['Administrator', 'Procurement Manager', 'Finance Officer', 'Auditor', 'Vendor'])]
  },
  { 
    path: ':id', 
    component: ContractDetailsComponent,
    canActivate: [roleGuard(['Administrator', 'Procurement Manager', 'Finance Officer', 'Auditor', 'Vendor'])]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContractsRoutingModule { }
