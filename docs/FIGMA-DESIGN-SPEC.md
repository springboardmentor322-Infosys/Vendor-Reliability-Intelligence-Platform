# Figma Design Specification

Use this document to build responsive Figma screens for Milestone 1. Wireframe references are in `WIREFRAMES.md`; layout grids are in `DASHBOARD-LAYOUTS.md`.

## Figma File Structure

```
VRIP — Milestone 1
├── 🎨 Design Tokens
│   ├── Colors
│   ├── Typography (Roboto)
│   └── Spacing (8px grid)
├── 📱 Mobile (375px)
├── 📱 Tablet (768px)
├── 🖥 Desktop (1440px)
└── 🔄 Prototypes
    ├── Auth Flow
    ├── Admin Flow
    └── Procurement Flow
```

## Frames to Create (10 screens × 3 breakpoints = 30 frames)

| Frame Name | Route | Key Components |
|------------|-------|----------------|
| Login | `/login` | Logo, email/password fields, login button, register link |
| Registration | `/register` | Full form with role dropdown |
| Dashboard | `/dashboard` | Sidebar, 4 KPI cards, recent vendors table |
| Vendor Management | `/vendors` | Search bar, data table, add button |
| Procurement Dashboard | `/procurement` | KPI cards, request table, FAB |
| Purchase Orders | `/purchase-orders` | PO table, status badges |
| Vendor Performance | `/performance` | Score table, progress bars |
| Analytics Dashboard | `/analytics` | 4 chart placeholder cards |
| Reports Dashboard | `/reports` | Filter row, report preview, export buttons |
| Notifications | `/notifications` | Notification list with read/unread states |

## Design Tokens

### Colors
- Primary: `#2563EB` (blue-600)
- Primary Dark: `#0F172A` (sidebar)
- Accent: `#60A5FA` (blue-400)
- Background: `#F4F7FB`
- Surface: `#FFFFFF`
- Text Primary: `#1E293B`
- Text Secondary: `#64748B`
- Success: `#16A34A`
- Warning: `#D97706`
- Error: `#DC2626`

### Typography
- Headline: Roboto 32px / 700
- Title: Roboto 24px / 600
- Body: Roboto 16px / 400
- Caption: Roboto 12px / 400

### Spacing (8px grid)
- xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px

### Components
- Button height: 48px, border-radius: 8px
- Input height: 48px, border-radius: 8px
- Card border-radius: 15px, shadow: 0 5px 15px rgba(0,0,0,0.08)
- Sidebar width: 250px

## Prototype Links

1. **Auth Flow:** Landing → Register → Login → Dashboard
2. **Vendor Flow:** Dashboard → Vendors → Add Vendor → Save → List
3. **Procurement Flow:** Dashboard → Procurement → New Request → List

## Handoff Notes

- Export assets at 1x and 2x for icons
- Use Auto Layout for all components
- Name layers with component prefix: `btn/`, `input/`, `card/`, `nav/`
- Link Figma file URL in README once created
