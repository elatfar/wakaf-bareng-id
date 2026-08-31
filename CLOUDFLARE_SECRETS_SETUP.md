# Cloudflare Secrets Setup Guide

## 🔐 Setting Up Secrets for Cloudflare Workers Deployment

This guide explains how to properly set up environment variables and secrets for Cloudflare Workers deployment without exposing them in git or build logs.

## 📋 Prerequisites

1. Cloudflare account with Workers access
2. Wrangler CLI installed
3. Your database connection string and JWT secret ready

## 🚀 Step-by-Step Setup

### Step 1: Set Secrets via Cloudflare Dashboard (Recommended)

**Method A: Via Cloudflare Dashboard**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Select your worker `wakaf-bareng-id`
4. Go to **Settings** → **Variables and Secrets**
5. Click **Add variable**
6. For each secret:
   - **Variable name**: `DATABASE_URL` or `JWT_SECRET`
   - **Type**: Select **Encrypted** (NOT Plaintext)
   - **Value**: Enter your secret
   - Click **Encrypt** and **Save**

**Method B: Via Wrangler CLI**
```bash
# Login to Cloudflare (if not already logged in)
bunx wrangler login

# Set DATABASE_URL
bunx wrangler secret put DATABASE_URL
# Enter your PostgreSQL connection string when prompted

# Set JWT_SECRET
bunx wrangler secret put JWT_SECRET
# Enter your JWT secret when prompted
```

### Step 2: Verify Secrets are Set

```bash
# List all secrets (won't show values, just confirms they exist)
bunx wrangler secret list
```

Expected output:
```
🔒 Found the following secrets for wakaf-bareng-id:
- DATABASE_URL
- JWT_SECRET
```

### Step 3: Configure wrangler.jsonc

Make sure your `wrangler.jsonc` does NOT contain any secrets:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "wakaf-bareng-id",
  "main": "./server/dist/index.js",
  "compatibility_date": "2026-08-31",
  "assets": {
    "directory": "./client/dist",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "compatibility_flags": ["nodejs_compat"],
  "_comment": "IMPORTANT: Secrets (DATABASE_URL, JWT_SECRET) must be set via Cloudflare Dashboard, NOT in this file"
}
```

### Step 4: Local Development Setup

For local development, create a `.dev.vars` file:

```bash
# server/.dev.vars
DATABASE_URL=postgresql://user:password@host/database
JWT_SECRET=your-local-secret-here
```

**Important:** Ensure `.dev.vars` is in `.gitignore`:
```gitignore
.dev.vars
.env
.env.local
```

### Step 5: Test Configuration

**Test local development:**
```bash
# The server will use .dev.vars
cd server
bun run dev
```

**Test Cloudflare deployment:**
```bash
# This will use secrets from Cloudflare Dashboard
bun run deploy
```

## 🔍 Troubleshooting

### Issue: "DATABASE_URL is not set"
**Cause:** Secrets not properly set in Cloudflare Dashboard
**Solution:**
```bash
# Verify secrets exist
bunx wrangler secret list

# If missing, set them again
bunx wrangler secret put DATABASE_URL
bunx wrangler secret put JWT_SECRET
```

### Issue: Secrets get overwritten on deployment
**Cause:** Secrets set as "vars" in wrangler.jsonc instead of "secrets"
**Solution:**
- Remove secrets from `wrangler.jsonc`
- Set them via Cloudflare Dashboard as "Encrypted" secrets
- Secrets set via dashboard won't be overwritten by deployments

### Issue: Local development uses wrong secrets
**Cause:** `.dev.vars` file not found or not configured
**Solution:**
- Create `server/.dev.vars` with local secrets
- Ensure `.dev.vars` is in `.gitignore`
- Restart the development server

## 📝 Best Practices

### DO ✅
- Set secrets via Cloudflare Dashboard as "Encrypted"
- Use `.dev.vars` for local development
- Keep `.dev.vars` in `.gitignore`
- Use different secrets for dev and production
- Rotate secrets regularly
- Use strong, randomly generated secrets

### DON'T ❌
- Put secrets in `wrangler.jsonc` or `wrangler.toml`
- Commit secrets to git repository
- Use "Plaintext" variables for sensitive data
- Share secrets via chat, email, or tickets
- Use the same secrets across environments
- Log secrets in build logs or console

## 🔐 Secret Generation

### Generate Secure JWT Secret
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Database Connection String Format
```
postgresql://username:password@host:port/database
```

Example:
```
postgresql://wakaf_user:secure_password@ep-cool-neon.us-east-2.aws.neon.tech/wakaf_db
```

## 🚀 Deployment After Secret Setup

Once secrets are properly configured:

```bash
# Build and deploy
bun run deploy

# The deployment will use secrets from Cloudflare Dashboard
# Build logs will NOT expose the secret values
```

## 📞 Additional Resources

- [Cloudflare Workers Secrets Documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Security Best Practices](https://developers.cloudflare.com/workers/configuration/secrets/#best-practices)

---

**Remember:** Proper secret management is critical for application security. Never commit secrets to git or include them in configuration files that are part of your repository.
