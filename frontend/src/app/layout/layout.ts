import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Toast } from '../components/toast/toast';
import { Auth } from '../services/auth';
import { Notification } from '../services/notification';
import { Collaboration } from '../services/collaboration';
import { Vendor } from '../services/vendor';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    Toast
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout implements OnInit, OnDestroy {

  currentUser: any = null;

  navItems: NavItem[] = [];

  notifications: any[] = [];
  unreadNotifications = 0;
  showNotifications = false;
  showChat = false;
  chatVendors: any[] = [];
  selectedChatVendorId: number | null = null;
  chatThreadId: number | null = null;
  chatMessages: any[] = [];
  chatDraft = '';
  private notificationTimer: any;
  private chatTimer: any;

  private readonly commonSettings: NavItem[] = [
    {
      label: 'Settings',
      icon: '⚙️',
      route: '/settings'
    }
  ];

  private readonly menus: Record<string, NavItem[]> = {

    // ==========================================
    // ADMINISTRATOR
    // ==========================================

    Administrator: [

      {
        label: 'Dashboard',
        icon: '🏠',
        route: '/dashboard'
      },

      {
        label: 'Vendors',
        icon: '🏢',
        route: '/vendors'
      },

      {
        label: 'Procurement',
        icon: '📝',
        route: '/procurement'
      },

      {
        label: 'Purchase Orders',
        icon: '📦',
        route: '/orders'
      },

      {
        label: 'Contracts & Compliance',
        icon: '📄',
        route: '/contracts'
      },

      {
        label: 'Vendor Performance',
        icon: '📈',
        route: '/vendor-performance'
      },

      {
        label: 'Invoices & Payments',
        icon: '🧾',
        route: '/invoices'
      },

      {
        label: 'Order Tracking',
        icon: '🚚',
        route: '/deliveries'
      },

      {
        label: 'Reports & Analytics',
        icon: '📊',
        route: '/reports'
      },

      {
        label: 'Communications',
        icon: '💬',
        route: '/communication'
      },

      {
        label: 'Alerts & Notifications',
        icon: '🔔',
        route: '/notifications'
      },

      {
        label: 'User Management',
        icon: '👥',
        route: '/user-management'
      }

    ],


    // ==========================================
    // PROCUREMENT MANAGER
    // ==========================================

    'Procurement Manager': [

      {
        label: 'Dashboard',
        icon: '🏠',
        route: '/dashboard'
      },

      {
        label: 'Procurement Requests',
        icon: '📝',
        route: '/procurement'
      },

      {
        label: 'Purchase Orders',
        icon: '📦',
        route: '/orders'
      },

      {
        label: 'Vendors',
        icon: '🏢',
        route: '/vendors'
      },

      {
        label: 'Vendor Performance',
        icon: '📈',
        route: '/vendor-performance'
      },

      {
        label: 'Contracts & Compliance',
        icon: '📄',
        route: '/contracts'
      },

      {
        label: 'Invoices & Payments',
        icon: '🧾',
        route: '/invoices'
      },

      {
        label: 'Order Tracking',
        icon: '🚚',
        route: '/deliveries'
      },

      {
        label: 'Reports & Analytics',
        icon: '📊',
        route: '/reports'
      },

      {
        label: 'Budget & Spend Analysis',
        icon: '💰',
        route: '/budget-spend-analysis'
      },

      {
        label: 'Communications',
        icon: '💬',
        route: '/communication'
      },

      {
        label: 'Notifications',
        icon: '🔔',
        route: '/notifications'
      }

    ],


    // ==========================================
    // SUPPLY CHAIN MANAGER
    // ==========================================

    'Supply Chain Manager': [

      {
        label: 'Dashboard',
        icon: '🏠',
        route: '/dashboard'
      },

      {
        label: 'Vendors',
        icon: '🏢',
        route: '/vendors'
      },

      {
        label: 'Procurement',
        icon: '📝',
        route: '/procurement'
      },

      {
        label: 'Purchase Orders',
        icon: '📦',
        route: '/orders'
      },

      {
        label: 'Order Tracking',
        icon: '🚚',
        route: '/deliveries'
      },

      {
        label: 'Inventory Overview',
        icon: '📦',
        route: '/inventory-overview'
      },

      {
        label: 'Demand Planning',
        icon: '📉',
        route: '/demand-planning'
      },

      {
        label: 'Supplier Performance',
        icon: '📈',
        route: '/supplier-performance'
      },

      {
        label: 'Risk & Reliability',
        icon: '⚠️',
        route: '/risk-reliability'
      },

      {
        label: 'Contracts & Compliance',
        icon: '📄',
        route: '/contracts'
      },

      {
        label: 'Analytics & Reports',
        icon: '📊',
        route: '/reports'
      },

      {
        label: 'Communications',
        icon: '💬',
        route: '/communication'
      },

      {
        label: 'Alerts & Notifications',
        icon: '🔔',
        route: '/notifications'
      }

    ],


    // ==========================================
    // VENDOR
    // ==========================================

    Vendor: [

      {
        label: 'Dashboard',
        icon: '🏠',
        route: '/dashboard'
      },

      {
        label: 'Profile & Company',
        icon: '👤',
        route: '/profile-company'
      },

      {
        label: 'My Performance',
        icon: '📈',
        route: '/vendor-performance'
      },

      {
        label: 'Purchase Orders',
        icon: '📦',
        route: '/orders'
      },

      {
        label: 'Order & Delivery Tracking',
        icon: '🚚',
        route: '/deliveries'
      },

      {
        label: 'Invoices',
        icon: '🧾',
        route: '/invoices'
      },

      {
        label: 'Contracts & Compliance',
        icon: '📄',
        route: '/contracts'
      },

      {
        label: 'Communications',
        icon: '💬',
        route: '/communication'
      },

      {
        label: 'Notifications',
        icon: '🔔',
        route: '/notifications'
      },

      {
        label: 'Reports',
        icon: '📊',
        route: '/reports'
      }

    ],


    // ==========================================
    // FINANCE OFFICER
    // ==========================================

    'Finance Officer': [

      {
        label: 'Finance Dashboard',
        icon: '💰',
        route: '/finance-dashboard'
      },

      {
        label: 'Dashboard',
        icon: '🏠',
        route: '/dashboard'
      },

      {
        label: 'Purchase Orders',
        icon: '📦',
        route: '/orders'
      },

      {
        label: 'Invoices & Payments',
        icon: '🧾',
        route: '/invoices'
      },

      {
        label: 'Vendors',
        icon: '🏢',
        route: '/vendors'
      },

      {
        label: 'Contracts & Compliance',
        icon: '📄',
        route: '/contracts'
      },

      {
        label: 'Reports & Analytics',
        icon: '📊',
        route: '/reports'
      },

      {
        label: 'Communications',
        icon: '💬',
        route: '/communication'
      },

      {
        label: 'Notifications',
        icon: '🔔',
        route: '/notifications'
      }

    ],


    // ==========================================
    // AUDITOR
    // ==========================================

    Auditor: [

      {
        label: 'Dashboard',
        icon: '🏠',
        route: '/dashboard'
      },

      {
        label: 'Vendors',
        icon: '🏢',
        route: '/vendors'
      },

      {
        label: 'Procurement',
        icon: '📝',
        route: '/procurement'
      },

      {
        label: 'Purchase Orders',
        icon: '📦',
        route: '/orders'
      },

      {
        label: 'Contracts & Compliance',
        icon: '📄',
        route: '/contracts'
      },

      {
        label: 'Audit Plan',
        icon: '📋',
        route: '/audit-plan'
      },

      {
        label: 'Risk Assessment',
        icon: '⚠️',
        route: '/risk-assessment'
      },

      {
        label: 'Audit Findings',
        icon: '🔎',
        route: '/audit-findings'
      },

      {
        label: 'Audit Trails',
        icon: '🕘',
        route: '/audit-trails'
      },

      {
        label: 'Reports & Analytics',
        icon: '📊',
        route: '/reports'
      },

      {
        label: 'Document Review',
        icon: '📁',
        route: '/contract-documents'
      },

      {
        label: 'Communication Log',
        icon: '💬',
        route: '/communication'
      },

      {
        label: 'Alerts & Notifications',
        icon: '🔔',
        route: '/notifications'
      },

      {
        label: 'Control Assessment',
        icon: '✅',
        route: '/control-assessment'
      },

      {
        label: 'Checklist Management',
        icon: '☑️',
        route: '/checklist-management'
      },

    ]

  };


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private auth: Auth,
    private router: Router,
    private notificationService: Notification,
    private collaboration: Collaboration,
    private vendorService: Vendor
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadNotifications();
    this.notificationTimer = setInterval(() => this.loadNotifications(), 10000);
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: items => {
        this.notifications = items.slice(0, 8);
        this.unreadNotifications = items.filter((n:any) => !n.is_read).length;
      },
      error: err => console.error('Notification refresh failed', err)
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.loadNotifications();
  }

  markNotificationRead(item: any): void {
    const navigateToNotification = () => {
      this.showNotifications = false;

      // Contract-related notifications
      const title = String(item?.title || '').toLowerCase();
      const message = String(item?.message || '').toLowerCase();

      if (
        title.includes('contract') ||
        message.includes('contract') ||
        title.includes('expiry') ||
        message.includes('expiry') ||
        title.includes('compliance') ||
        message.includes('compliance')
      ) {
        this.router.navigate(['/contracts']);
        return;
      }

      // Procurement-related notifications
      if (
        title.includes('procurement') ||
        message.includes('procurement') ||
        title.includes('purchase order') ||
        message.includes('purchase order')
      ) {
        this.router.navigate(['/orders']);
        return;
      }

      // Delivery-related notifications
      if (
        title.includes('delivery') ||
        message.includes('delivery') ||
        title.includes('delay') ||
        message.includes('delay')
      ) {
        this.router.navigate(['/deliveries']);
        return;
      }

      // Vendor-related notifications
      if (
        title.includes('vendor') ||
        message.includes('vendor')
      ) {
        this.router.navigate(['/vendors']);
        return;
      }

      // Generic notification → Notifications page
      this.router.navigate(['/notifications']);
    };

    if (item.is_read) {
      navigateToNotification();
      return;
    }

    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.is_read = true;
        this.unreadNotifications = Math.max(
          0,
          this.unreadNotifications - 1
        );

        navigateToNotification();
      },
      error: err => {
        console.error('Failed to mark notification as read', err);

        // Still allow the user to open the relevant page.
        navigateToNotification();
      }
    });
  }
  openChat(): void {
    this.showChat = true;
    this.showNotifications = false;
    this.vendorService.getVendors().subscribe({
      next: vendors => {
        this.chatVendors = vendors;
        if (!this.selectedChatVendorId && vendors.length) this.selectedChatVendorId = vendors[0].id;
        this.loadChat();
      },
      error: err => console.error('Chat vendors failed', err)
    });
  }

  closeChat(): void {
    this.showChat = false;
    this.chatThreadId = null;
    this.chatMessages = [];
    if (this.chatTimer) clearInterval(this.chatTimer);
  }

  loadChat(): void {
    if (!this.selectedChatVendorId) return;
    this.collaboration.getThread('Vendor', this.selectedChatVendorId).subscribe({
      next: thread => { this.chatThreadId = thread.id; this.chatMessages = thread.messages || []; },
      error: err => console.error('Chat load failed', err)
    });
    if (this.chatTimer) clearInterval(this.chatTimer);
    this.chatTimer = setInterval(() => {
      if (!this.showChat || !this.selectedChatVendorId) return;
      this.collaboration.getThread('Vendor', this.selectedChatVendorId).subscribe({ next: t => this.chatMessages = t.messages || [] });
    }, 3000);
  }

  sendChat(): void {
    const content = this.chatDraft.trim();
    if (!content || !this.chatThreadId) return;
    this.collaboration.sendMessage(this.chatThreadId, content).subscribe({
      next: () => { this.chatDraft = ''; this.loadChat(); },
      error: err => alert(err?.error?.detail || 'Message could not be sent')
    });
  }

  ngOnDestroy(): void {
    if (this.notificationTimer) clearInterval(this.notificationTimer);
    if (this.chatTimer) clearInterval(this.chatTimer);
  }

  // ==========================================
  // LOAD CURRENT USER
  // ==========================================

  loadCurrentUser(): void {

    this.currentUser =
      this.auth.getCurrentUser();

    const role =
      this.currentUser?.role || 'Vendor';

    this.navItems = [

      ...(this.menus[role] ||
        this.menus['Vendor']),

      ...this.commonSettings

    ];

  }


  // ==========================================
  // LOGOUT
  // ==========================================

  logout(): void {

    this.auth.logout();

  }

}