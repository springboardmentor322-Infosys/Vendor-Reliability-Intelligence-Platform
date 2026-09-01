import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RoleDirective } from '../../directives/role.directive';

import {
  Notification
} from '../../services/notification';


@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    RoleDirective
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit {


  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  notifications =
    signal<any[]>([]);


  // ==========================================
  // UNREAD COUNT
  // ==========================================

  unreadCount =
    signal(0);


  // ==========================================
  // LOADING
  // ==========================================

  loading =
    signal(false);


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private notificationService: Notification
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadNotifications();

  }


  // ==========================================
  // LOAD NOTIFICATIONS
  // ==========================================

  loadNotifications(): void {

    this.loading.set(true);


    this.notificationService
      .getNotifications()
      .subscribe({

        next: (response: any[]) => {

          this.notifications.set(
            response
          );

          this.loadUnreadCount();

          this.loading.set(false);

        },


        error: (error: any) => {

          console.error(
            'Failed to load notifications:',
            error
          );

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // LOAD UNREAD COUNT
  // ==========================================

  loadUnreadCount(): void {

    this.notificationService
      .getUnreadCount()
      .subscribe({

        next: (response: any) => {

          this.unreadCount.set(
            response?.count || 0
          );

        },


        error: (error: any) => {

          console.error(
            'Failed to load unread count:',
            error
          );

        }

      });

  }


  // ==========================================
  // MARK AS READ
  // ==========================================

  markAsRead(
    notification: any
  ): void {

    if (notification.is_read) {

      return;

    }


    this.notificationService
      .markAsRead(notification.id)
      .subscribe({

        next: () => {

          notification.is_read = true;

          this.notifications.set([
            ...this.notifications()
          ]);

          this.loadUnreadCount();

        },


        error: (error: any) => {

          console.error(
            'Failed to mark notification as read:',
            error
          );

        }

      });

  }


  // ==========================================
  // MARK ALL AS READ
  // ==========================================

  markAllAsRead(): void {

    if (this.unreadCount() === 0) {

      return;

    }


    this.notificationService
      .markAllAsRead()
      .subscribe({

        next: () => {

          const updated =
            this.notifications().map(
              notification => ({
                ...notification,
                is_read: true
              })
            );


          this.notifications.set(
            updated
          );

          this.unreadCount.set(0);

        },


        error: (error: any) => {

          console.error(
            'Failed to mark all notifications as read:',
            error
          );

        }

      });

  }


  // ==========================================
  // DELETE NOTIFICATION
  // ==========================================

  deleteNotification(
    notificationId: number
  ): void {

    this.notificationService
      .deleteNotification(notificationId)
      .subscribe({

        next: () => {

          const updated =
            this.notifications().filter(
              notification =>
                notification.id !==
                notificationId
            );


          this.notifications.set(
            updated
          );

          this.loadUnreadCount();

        },


        error: (error: any) => {

          console.error(
            'Failed to delete notification:',
            error
          );

        }

      });

  }


  // ==========================================
  // GET NOTIFICATION ICON
  // ==========================================

  getNotificationIcon(
    type: string
  ): string {

    switch (type) {

      case 'Contract Expiry':

        return '📄';


      case 'Delivery Delay':

        return '🚚';


      case 'Vendor Approval':

        return '👤';


      case 'Compliance':

        return '🛡️';


      case 'Procurement Alert':

        return '📦';


      default:

        return '🔔';

    }

  }


  // ==========================================
  // GET NOTIFICATION CLASS
  // ==========================================

  getNotificationClass(
    type: string
  ): string {

    switch (type) {

      case 'Contract Expiry':

        return 'type-contract';


      case 'Delivery Delay':

        return 'type-delivery';


      case 'Vendor Approval':

        return 'type-approval';


      case 'Compliance':

        return 'type-compliance';


      case 'Procurement Alert':

        return 'type-procurement';


      default:

        return 'type-default';

    }

  }


  // ==========================================
  // FORMAT DATE
  // ==========================================

  formatDate(
    date: string
  ): string {

    if (!date) {

      return '';

    }


    return new Date(date)
      .toLocaleString();

  }

}