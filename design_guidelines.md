# Event4U Management System - Design Guidelines

## Design Approach

**Selected System:** Material Design 3 with Linear-inspired data presentation  
**Justification:** Enterprise-grade management platform requiring information density, role-based workflows, and real-time data visualization. Material Design 3 provides robust dark mode theming and Italian language support.

## Language & Localization

**Primary Language:** Italian (it-IT)
- Use Italian labels throughout: "Dashboard" → "Bacheca", "Events" → "Eventi", "Inventory" → "Inventario"
- Date formats: DD/MM/YYYY, 24-hour time
- Number formatting: European decimals (1.234,56)
- Maintain English as optional secondary language toggle in user settings

## Typography System

**Font Family:** Inter (Google Fonts CDN)  
**Weights:** 400 (regular), 500 (medium), 600 (semibold)

**Hierarchy:**
- Page Titles: text-2xl, font-semibold
- Section Headers: text-xl, font-semibold  
- Card Titles: text-lg, font-medium
- Body Text: text-base, font-normal
- Labels/Metadata: text-sm, font-normal
- Table Data: text-sm, font-medium (tabular-nums)

## Layout System

**Spacing Primitives:** Tailwind units 2, 4, 6, 8 (gap-4, p-6, py-8, etc.)

**Application Structure:**
- Fixed sidebar: w-64 on desktop, collapsible drawer on mobile
- Top header: h-16 with breadcrumbs, search, notifications, profile
- Content container: max-w-7xl, px-6, py-8
- Cards: rounded-lg, shadow-sm, p-6

**Responsive Grid Patterns:**
- Dashboard metrics: grid-cols-1 md:grid-cols-2 lg:grid-cols-4, gap-6
- Event cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3, gap-4
- Forms: grid-cols-1 lg:grid-cols-2, gap-6
- Tables: full-width with horizontal scroll below lg breakpoint

## Dark Mode Implementation

**Mode Toggle:** 
- Icon switch in top header (sun/moon using Heroicons)
- Persists preference in localStorage
- System preference detection as default

**Semantic Contrast Levels:**
- Surface elevation through subtle backdrop variations
- Text hierarchy: primary/secondary/tertiary opacity levels
- Borders: reduced opacity in dark mode for softer appearance
- Shadows: deeper and more pronounced in dark mode
- Interactive states: more visible in dark backgrounds

**Component Adaptations:**
- Cards: elevated surface treatment in dark mode
- Tables: alternating row treatment with subtle backdrop shift
- Inputs: darker backgrounds with lighter borders
- Buttons: higher contrast states for visibility
- Charts/graphs: adjusted line weights and opacity for dark backgrounds

## Navigation Components

**Sidebar:**
- Logo at top (h-16)
- Role-filtered menu sections with Heroicons (outline style)
- Active state: subtle accent border-l-3 indicator
- Sections: "Bacheca", "Eventi", "Inventario", "Rapporti", "Impostazioni"
- Bottom area: Company selector dropdown, user mini-profile
- Mobile: Full-screen drawer overlay with backdrop blur

**Top Bar:**
- Left: Breadcrumb with slash separators  
- Center: Global search (⌘K shortcut hint)
- Right: Dark mode toggle, notification bell with badge, user avatar dropdown

## Data Display Components

**Dashboard Stats Cards:**
- Large metric: text-3xl, font-semibold, tabular-nums
- Label: text-sm below metric
- Trend indicator: icon + percentage with directional arrow (Heroicons)
- Corner icon: large decorative icon (opacity-20 in light, opacity-10 in dark)
- Min height: h-32

**Tables:**
- Sticky header with filter/sort controls
- Hover state on rows (subtle backdrop change)
- Inline actions: appear on row hover (edit, delete icons)
- Pagination: bottom-aligned with items-per-page selector
- Empty states: centered icon, heading, description, CTA button
- Loading state: skeleton rows with shimmer animation

**Event Cards:**
- Header: Event name + status badge (Draft/Attivo/Concluso)
- Body: Date/time row with calendar icon, location row with pin icon, participant count
- Footer: Assigned staff avatars (max 3 + overflow count), quick actions menu
- Hover: subtle lift with shadow elevation change

**Inventory Cards:**
- Product name + thumbnail image (64x64, rounded)
- Stock level progress bar (current/capacity) 
- Critical/warning thresholds indicated by progress fill treatment
- Last updated timestamp
- Quick action: consumption adjustment buttons

## Form Components

**Input Fields:**
- Height: h-11 for text inputs
- Labels: top-aligned, text-sm, font-medium, required asterisk
- Helper text: text-xs below input
- Error states: red accent border, error icon right-aligned, error message below
- Success states: green accent border, checkmark icon
- Disabled states: reduced opacity, no-pointer cursor

**Special Inputs:**
- Date/Time: Material Design 3 picker modals
- Quantity: Large +/- buttons flanking display (mobile: min-h-14 touch targets)
- Selects: Dropdown with search for 10+ options
- Multi-select: Chip-based selection with overflow scroll

**Form Layout:**
- Section headers with divider below (text-lg, font-semibold, pb-4, border-b)
- Field groups with gap-6 vertical spacing
- Submit actions: right-aligned, primary + secondary buttons, gap-3
- Validation: real-time on blur, full validation on submit

## Role-Specific Dashboards

**Super Admin:**
- Company management grid with quick stats per company
- System health monitor (API status, storage usage)
- Activity feed with filterable user actions

**Company Admin:**  
- Quick metrics: upcoming events count, low stock alerts, active staff
- Calendar month-view of events
- Team overview with role distribution
- Inventory alerts prominently displayed

**Organizer:**
- Active events carousel (horizontally scrollable cards)
- Today's timeline view with real-time consumption tracking
- Quick create event floating action button (bottom-right, mobile)
- Stock status dashboard with critical items highlighted

**Warehouse Manager:**
- Stock levels table sortable by quantity/last update
- Transfer requests queue with approve/reject actions  
- Load/unload quick forms accessible from header
- Movement log with timeline visualization

**Bartender (Mobile-Optimized):**
- Today's events: large card list with station assignments
- Product list: searchable with large touch-friendly quantity controls
- Offline mode indicator with sync status
- Bottom navigation: Events, Scan Product, Profile

## Mobile Considerations

- Bottom tab navigation (4-5 primary actions)
- Simplified header: logo + notifications only
- Touch targets: min 44x44px (iOS) / 48x48px (Android)
- Swipe gestures: right-to-left for delete, pull-to-refresh
- Sticky CTAs at bottom with backdrop blur
- Haptic feedback on increment/decrement actions
- Reduced motion option respects system preferences

## Analytics & Reports

**Report Header:**
- Date range selector with presets (Oggi, Questa Settimana, Questo Mese, Personalizzato)
- Export buttons (PDF, Excel) with download icons
- Filter controls (by location, product category, event)

**Visualization Components:**
- Summary cards grid at top (total consumption, revenue, variance)
- Charts: Use Chart.js or similar library - bar charts for consumption, line charts for trends, donut charts for distribution
- Data tables: expandable rows for detailed breakdowns
- Comparison mode: side-by-side event analysis

**Station Reports:**
- Accordion-style expandable sections per station
- Per-station summary with bartender info, duration, total sales
- Product breakdown table: columns (Prodotto, Iniziale, Consumato, Rimanente, Costo)

## Images

**No hero images** - This is a utility-focused management application. All visual elements are component-based (icons, charts, data visualization).

**Product thumbnails:** Use throughout inventory cards and consumption logs (64x64 rounded squares).

## Accessibility

- Consistent focus indicators: 2px outline with offset
- ARIA labels on all icon-only buttons (Italian labels)
- Keyboard shortcuts documented in help modal (⌘K search, N new event, etc.)
- Screen reader announcements for real-time updates (stock changes, notifications)
- High contrast mode support in both light/dark themes
- Reduced motion: disable all transitions when prefers-reduced-motion is active