import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { Toast } from '../components/toast/toast';
import { Auth } from '../services/auth';

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
    Toast
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout implements OnInit {

  currentUser: any = null;

  navItems: NavItem[] = [];

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
    private router: Router,
    private auth: Auth
  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.loadCurrentUser();

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