# Cloudflare Deployment Guide - Wakaf Bareng ID

This guide explains how to deploy Wakaf Bareng ID to Cloudflare Workers using the single-origin setup.

## Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler CLI installed (already added to dev dependencies)
3. Database ready (see Database section below)

## Setup Overview

The project has been configured for single-origin deployment:
- **Server (Hono)**: Runs as a Cloudflare Worker with `/api` base path
- **Client (React)**: Served as static assets via Cloudflare Workers Assets
- **Single Origin**: Both server and client served from the same domain

## Configuration Changes Made

### 1. Server Configuration (`server/src/index.ts`)
- API routes dengan `/api` prefix (e.g., `/api/auth`, `/api/donatur`, dll)
- Sertifikat download endpoint tetap di `/sertifikat/:id/download` (tanpa `/api` prefix) untuk akses langsung via browser/WhatsApp
- Updated CORS configuration for single-origin deployment
- Added comments about static file serving differences in Cloudflare

### 2. Client Configuration (`client/src/lib/api.ts`)
- Dynamic `BASE_URL` based on environment:
  - Development: Uses `VITE_SERVER_URL` or `http://localhost:3000/api`
  - Production: Uses `/api` (relative path for same-origin)
- Updated `downloadUrl` function to use `/sertifikat/:id/download` (tanpa `/api` prefix) untuk akses langsung via browser/WhatsApp

### 3. Cloudflare Configuration (`wrangler.jsonc`)
- Project name: `wakaf-bareng-id`
- Worker entry: `./server/dist/index.js`
- Static assets: `./client/dist`
- SPA routing enabled
- API routes handled by worker first
- Node.js compatibility enabled

### 4. Deployment Script
- Added `deploy` script to root `package.json`
- Runs `turbo build && wrangler deploy --minify`

## Deployment Steps

### 1. Login to Cloudflare

```bash
bunx wrangler login
```

This will open a browser to authenticate with your Cloudflare account.

### 2. Configure Environment Variables

For **local development** with Cloudflare Workers:
- Create `server/.dev.vars` file (already created)
- Add your environment variables:
  ```
  DATABASE_URL=your-database-connection-string
  JWT_SECRET=your-jwt-secret
  ```

For **production**:
```bash
bunx wrangler secret put DATABASE_URL
bunx wrangler secret put JWT_SECRET
```

### 3. Deploy

```bash
bun run deploy
```

This will:
1. Build all packages (client, server, shared)
2. Deploy to Cloudflare Workers
3. Provide a deployment URL

## Database Considerations

### Current Setup
The project currently uses PostgreSQL with Drizzle ORM. For Cloudflare Workers deployment, you have several options:

### Option 1: Cloudflare D1 (SQLite) - Recommended for Cloudflare
- **Pros**: Native Cloudflare integration, fast, free tier available
- **Cons**: Need to migrate from PostgreSQL to SQLite
- **Migration effort**: Medium (schema changes, query adjustments)

### Option 2: External PostgreSQL with Neon/Supabase
- **Pros**: Keep existing PostgreSQL setup, minimal changes
- **Cons**: Requires external service, may have latency
- **Migration effort**: Low (mostly configuration)

### Option 3: Cloudflare Workers with External PostgreSQL
- **Pros**: Keep PostgreSQL, use Cloudflare Workers for compute
- **Cons**: Requires TCP connection (may need special setup)
- **Migration effort**: Medium

### Recommended Approach
For Cloudflare Workers, consider migrating to **Cloudflare D1** for best performance and integration. This requires:

1. Update Drizzle schema for SQLite compatibility
2. Create D1 database: `bunx wrangler d1 create wakaf-bareng-db`
3. Update `wrangler.jsonc` with D1 binding
4. Run migrations: `bunx wrangler d1 execute wakaf-bareng-db --file=./server/src/db/migrations/...`

## Static File Storage

The project uses a `storage/` directory for:
- PDF certificates (`storage/sertifikat/`)
- Signature files (`storage/ttd/`)

For Cloudflare Workers, consider:
- **Cloudflare R2**: For file storage (similar to S3)
- **Cloudflare KV**: For smaller files and caching
- **External services**: AWS S3, Google Cloud Storage

Update the file serving logic in `server/src/index.ts` accordingly.

## Development vs Production URLs

### Development
- API: `http://localhost:3000/api`
- Client: `http://localhost:5173` (Vite dev server)
- Set `VITE_SERVER_URL=http://localhost:3000` in `client/.env.local`

### Production
- API: `https://your-worker-url.workers.dev/api`
- Client: `https://your-worker-url.workers.dev/`
- No environment variables needed (uses relative `/api`)

## Testing Deployment

After deployment:

1. Test the worker is running:
   ```bash
   curl https://your-worker-url.workers.dev/
   ```

2. Test API endpoint:
   ```bash
   curl https://your-worker-url.workers.dev/api/
   ```

3. Test the frontend:
   - Open `https://your-worker-url.workers.dev/` in browser
   - Verify all pages load correctly
   - Test API calls from the frontend

## Custom Domain (Optional)

To use a custom domain:

1. Add domain in Cloudflare dashboard
2. Update `wrangler.jsonc`:
   ```jsonc
   {
     "routes": [
       { "pattern": "your-domain.com/*", "zone_name": "your-domain.com" }
     ]
   }
   ```
3. Redeploy: `bun run deploy`

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `bun install`
- Check TypeScript errors: `bun run type-check`
- Verify build locally: `bun run build`

### Deployment Errors
- Check Wrangler authentication: `bunx wrangler whoami`
- Verify wrangler.jsonc configuration
- Check Cloudflare Workers dashboard for logs

### Runtime Errors
- Check environment variables are set correctly
- Verify database connectivity
- Check Cloudflare Workers logs: `bunx wrangler tail`

### CORS Issues
- Current CORS config allows all origins (`*`)
- For production, restrict to your domain:
  ```typescript
  app.use("*", cors({
    origin: "https://your-domain.com",
    credentials: true,
  }));
  ```

## Post-Deployment Checklist

- [ ] Database configured and accessible
- [ ] Environment variables set (production secrets)
- [ ] Static file storage configured (R2/KV/external)
- [ ] Custom domain configured (if needed)
- [ ] CORS settings restricted for production
- [ ] All API endpoints tested
- [ ] Frontend functionality tested
- [ ] PDF generation tested
- [ ] File upload/download tested
- [ ] Authentication flow tested

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Hono Cloudflare Workers Guide](https://hono.dev/docs/getting-started/cloudflare-workers)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
