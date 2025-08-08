# PayFlow Vercel Deployment Setup

This guide walks through setting up PayFlow on Vercel with all required environment variables.

## Prerequisites

1. GitHub repository connected to Vercel
2. Vercel CLI installed: `npm install -g vercel`
3. Google OAuth app configured for production domain
4. Email provider configured (Gmail recommended)

## Required Environment Variables

### 🔐 Critical Variables (Required)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string from Vercel Postgres | `postgres://user:pass@host/db` | ✅ |
| `NEXTAUTH_SECRET` | Random 32+ character secret for JWT encryption | `your-super-secure-32-char-secret` | ✅ |
| `NEXTAUTH_URL` | Production URL of your app | `https://payflow.vercel.app` | ✅ |

### 🔑 Google OAuth Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Google Cloud Console → APIs & Services → Credentials |

### 📧 Email System Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EMAIL_SERVER_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `EMAIL_SERVER_PORT` | SMTP port (587 for TLS) | `587` |
| `EMAIL_SERVER_USER` | Email account for sending | `your-app@gmail.com` |
| `EMAIL_SERVER_PASSWORD` | Email app password (not regular password) | `generated-app-password` |
| `EMAIL_FROM` | From email address | `noreply@payflow.com` |

### 📁 Optional File Upload Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `UPLOADTHING_SECRET` | UploadThing secret key | Optional |
| `UPLOADTHING_APP_ID` | UploadThing app ID | Optional |

## Step-by-Step Setup

### 1. Set Up Vercel Postgres Database

```bash
# In your Vercel dashboard:
# 1. Go to Storage tab
# 2. Create new PostgreSQL database
# 3. Copy the POSTGRES_URL connection string
```

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to **APIs & Services → Credentials**
5. Create **OAuth 2.0 Client ID**
6. Add your production domain to authorized origins:
   - `https://your-domain.vercel.app`
7. Add callback URL:
   - `https://your-domain.vercel.app/api/auth/callback/google`

### 3. Set Up Email Provider (Gmail Example)

1. Enable 2FA on your Google account
2. Generate an **App Password**:
   - Google Account → Security → App passwords
   - Generate password for "Mail"
3. Use this app password (not your regular password) for `EMAIL_SERVER_PASSWORD`

### 4. Configure Environment Variables

#### Option A: Using the Automated Script (Recommended)

1. **Copy and configure the environment template:**
   ```bash
   cp .env.vercel .env.vercel.local
   # Edit .env.vercel.local with your actual values
   ```

2. **Run the setup script:**
   ```bash
   ./scripts/setup-vercel-env.sh
   ```

#### Option B: Manual Setup via Vercel CLI

```bash
# Link to your Vercel project
vercel link

# Set critical variables
vercel env add DATABASE_URL "your-postgres-url" production
vercel env add NEXTAUTH_SECRET "your-32-char-secret" production
vercel env add NEXTAUTH_URL "https://your-domain.vercel.app" production

# Set Google OAuth
vercel env add GOOGLE_CLIENT_ID "your-client-id" production
vercel env add GOOGLE_CLIENT_SECRET "your-client-secret" production

# Set email configuration
vercel env add EMAIL_SERVER_HOST "smtp.gmail.com" production
vercel env add EMAIL_SERVER_PORT "587" production
vercel env add EMAIL_SERVER_USER "your-email@gmail.com" production
vercel env add EMAIL_SERVER_PASSWORD "your-app-password" production
vercel env add EMAIL_FROM "noreply@your-domain.com" production
```

#### Option C: Via Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Navigate to **Settings → Environment Variables**
3. Add each variable with **Production** environment selected

### 5. Deploy and Test

```bash
# Deploy to production
vercel --prod

# Test the deployment
# 1. Visit your production URL
# 2. Test Google OAuth login
# 3. Check email notifications
# 4. Verify database connectivity
```

## Security Best Practices

### Generate Secure NEXTAUTH_SECRET

```bash
# Generate a secure 32+ character secret
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Database Security

- Use Vercel Postgres for production (automatically secured)
- Enable connection pooling if using external PostgreSQL
- Never expose database credentials in client-side code

### Email Security

- Use app-specific passwords, not account passwords
- Consider using dedicated email service for production (SendGrid, Postmark)
- Implement email rate limiting to prevent abuse

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Verify DATABASE_URL is correct
- Ensure Vercel Postgres is properly configured
- Check connection limits

**OAuth Login Issues:**
- Verify Google OAuth app configuration
- Check authorized origins and redirect URIs
- Ensure client ID and secret are correct

**Email Not Sending:**
- Verify app password is used (not account password)
- Check SMTP settings are correct
- Test email configuration in development first

**Build Failures:**
- Ensure all required environment variables are set
- Check that Prisma can generate the client
- Verify Next.js build succeeds locally

### Vercel CLI Commands

```bash
# List all environment variables
vercel env ls

# Remove an environment variable
vercel env rm VARIABLE_NAME production

# View deployment logs
vercel logs

# Get project information
vercel inspect
```

## Production Checklist

- [ ] Vercel Postgres database created and connected
- [ ] All environment variables set in production
- [ ] Google OAuth app configured for production domain
- [ ] Email provider configured and tested
- [ ] NEXTAUTH_SECRET is secure (32+ characters)
- [ ] NEXTAUTH_URL matches production domain
- [ ] SSL certificate is active (handled by Vercel)
- [ ] Custom domain configured (if applicable)
- [ ] Database migrations applied
- [ ] Test authentication flow
- [ ] Test email notifications
- [ ] Monitor deployment logs for errors

## Support

If you encounter issues:
1. Check Vercel deployment logs: `vercel logs`
2. Verify environment variables: `vercel env ls`
3. Test locally with production environment variables
4. Review this setup guide for missed steps

---

**PayFlow** - Digital Document Signing Made Simple