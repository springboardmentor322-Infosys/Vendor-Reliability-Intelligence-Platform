import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

@Component({
  standalone: true,
 imports: [CommonModule],
  selector: 'app-notifications',
  styleUrl: './notifications.css',
  templateUrl: './notifications.html',
})
export class Notifications implements OnInit {

  notifications: any[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api.getNotifications().subscribe((data: any) => {

      console.log('NOTIFICATIONS DATA:', data);
      console.log('FIRST NOTIFICATION:', data.notifications[0]);

      this.notifications = data.notifications || [];

      this.cdr.detectChanges();
    });
  }
}