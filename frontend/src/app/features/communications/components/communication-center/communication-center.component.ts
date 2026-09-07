import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommunicationService, Message } from '../../../../core/services/communication.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-communication-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './communication-center.component.html',
  styleUrl: './communication-center.component.css'
})
export class CommunicationCenterComponent implements OnInit {
  messages: Message[] = [];
  groupedThreads: any[] = [];
  
  filterType: string = '';
  filterSearch: string = '';
  
  constructor(
    private communicationService: CommunicationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadMessages();
  }

  loadMessages() {
    this.communicationService.getMessages().subscribe({
      next: (data) => {
        this.messages = data;
        this.applyFilters();
      },
      error: (err) => console.error('Error loading messages', err)
    });
  }

  applyFilters() {
    let filtered = this.messages;
    if (this.filterType) {
      filtered = filtered.filter(m => m.thread_type === this.filterType);
    }
    if (this.filterSearch) {
      const search = this.filterSearch.toLowerCase();
      filtered = filtered.filter(m => 
        m.message.toLowerCase().includes(search) || 
        m.thread_id.toString().includes(search)
      );
    }
    
    // Group by thread
    const groups = new Map();
    filtered.forEach(m => {
      const key = `${m.thread_type}-${m.thread_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          thread_type: m.thread_type,
          thread_id: m.thread_id,
          latest_message: m,
          unread_count: m.is_read ? 0 : 1
        });
      } else {
        const group = groups.get(key);
        if (!m.is_read) group.unread_count++;
      }
    });
    
    this.groupedThreads = Array.from(groups.values());
  }

  clearFilters() {
    this.filterType = '';
    this.filterSearch = '';
    this.applyFilters();
  }

  openThread(thread: any) {
    this.router.navigate(['/communications', thread.thread_type, thread.thread_id]);
  }
}
