import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommunicationCenterComponent } from './components/communication-center/communication-center.component';
import { MessageThreadComponent } from './components/message-thread/message-thread.component';

const routes: Routes = [
  { path: '', component: CommunicationCenterComponent },
  { path: ':type/:id', component: MessageThreadComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CommunicationsRoutingModule { }
