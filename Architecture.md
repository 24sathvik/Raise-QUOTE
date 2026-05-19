# Raise Labs Quotation System - Architecture & Functionalities

## System Overview
The Raise Labs Quotation System is a premium, professional web-based tool designed to streamline the generation and management of quotations for pharmaceutical engineering products. Built with a modern tech stack, it provides distinct interfaces for administrative management and sales-focused quotation generation, while prioritizing a high-end, responsive user experience.

## Technology Stack
- **Frontend Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS for utility-first styling with a custom minimalist, premium aesthetic.
- **UI Components**: Shadcn UI (using Radix primitives), Lucide React for iconography.
- **State Management & Data Fetching**: React Hooks (useState, useEffect, useMemo), Next.js Server Actions for secure backend communications.
- **Backend & Database**: Supabase (PostgreSQL), utilizing Supabase Auth for user authentication and role-based access control (RBAC).
- **PDF Generation**: `jspdf` and `jspdf-autotable` for client-side PDF document generation.
- **Progressive Web App (PWA)**: Implemented for offline capabilities, home screen installation, and mobile optimization.

## System Architecture

The application follows a standard Next.js App Router architecture, separated into distinct domains for the sales team and administrators.

### Directory Structure
- `/src/app`: Contains the routing logic and page definitions.
  - `/auth`: Authentication pages (Login, handling sign-out).
  - `/admin`: The admin dashboard routes, accessible only to users with the 'admin' role. Includes management pages for users, products, categories, and an overview of all quotations.
  - `/quotations`: Sales user view of their created quotations.
  - `/(sales)`: Default root routes (`page.tsx`) mapping to the `QuotationBuilder`, optimized for rapid quotation drafting.
- `/src/components`: Reusable UI components.
  - `/admin`: Components specific to the admin interface (e.g., `AdminSidebar`).
  - `/quotation`: Complex components for the quotation workflow (e.g., `QuotationBuilder`, `QuotationsList`).
  - `/ui`: Fundamental building blocks (Buttons, Inputs, Dialogs) from Shadcn UI.
- `/src/lib`: Core utilities.
  - `supabase.ts` / `supabase-server.ts`: Supabase client initialization.
  - `pdf-service.ts`: Complex business logic for rendering standard-compliant PDFs.
  - `hooks/use-auth.tsx`: Authentication context provider.
- `/public`: Static assets, including the Zyxen branding (`Zyxen-logo.jpeg`), PWA manifest, and service worker.

## Core Functionalities

### 1. Authentication & Role-Based Access Control (RBAC)
- **Supabase Auth**: Secure email/password login.
- **Role Redirection**: Upon login, the system checks the user's profile role. `admin` users are directed to the admin dashboard, while `sales` or standard users are directed to the quotation builder.
- **Protected Routes**: Next.js middleware and server-side checks ensure unauthorized roles cannot access restricted areas.

### 2. Quotation Builder (Sales Interface)
- **Dynamic Product Selection**: Sales users can browse the product catalog, add items to a quotation, and toggle specific add-ons or line items.
- **Real-time Calculation**: Instant calculation of subtotals, margins (e.g., 30% markup for sales), discounts, and grand totals.
- **Currency Conversion**: Ability to toggle between INR and USD with real-time price conversion.
- **Draft Persistence**: The builder leverages `localStorage` to save the quotation state, preventing data loss if the browser reloads or crashes.
- **Terms & Conditions**: Dynamic inclusion of standard and warranty terms.

### 3. PDF Generation & Distribution
- **Client-Side Rendering**: Uses `jspdf` to generate pixel-perfect A4 quotations featuring company branding, customer details, itemized tables, and terms.
- **Cross-Platform Compatibility**: Enhanced download logic supporting iOS/Mac OS Safari by leveraging direct URL opening when blob downloads are blocked.
- **Cloud Storage**: Once generated, PDFs are uploaded to a Supabase Storage bucket, and a permanent URL is saved alongside the quotation record.

### 4. Admin Dashboard
- **Analytics & Overview**: High-level metrics on quotation volume, revenue, and system usage.
- **Product Management**: Full CRUD operations for the product catalog, including managing base prices, SKUs, rich descriptions, and add-ons.
- **User Management**: Administrators can provision new user accounts and assign roles (`admin` vs `sales`).
- **Quotation Tracking**: Admins can view all generated quotations across the system, track their status (Pending, Approved, Rejected), and download the associated PDFs.

### 5. Progressive Web App (PWA) Capabilities
- **Installability**: The application can be installed on desktop and mobile devices via the browser, appearing as a native application with a customized Zyxen icon.
- **Offline Resilience**: A registered Service Worker (`sw.js`) caches critical assets to ensure the app loads quickly and gracefully handles network instability.
