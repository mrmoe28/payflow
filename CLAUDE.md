# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Database operations
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Prisma Studio for database management
npm run db:generate      # Generate Prisma client (runs automatically on install)

# Build and deployment
npm run build           # Build for production (includes Prisma generate)
npm run start           # Start production server
npm run lint            # Run ESLint
npm run typecheck       # Run TypeScript compiler without emitting files

# Deployment verification
npm run verify:deployment  # Verify agent files are excluded from deployment
npm run prevalidate       # Full pre-deployment validation (verification + typecheck + lint)
```

## Architecture Overview

PayFlow is a digital document signing platform built with a modern full-stack TypeScript architecture:

### Core Stack Integration
- **Next.js 14** with App Router for full-stack React application
- **tRPC** provides end-to-end type safety between client and server
- **Prisma ORM** with PostgreSQL for type-safe database operations
- **NextAuth.js** handles authentication with OAuth and email providers
- **PWA** configuration enables mobile app-like experience

### tRPC API Pattern
The API is structured around two main routers in `src/server/api/routers/`:
- **Documents Router**: CRUD operations for document management
- **Signatures Router**: Handles digital signature workflow

API procedures use two main patterns:
- `publicProcedure` for unauthenticated endpoints (signature verification, public signing)
- `protectedProcedure` for authenticated endpoints (document creation, user management)

### Database Schema Architecture
The Prisma schema (`prisma/schema.prisma`) implements a document signing workflow:

**Core Models:**
- `User` - NextAuth.js compatible user model with PayFlow extensions
- `Document` - Stores document metadata, file references, and status
- `Signature` - Tracks signature requests and completions per recipient

**Status Flow:**
- Documents: `DRAFT → SENT → COMPLETED/EXPIRED/CANCELLED`
- Signatures: `PENDING → SIGNED/DECLINED/EXPIRED`

**Key Relationships:**
- Users can send multiple documents (1:many via `sentDocuments`)
- Documents can have multiple signatures (1:many via `signatures`)
- Signatures link back to both documents and users (many:1 relationships)

## Project Structure

### API Layer (`src/server/api/`)
- `root.ts` - Main tRPC router combining all sub-routers
- `routers/documents.ts` - Document CRUD and status management
- `routers/signatures.ts` - Signature capture and verification

### Authentication (`src/lib/auth.ts`)
NextAuth.js configuration with PrismaAdapter integration. Supports:
- Google OAuth provider
- Email magic link authentication
- Database session storage

### Client-Side API (`src/utils/api.ts`)
tRPC client configuration with React Query integration and superjson transformer for seamless data serialization.

### Database Connection (`src/lib/db.ts`)
Prisma client singleton with development caching to prevent connection exhaustion.

## Environment Configuration

Required environment variables (see `.env.example`):

### Database
```env
DATABASE_URL="postgresql://username:password@localhost:5432/payflow"
```

### Authentication
```env
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"  # or production URL
```

### OAuth Providers (optional)
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Email System (for notifications)
```env
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@payflow.com"
```

## Development Patterns

### Adding New API Endpoints
1. Create procedures in appropriate router file (`src/server/api/routers/`)
2. Use Zod schemas for input validation
3. Choose `publicProcedure` or `protectedProcedure` based on auth requirements
4. Export router from `src/server/api/root.ts`

### Database Schema Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push` to apply changes
3. Prisma client regenerates automatically

### Authentication Integration
- Use `useSession()` hook from NextAuth.js for client-side auth state
- tRPC context includes session data for server-side procedures
- Protected procedures automatically enforce authentication

## Specialized Development Agents

PayFlow includes four Python agents in the `agents/` directory for development assistance:

### PayFlow UI Design Agent (`payflow-ui-design-agent.py`)
- Document signing interface optimization
- Mobile-responsive design patterns
- Signature capture UX analysis

### PayFlow Error Handler Agent (`payflow-error-handler-agent.py`)
- File upload error diagnosis
- Signature validation troubleshooting
- Network connectivity issues for mobile users

### PayFlow Backend Stack Agent (`payflow-backend-stack-agent.py`)
- API security architecture
- Database optimization strategies
- Document processing pipeline design

### PayFlow Frontend Stack Agent (`payflow-frontend-stack-agent.py`)
- React component architecture
- PWA implementation patterns
- Performance optimization for document rendering

Run agents with: `python3 agents/[agent-name].py`

## PWA Configuration

The application is configured as a Progressive Web App:
- `public/manifest.json` defines app metadata and icons
- Service worker support for offline capabilities
- Mobile-optimized viewport and theme colors
- Touch-friendly signature capture interfaces

## Deployment Safety

PayFlow includes comprehensive deployment exclusion controls to prevent development tools from reaching production:

### Critical Exclusions
- **agents/** directory - All development agents are excluded from deployment
- **scripts/** directory - Setup and configuration scripts
- ***.py** files - Python agent scripts and tools
- ***.yaml** configuration files - Agent configurations
- **requirements.txt** - Python dependencies
- Development environment files and documentation

### Verification Process
Before any deployment, run the verification script:
```bash
npm run verify:deployment
```

This script confirms all agent files are properly excluded and provides deployment safety verification.

### .vercelignore Configuration
The `.vercelignore` file contains comprehensive patterns to exclude:
- All agent development tools
- Python environments and cache files
- Configuration and setup files  
- Development documentation
- Temporary and log files

**CRITICAL**: Never modify `.vercelignore` without running verification tests.

## Type Safety

The entire stack maintains end-to-end type safety:
- Database schema types via Prisma
- API input/output types via tRPC
- React component props via TypeScript
- Form validation via Zod schemas