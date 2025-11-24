# Event4U Management System

## Overview

Event4U is a comprehensive event management and inventory tracking system designed for event organizers. It supports multi-role management of events, inventory, stations, and real-time consumption tracking. The system features a company-centric hierarchy with role-based access control for Super Admins, Company Admins, Organizers, Warehouse Managers, and Bartenders, enabling efficient operations from platform-level oversight to event-specific inventory management and consumption tracking. Key capabilities include email verification, AI-powered analytics for insights, intelligent purchase order management, and multi-bartender station assignments.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 24, 2025
- **Email Verification System**: Implemented complete email verification flow with transactional rollback
  - Added `verificationToken` and `emailVerified` fields to users schema
  - Registration automatically sends verification email with confirmation link
  - Auto-company creation for gestore users: creates company during registration and assigns to user
  - Full transactional rollback: if email sending fails, deletes both user AND auto-created company (no orphan records)
  - Users cannot login until email is verified (except super_admin who bypasses verification)
  - Login page displays resend verification button with user's email for unverified accounts
  - Resend endpoint generates new token and sends new verification email
  - Verification page (`/verify-email`) handles token validation with success/error states
  - SMTP configuration via environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
- **AI-Powered Analytics**: Integrated OpenAI API for intelligent data analysis and insights
  - Added `analyzeWithAI()` storage method using OpenAI gpt-4o-mini model to analyze company data
  - Added `generateInsights()` storage method providing automated insights: low stock alerts, top consumed products, upcoming events, inventory health
  - New AI Analysis page (`/ai-analysis`) with insights dashboard and interactive chat interface
  - Chat interface allows natural language queries about consumption patterns, product usage, and inventory optimization
  - Insights cards display real-time warnings, trends, and recommendations based on company data
  - API key stored securely in Replit Secrets (OPENAI_API_KEY)
  - Company-scoped analysis: AI only accesses data from user's company
  - Sidebar integration: "Analisi AI" menu item for Admin and Warehouse roles
  - Bug fix: Corrected mutation callback to use userQuery parameter instead to prevent conversation history misalignment
- **New API Endpoints**:
  - `POST /api/verify-email/:token` - Verifies user email using verification token, marks account as verified
  - `POST /api/resend-verification` - Generates new verification token and sends new verification email
  - `POST /api/ai/analyze` - Accepts natural language query, returns AI-generated analysis with context
  - `GET /api/ai/insights` - Returns array of automated insights (warnings, info, success) based on current company data

### November 23, 2025
- **Purchase Order Management System**: Comprehensive system for managing supplier orders with intelligent suggestions
  - Added `purchaseOrders` and `purchaseOrderItems` tables to database schema
  - New suppliers management page with full CRUD operations (already existed)
  - New purchase orders page with list, filter, create, edit, delete operations
  - Intelligent order generation algorithm: analyzes stock levels vs minimum thresholds and consumption patterns
  - Automated suggestions calculate required quantities: (minThreshold * 2 - currentStock) + (avgConsumption * 7 days)
  - Export functionality: PDF and Excel generation for sending orders to suppliers
  - Company-scoped security: all endpoints validate user's company access
  - Sidebar menu integration: "Ordini" link in Inventario section for Admin and Warehouse roles
- **Multi-Bartender Assignment**: Stations now support multiple bartenders assignment instead of single bartender
  - Changed `assignedUserId` field to `bartenderIds` array in stations schema
  - Added multi-select checkbox UI for bartender assignment in station creation
  - Added inline editing UI on station cards to modify assigned bartenders with Set-based simultaneous editing
  - `editingStationIds` Set allows multiple cards to be in edit mode simultaneously without draft loss
  - `editingBartenderIds` Map stores per-station draft selections with functional updates to prevent stale closures
  - Bartender validation ensures only users with 'bartender' role from same company can be assigned
  - Test e2e verified: drafts preserved during query invalidation, concurrent editing safe
- **Personalized Dashboard Greetings**: All dashboard home pages now show personalized welcome messages
  - Super Admin: "Benvenuto, {firstName}" with operational subtitle
  - Gestore/Admin: "Benvenuto, {firstName}" with operational subtitle  
  - Bartender: Maintains "I Miei Eventi" title with "Benvenuto, {firstName}" in subtitle for task context
- **Gestore Impersonation Access**: Gestore users can now impersonate warehouse/bartender users
  - Impersonation button visible in users page for warehouse and bartender roles from same company
  - Restrictions: Cannot impersonate super_admin, other gestore, or users from different companies
  - Uses existing security model with `impersonatorId` session field
- **Removed Revenue Management**: Removed revenue management section from event detail page
- **Station Soft Delete**: Implemented soft delete for stations using `deletedAt` field - preserves historical event data
- **Station Deletion UI**: Added delete button for stations with confirmation dialog
- **Event Stations Display**: Added station count display in event cards on events list page
- **User Account Management**: 
  - Added `isActive` field for user account activation/deactivation
  - Added UI buttons to activate/deactivate user accounts
  - Added impersonation feature for super_admin and gestore users
  - Gestore can only impersonate users from their company (excluding super_admin and other gestore)
  - Added security protections: super_admin cannot self-deactivate, admins cannot modify super_admin accounts
- **Security Enhancements**:
  - Impersonation uses separate `impersonatorId` session field to prevent privilege escalation
  - Role-based protections in user PATCH endpoint
  - Soft delete filters on all station queries to preserve data integrity
- **New API Endpoints**:
  - `GET /api/purchase-orders` - List all purchase orders for user's company
  - `GET /api/purchase-orders/:id` - Get specific purchase order with company validation
  - `POST /api/purchase-orders` - Create new purchase order (auto-assigns companyId and createdBy)
  - `PATCH /api/purchase-orders/:id` - Update purchase order with company scope validation
  - `DELETE /api/purchase-orders/:id` - Delete purchase order and associated items
  - `GET /api/purchase-orders/:orderId/items` - List items for a purchase order
  - `POST /api/purchase-orders/:orderId/items` - Add item to purchase order
  - `PATCH /api/purchase-orders/:orderId/items/:itemId` - Update purchase order item
  - `DELETE /api/purchase-orders/:orderId/items/:itemId` - Delete purchase order item
  - `POST /api/purchase-orders/suggested` - Generate intelligent order suggestions based on stock alerts and consumption
  - `PATCH /api/stations/:id/bartenders` - Update bartenders assigned to a station (validates bartender role and company)
  - `POST /api/users/:id/impersonate` - Super admin can impersonate any user; gestore can impersonate users from their company (excluding admins)
  - `POST /api/users/stop-impersonation` - Return to original admin session
  - `DELETE /api/stations/:id` - Soft delete a station
  - `GET /api/events/:id/stocks` - Returns all stock items transferred to a specific event
  - `GET /api/companies/current` - Returns the company associated with the logged-in user

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. It utilizes Wouter for routing and Shadcn UI with Radix UI primitives, styled with Tailwind CSS, for an accessible and responsive user interface based on Material Design 3 principles. State management and data fetching are handled by TanStack Query v5, while form management uses React Hook Form with Zod for validation. The design emphasizes a card-based layout, role-based UI rendering, responsive grid systems, and fixed sidebar navigation, with path aliases for clean imports.

### Backend Architecture

The backend is developed with Node.js and Express.js, using TypeScript with ESM for RESTful APIs. It features a centralized error handling system and session-based authentication. The database layer employs Drizzle ORM for type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first approach defined in `shared/schema.ts` for full-stack type safety. A repository pattern in `server/storage.ts` provides an abstraction layer for CRUD operations across all entities. The system maintains a monorepo structure with separate development and production environments, serving static files in production and using Vite middleware in development.

### Authentication & Authorization

Authentication supports both Replit OAuth and classic email/password registration with BCrypt hashing and email verification. Session management is handled by `express-session` with a PostgreSQL store. Authorization is based on a Role-Based Access Control (RBAC) model with five roles: `super_admin`, `company_admin`, `organizer`, `warehouse`, and `bartender`. Security considerations include HTTP-only secure cookies, encrypted session data, role checks in API middleware, and company-scoped data access for multi-tenant isolation. Impersonation features for `super_admin` and `company_admin` roles are also implemented.

### Data Model & Business Logic

The system's data model links Companies to Users, Locations, Events, Products, and Price Lists. Events contain Stations, which track inventory via Stocks. Stock Movements log all inventory changes. The stock movement workflow involves loading general warehouse stock, transferring to events, allocating to stations, consumption by bartenders, and returning remaining stock. Events progress through `draft`, `scheduled`, `ongoing`, and `closed` lifecycle states. Key features include an email verification system, AI-powered analytics for insights like low stock alerts and consumption patterns, and a purchase order management system with intelligent order generation based on stock levels and consumption. Multi-bartender assignment to stations and user account activation/deactivation are also supported.

### Import/Export Features

The system supports CSV import for bulk product and price list item uploads with client-side validation and error reporting. Reporting capabilities include PDF generation for event reports (via jsPDF) and Excel export (via XLSX) for data analysis, covering revenue and consumption reports.

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Google Fonts CDN**: For consistent typography.
- **SMTP Email**: Nodemailer for sending verification emails.
- **Replit OAuth**: Optional authentication provider.
- **OpenAI API**: For AI-powered analytics and insights (`gpt-4o-mini`).

### Key NPM Packages
- **UI Components**: `@radix-ui/*`, `shadcn/ui`.
- **Forms & Validation**: `react-hook-form`, `zod`, `@hookform/resolvers`.
- **Data Fetching**: `@tanstack/react-query`.
- **Database**: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`.
- **Authentication**: `passport`, `openid-client`, `express-session`, `bcryptjs`.
- **Charts**: `recharts`.
- **File Processing**: `papaparse` (CSV), `jspdf` (PDF), `xlsx` (Excel).
- **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.