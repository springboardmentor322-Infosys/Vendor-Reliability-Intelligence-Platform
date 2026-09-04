# Dashboard Layouts

## Layout Architecture

All authenticated pages share a common **App Shell** layout:

```
┌─────────────────────────────────────────────────────────────┐
│  mat-toolbar: VRIP Logo | Page Title | User Menu | Logout   │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  mat-sidenav │  Page Content (router-outlet)                │
│  (250px)     │                                              │
│              │  ┌─ KPI Cards (mat-card grid) ──────────┐  │
│  Nav Links   │  └───────────────────────────────────────┘  │
│              │  ┌─ Data Table (mat-table) ──────────────┐  │
│              │  └───────────────────────────────────────┘  │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

---

## Main Dashboard Layout

| Zone | Component | Content |
|------|-----------|---------|
| Header | Toolbar | "Dashboard" title, welcome message with user name |
| KPI Row | 4× mat-card | Total Vendors, Active Vendors, Pending Orders, Performance Records |
| Activity | mat-table | Recent vendors with name, category, status |

**Grid:** `grid-template-columns: repeat(4, 1fr)` on desktop; 2×2 on tablet; 1 column on mobile.

---

## Procurement Dashboard Layout

| Zone | Component | Content |
|------|-----------|---------|
| Header | Toolbar + FAB | "Procurement Dashboard", "+ New Request" button |
| KPI Row | 3× mat-card | Total Requests, Pending, Approved |
| Table | mat-table | Product, Quantity, Department, Priority, Status, Actions |

---

## Vendor Performance Dashboard Layout

| Zone | Component | Content |
|------|-----------|---------|
| Header | Toolbar | "Vendor Performance" |
| Score Cards | mat-card grid | Top 3 vendors by overall score |
| Table | mat-table | Delivery, Quality, Reliability, Overall scores |
| Progress | mat-progress-bar | Visual score indicator per vendor |

---

## Analytics Dashboard Layout

| Zone | Component | Content |
|------|-----------|---------|
| Row 1 | 2× mat-card (50/50) | Vendor count trend, Order volume summary |
| Row 2 | 2× mat-card (50/50) | Performance distribution, Category breakdown |
| Footer | mat-chip-set | Quick filters: Last 7 days, 30 days, 90 days |

*Charts are placeholder cards in Milestone 1; integrate Chart.js or ng2-charts in Milestone 2.*

---

## Reports Dashboard Layout

| Zone | Component | Content |
|------|-----------|---------|
| Filters | mat-form-field row | Report type select, date range |
| Preview | mat-card | Report summary table |
| Actions | mat-button row | Generate Report, Export CSV |

---

## Notification Screen Layout

| Zone | Component | Content |
|------|-----------|---------|
| Header | Toolbar | "Notifications", "Mark All Read" |
| List | mat-list | Notification items with icon, message, timestamp |
| Empty | mat-card | "No notifications" state |

---

## Color Palette (Material Theme)

| Token | Value | Usage |
|-------|-------|-------|
| Primary | Azure (#0078D4) | Buttons, sidebar active state, table headers |
| Surface | White / #F4F7FB | Page background |
| Sidebar | #0F172A | Navigation background |
| Success | #16A34A | Active status, approved |
| Warning | #D97706 | Pending status |
| Error | #DC2626 | Errors, inactive status |

---

## Responsive Behavior

| Breakpoint | Sidebar | KPI Grid | Table |
|------------|---------|----------|-------|
| Desktop ≥1024px | Fixed 250px | 4 columns | Full width |
| Tablet 768–1023px | Collapsible (mat-sidenav mode="over") | 2 columns | Horizontal scroll |
| Mobile ≤767px | Hamburger menu | 1 column | Card list view |
