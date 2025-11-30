# Event4U Management System - Updated Design Guidelines

## Design Approach

**Selected Style:** Custom nightclub/social events aesthetic inspired by modern event discovery platforms  
**Justification:** Club management system requiring immersive visual experience with event imagery, real-time status tracking, and mobile-first bartender workflows. Dark theme reduces eye strain in low-light venue environments.

## Color System

**Primary Palette:**
- Background: #0a0e17 (near-black with blue tint)
- Surface Cards: #151922 (slightly elevated from background)
- Golden Accent: #FFD700 (primary CTAs, highlights, active states)
- Teal Status: #00CED1 (live events, active indicators, success states)
- Text Primary: #FFFFFF (high contrast)
- Text Secondary: #94A3B8 (reduced opacity for metadata)
- Border Subtle: #1e2533 (card borders, dividers)
- Error: #EF4444
- Warning: #F59E0B

**Glass-Morphism Treatment:**
- backdrop-blur-xl on overlays and floating elements
- background: rgba(21, 25, 34, 0.7) for glass cards
- border: 1px solid rgba(255, 255, 255, 0.1)

## Typography System

**Font Family:** Inter (Google Fonts)  
**Weights:** 400, 500, 600, 700

**Hierarchy:**
- Hero Headings: text-4xl, font-bold (on event cards)
- Page Titles: text-3xl, font-bold
- Section Headers: text-xl, font-semibold
- Card Titles: text-lg, font-semibold
- Body: text-base, font-normal
- Metadata: text-sm, font-medium, text-secondary
- Labels: text-xs, font-medium, uppercase, tracking-wide

## Layout System

**Spacing:** Tailwind units 2, 4, 6, 8, 12

**Desktop Structure:**
- Fixed sidebar: w-72, glass-morphism treatment
- Content area: max-w-7xl, px-6, py-8
- Cards: rounded-2xl, overflow-hidden for image crops

**Mobile Structure:**
- Full-width content with px-4
- Fixed bottom navigation: h-20, backdrop-blur-xl, safe-area-inset-bottom
- Floating action buttons: bottom-24 offset to clear nav

**Grid Patterns:**
- Event grid: grid-cols-1 md:grid-cols-2 xl:grid-cols-3, gap-6
- Stats dashboard: grid-cols-2 lg:grid-cols-4, gap-4
- Product grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4, gap-4

## Navigation Components

**Desktop Sidebar:**
- Logo area: h-20, golden accent glow effect
- Module sections: Bacheca, Eventi, Beverage, Contabilità, Personale, Cassa, File della Serata
- Icons: Heroicons (outline, 24px)
- Active state: golden left border-l-3, golden icon tint, bg-surface highlight
- Bottom: User profile card with glass background

**Mobile Bottom Nav:**
- 5 primary actions: Eventi, Beverage, Scansione (center FAB with golden bg, elevated), Cassa, Profilo
- Icons: 28px, active state with golden fill
- Labels: text-xs below icons
- Center FAB: w-14 h-14, rounded-full, shadow-2xl, golden gradient

**Top Bar (Both Platforms):**
- Left: Current module title
- Center: Global search with glass background, golden focus ring
- Right: Live event indicator (teal pulse dot), notifications, avatar

## Core Components

**Event Cards:**
- Aspect ratio: 16:9 hero image with gradient overlay (linear-gradient(180deg, transparent 0%, rgba(10,14,23,0.9) 100%))
- Content overlay: absolute bottom positioning, p-6
- Event name: text-2xl, font-bold, white
- Date/time row: teal icon, text-sm
- Location: pin icon, text-sm
- Status badge: top-right absolute, glass pill with teal/golden glow
- Hover: scale-105 transform, enhanced shadow
- CTA buttons on overlay: glass background with blur, white text, no hover effects (inherit button states)

**Filter Pills:**
- Horizontal scroll row: flex, gap-3, overflow-x-auto, pb-2
- Pill style: px-4 py-2, rounded-full, border border-subtle
- Active: bg-golden, text-black, font-semibold
- Inactive: bg-surface, text-secondary
- Icons: 16px leading icon

**Beverage Cards:**
- Product image: 96x96, rounded-lg, left-aligned
- Right content: product name (text-lg, font-semibold), category badge, stock bar
- Stock bar: h-2, rounded-full, bg-surface, fill based on threshold (teal: healthy, golden: medium, red: critical)
- Quantity controls: Large -/+ buttons (min-h-12 touch targets), golden on active
- Background: glass-morphism card

**Forms:**
- Input height: h-12
- Background: rgba(21, 25, 34, 0.5), border border-subtle
- Focus: golden ring-2, enhanced backdrop blur
- Labels: text-sm, font-medium, text-secondary, mb-2
- Error states: red border, shake animation
- Date/time pickers: Modal with glass backdrop, teal accents for selections
- Submit area: sticky bottom on mobile, glass background, golden primary button

**Tables (Desktop Reports):**
- Glass card container with rounded-2xl
- Header: sticky, bg-surface, border-b border-subtle
- Rows: hover bg-surface with subtle glow
- Alternating rows: subtle opacity shift
- Actions: golden icon buttons, appear on row hover
- Pagination: bottom-right, golden active page

**Map Discovery (Eventi Module):**
- Full-height map view with Mapbox/Google Maps
- Event markers: custom golden pin icons, cluster on zoom out
- Selected event: floating glass card overlay (bottom-anchored on mobile, sidebar on desktop)
- Card shows: event image (small), name, date, distance, CTA button
- Toggle: map/list view switch in header

## Module-Specific Interfaces

**Beverage Dashboard:**
- Top: Filter pills (Categoria, Stazione, Stock Level)
- Quick stats: 4-card grid (Prodotti Totali, Stock Critico, Consumo Oggi, Valore Inventario)
- Main grid: Product cards with images, scrollable
- Floating action: "Registra Consumo" golden button

**File della Serata (Event Night File):**
- Timeline view: vertical line with time markers on left
- Activity cards: glass containers with staff avatar, action type, timestamp, product details
- Real-time indicator: teal pulse animation at current time
- Filters: By station, by staff, by product
- Export button: top-right, golden outline

**Cassa (Cash Register):**
- Large number display: tabular-nums, text-5xl, golden for totals
- Quick add buttons: 2x3 grid of preset amounts, glass background
- Transaction list: scrollable with glass cards, timestamp + amount
- Bottom totals: sticky glass container, breakdown (Cash, Card, Total)

## Images

**Hero Images Required:**
- Event cards: 16:9 landscape, 800x450px minimum, show venue/crowd/atmosphere
- Event detail pages: Full-width hero, 1920x600px, darker gradient overlay for text
- Product thumbnails: 96x96px, white/transparent background, rounded corners
- Staff avatars: 48x48px circles throughout
- Company/venue logos: Top sidebar, 200x60px max, maintain aspect ratio

**Image Treatment:**
- All event images: Subtle blue tint overlay to match theme (multiply blend mode, rgba(10,14,23,0.15))
- Gradient overlays: Always bottom-to-top, darker at text areas
- Loading states: Shimmer animation on skeleton rectangles

## Mobile Considerations

- Bottom nav clears content with pb-24 on container
- Swipe gestures: Left-to-right for sidebar drawer, down for refresh
- Touch targets: 48x48px minimum, 56x56px for primary actions
- Sticky headers: Collapse on scroll down, reappear on scroll up
- Modal sheets: Slide up from bottom with glass backdrop, rounded-t-3xl
- Haptic feedback: On quantity increment/decrement, on successful actions
- Safe areas: Respect notch/home indicator with safe-area-inset padding

## Accessibility

- Focus indicators: 2px golden ring with 2px offset
- Icon-only buttons: Italian ARIA labels (es. "Apri menu", "Cerca eventi")
- Keyboard shortcuts: ⌘K search, N nuovo evento, B beverage module
- Screen reader: Announce live event updates, stock changes
- Contrast: All text meets WCAG AA on dark backgrounds (4.5:1 minimum)
- Reduced motion: Disable scale transforms, pulse animations when prefers-reduced-motion active
- Touch feedback: Visual state changes (opacity 0.8) on press for all interactive elements