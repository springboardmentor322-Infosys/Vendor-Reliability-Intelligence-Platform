import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CommunicationService, Message } from '../../../../core/services/communication.service';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-message-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './message-thread.component.html',
  styleUrl: './message-thread.component.css'
})
export class MessageThreadComponent implements OnInit {
  threadType: string = '';
  threadId: number = 0;
  messages: Message[] = [];
  newMessage: string = '';
  currentUserId: number = 0;
  apiBaseUrl = environment.apiBaseUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private communicationService: CommunicationService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user ? user.id : 0;
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.threadType = params.get('type') || '';
      this.threadId = parseInt(params.get('id') || '0', 10);
      if (this.threadType && this.threadId) {
        this.loadThread();
      }
    });
  }

  loadThread() {
    this.communicationService.getMessages(this.threadType, this.threadId).subscribe({
      next: (data) => {
        // Reverse array to show oldest first (chronological top to bottom)
        this.messages = data.reverse();
        this.markUnread();
      },
      error: (err) => console.error('Error loading thread', err)
    });
  }

  markUnread() {
    this.messages.forEach(msg => {
      if (!msg.is_read && msg.sender_id !== this.currentUserId) {
        this.communicationService.markAsRead(msg.id).subscribe();
        msg.is_read = true;
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const payload = {
      thread_type: this.threadType,
      thread_id: this.threadId,
      message: this.newMessage
    };

    this.communicationService.sendMessage(payload).subscribe({
      next: (msg) => {
        this.messages.push(msg);
        this.newMessage = '';
      },
      error: (err) => console.error('Error sending message', err)
    });
  }
  
  downloadAttachment(msg: Message) {
    if (msg.attachment_path) {
      window.open(`${environment.apiBaseUrl}/communications/messages/${msg.id}/download`, '_blank');
    }
  }

  onFileSelected(event: any, msg: Message) {
    const file: File = event.target.files[0];
    if (file) {
      this.communicationService.uploadAttachment(msg.id, file).subscribe({
        next: () => {
          this.loadThread(); // Reload to get updated attachment info
        },
        error: (err) => alert('Upload failed: ' + (err.error?.detail || err.message))
      });
    }
  }
}
