# One More Mile - Project Knowledge Base

## Project Overview
One More Mile is a comprehensive travel platform that connects experienced guides (Senseis) with adventure seekers for transformative travel experiences. The platform facilitates trip creation, booking, management, and communication between all parties.

## Core Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

## User Roles & Permissions

### 1. Admin
- **Email**: kenny_hermans93@hotmail.com (hardcoded admin)
- **Capabilities**:
  - Manage all trips, applications, and users
  - View analytics and system overview
  - Approve/reject Sensei applications
  - Manage backup Sensei assignments
  - Create admin announcements
  - Manage payment settings and requirements

### 2. Senseis (Guides)
- **Requirements**: Must apply and be approved
- **Capabilities**:
  - Create and manage personal profiles
  - View assigned trips
  - Communicate with trip participants
  - Manage availability and certificates
  - Apply as backup Sensei for other trips
  - View admin announcements

### 3. Customers (Travelers)
- **Capabilities**:
  - Browse and book trips
  - Manage personal profiles
  - Communicate with Senseis
  - Upload required documents
  - Leave reviews and ratings
  - Manage personal todos

## Key Features

### Authentication & Profiles
- Supabase Auth integration
- Separate profile tables for Senseis and customers
- Role-based access control via RLS policies
- Profile image uploads to Supabase Storage

### Trip Management
- **Trip Creation**: Admin-created or Sensei-proposed
- **Trip Status**: draft, pending_approval, approved
- **Trip Data**:
  - Basic info (title, destination, description, dates)
  - Pricing and group size limits
  - Difficulty levels and themes
  - Detailed programs and itineraries
  - Requirements and amenities
- **Trip Calendar**: Visual calendar interface
- **Trip Reviews**: Customer rating and feedback system

### Sensei Management
- **Application System**: Complete application flow with CV upload
- **Skill & Certificate Management**: Verified credentials system
- **Availability Settings**: Month-based unavailability tracking
- **Backup System**: Automatic backup Sensei assignment
- **Smart Suggestions**: AI-powered Sensei matching for trips
- **Permissions**: Granular trip-level permissions

### Booking & Payment
- **Trip Bookings**: Complete booking workflow
- **Payment Tracking**: Status monitoring and reminders
- **Document Management**: Required document uploads
- **Customer Todos**: Task management for trip preparation

### Communication System
- **Trip Messaging**: Group and private messaging
- **Announcements**: Admin-to-Sensei and Sensei-to-participants
- **Real-time Updates**: Live messaging capabilities
- **File Sharing**: Document and media sharing

### Admin Dashboard
- **Overview Analytics**: Trip and Sensei statistics
- **Application Management**: Review and approve Sensei applications
- **Trip Oversight**: Manage all trips and assignments
- **User Management**: Customer and Sensei administration
- **System Settings**: Payment configurations and announcements

## Database Schema

### Core Tables
- `trips`: Trip information and status
- `sensei_profiles`: Sensei information and capabilities
- `customer_profiles`: Customer personal information
- `applications`: Sensei application submissions
- `trip_bookings`: Customer trip reservations

### Management Tables
- `trip_requirements`: Skill/certificate requirements per trip
- `sensei_skills`: Sensei skill inventory
- `sensei_certificates`: Verified certificates
- `backup_sensei_applications`: Backup Sensei assignments
- `trip_permissions`: Granular Sensei permissions

### Communication Tables
- `announcements`: Sensei-to-participant messaging
- `admin_announcements`: Admin-to-Sensei messaging
- `trip_messages`: Group and private messaging
- `trip_reviews`: Customer feedback system

### Support Tables
- `customer_documents`: Document uploads
- `customer_todos`: Task management
- `trip_cancellations`: Cancellation tracking
- `payment_settings`: System configuration

## Edge Functions
- `assign-backup-sensei`: Automatic backup assignment
- `cancel-trip`: Trip cancellation handling
- `get-mapbox-token`: Map integration
- `payment-reminders`: Payment notification system
- `send-contact-email`: Contact form handling

## Storage Buckets
- `sensei-profiles`: Sensei profile images (public)
- `trip-images`: Trip photos and media (public)
- `cv-uploads`: Application CVs (public)
- `customer-documents`: Customer documents (private)

## Security Features
- Row Level Security (RLS) on all tables
- Role-based data access
- Secure file uploads
- Admin-only sensitive operations
- User data isolation

## User Journeys

### Customer Journey
1. Browse trips on explore page
2. View trip details and requirements
3. Create account and profile
4. Book trip and make payment
5. Upload required documents
6. Communicate with Sensei
7. Complete trip and leave review

### Sensei Journey
1. Submit application with CV
2. Wait for admin approval
3. Create detailed profile
4. Get assigned to trips or apply as backup
5. Manage trip communications
6. Handle trip execution
7. Receive customer feedback

### Admin Journey
1. Review Sensei applications
2. Create and assign trips
3. Monitor system performance
4. Manage backup assignments
5. Handle cancellations and issues
6. Send announcements and updates

## Business Logic

### Trip Assignment
- Smart Sensei suggestions based on skills/location/availability
- Backup Sensei system for cancellations
- Requirement matching for qualified assignments

### Payment System
- Configurable payment deadlines
- Automated reminder system
- Status tracking and reporting

### Quality Control
- Sensei application review process
- Certificate verification system
- Customer review and rating system
- Trip requirement validation

## Integration Points
- Mapbox for location services
- Resend for email notifications
- Supabase for all backend services
- React Query for state management

## Development Practices
- TypeScript for type safety
- Tailwind CSS with design system tokens
- Component-based architecture
- Real-time data synchronization
- Responsive design patterns

This knowledge base captures the current state of the One More Mile platform as of T=0.