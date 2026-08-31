# Cloudflare Deployment Guide - Wakaf Bareng ID

This guide explains how to deploy Wakaf Bareng ID to Cloudflare Workers using the single-origin setup.

## ⚠️ Important Notes

### Current Limitations
The project currently uses **Bun-specific features** that are not compatible with Cloudflare Workers. For successful Cloudflare deployment, you need to address the following:

1. **Database**: Currently uses PostgreSQL with `postgres` driver (not compatible with Cloudflare Workers)
2. **File System**: Uses `fs` module for file operations (not available in Cloudflare Workers)
3. **File Storage**: Uses local file system for PDF certificates (needs Cloudflare R2 or external storage)

### Deployment Strategy
Due to these limitations, you have two options:

**Option 1: Use Cloudflare Pages + External Backend (Recommended)**
- Deploy React frontend to Cloudflare Pages
- Keep backend on a traditional hosting (Railway, Render, DigitalOcean, etc.)
- Use API calls to communicate between frontend and backend

**Option 2: Full Cloudflare Migration (Advanced)**
- Migrate database to Cloudflare D1 (SQLite)
- Implement file storage with Cloudflare R2
- Remove Bun-specific dependencies
- Refactor code for Cloudflare Workers compatibility

## Option 1: Cloudflare Pages + External Backend (Recommended)

This approach requires minimal changes and leverages Cloudflare for frontend hosting while keeping the backend on traditional infrastructure.

### Frontend Deployment to Cloudflare Pages

1. **Build the frontend:**
```bash
bun run build:client
```

2. **Deploy to Cloudflare Pages:**
```bash
# Install Wrangler if not already installed
bun add --dev wrangler

# Login to Cloudflare
bunx wrangler login

# Create a Pages project
bunx wrangler pages project create wakaf-bareng-frontend

# Deploy the built frontend
bunx wrangler pages deploy ./client/dist --project-name=wakaf-bareng-frontend
```

3. **Configure environment variables:**
In Cloudflare Pages dashboard, set:
```
VITE_SERVER_URL=https://your-backend-url.com
```

### Backend Deployment (External)

Deploy the backend to a service that supports Node.js/Bun:
- **Railway**: Easy deployment, good PostgreSQL support
- **Render**: Free tier available, good for hobby projects
- **DigitalOcean App Platform**: Reliable, good performance
- **AWS/ECS**: Enterprise option

### API Configuration

The frontend is already configured to use dynamic `BASE_URL`:
- Development: Uses `VITE_SERVER_URL` environment variable
- Production: Uses relative `/api` path (needs adjustment for external backend)

Update `client/src/lib/api.ts` for external backend:
```typescript
const BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000/api";
```

## Option 2: Full Cloudflare Migration (Advanced)

This requires significant refactoring but provides a complete serverless solution.

### Required Changes

#### 1. Database Migration (PostgreSQL → Cloudflare D1)

**Current schema:** `server/src/db/schema.ts` (PostgreSQL)

**Steps:**
1. Convert PostgreSQL schema to SQLite
2. Update Drizzle ORM configuration for D1
3. Create D1 database:
```bash
bunx wrangler d1 create wakaf-bareng-db
```

4. Update `wrangler.jsonc`:
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "wakaf-bareng-db",
      "database_id": "your-database-id"
    }
  ]
}
```

5. Update `server/src/db/client.ts`:
```typescript
import { drizzle } from "drizzle-orm/d1";

export const db = drizzle(c.env.DB, { schema });
```

#### 2. File Storage Migration (Local FS → Cloudflare R2)

**Current:** Uses local `storage/` directory with `fs` module

**Steps:**
1. Create R2 bucket:
```bash
bunx wrangler r2 bucket create wakaf-bareng-storage
```

2. Update `wrangler.jsonc`:
```jsonc
{
  "r2_buckets": [
    {
      "binding": "STORAGE",
      "bucket_name": "wakaf-bareng-storage"
    }
  ]
}
```

3. Implement R2 upload/download functions in `server/src/lib/storage.ts`:
```typescript
export async function uploadToR2(bucket: R2Bucket, key: string, data: ArrayBuffer) {
  await bucket.put(key, data);
}

export async function getFromR2(bucket: R2Bucket, key: string) {
  const object = await bucket.get(key);
  if (!object) return null;
  return await object.arrayBuffer();
}
```

4. Update certificate generation to use R2 instead of local files

#### 3. Remove Bun-Specific Dependencies

**Files to update:**
- `server/src/index.ts` - Remove `serveStatic` from `hono/bun`
- `server/src/index.bun.ts` - Keep for local development
- `server/package.json` - Remove Bun-specific dependencies if needed

#### 4. Update Server Entry Point

The current `server/src/index.ts` is Cloudflare-compatible but needs database and storage implementations.

## Development vs Production

### Local Development (Bun)
```bash
# Uses index.bun.ts with full Bun features
bun run dev:server
```

### Cloudflare Development
```bash
# Uses index.ts with Cloudflare-compatible code
bunx wrangler dev
```

### Production Deployment
```bash
# Deploy to Cloudflare Workers
bun run deploy
```

## Current Deployment Status

### ✅ What's Ready
- React frontend build configuration
- API routing structure with `/api` prefix
- CORS configuration for single-origin
- Wrangler configuration file
- TypeScript compilation for Cloudflare Workers

### ❌ What Needs Work
- Database migration (PostgreSQL → D1)
- File storage implementation (FS → R2)
- Environment variable bindings
- Certificate PDF generation for cloud environment
- Static file serving for Cloudflare Workers

## Alternative: Use Different PaaS

If Cloudflare Workers migration seems too complex, consider these alternatives that support the current stack:

### Recommended PaaS Options

1. **Railway**
   - Excellent PostgreSQL support
   - Easy deployment
   - Good free tier
   - Supports Bun natively

2. **Render**
   - Simple deployment
   - PostgreSQL included
   - Free tier available
   - Good documentation

3. **Fly.io**
   - Global deployment
   - PostgreSQL support
   - Docker-based deployment
   - Good performance

4. **DigitalOcean App Platform**
   - Reliable infrastructure
   - PostgreSQL managed databases
   - Competitive pricing
   - Good scalability

## Quick Start with Railway (Easiest)

1. Create a Railway account
2. Create a new project
3. Add PostgreSQL database
4. Connect your GitHub repository
5. Set environment variables:
   - `DATABASE_URL` (from Railway)
   - `JWT_SECRET`
6. Deploy

## Conclusion

For the quickest path to production:
1. **Deploy frontend to Cloudflare Pages** (static hosting)
2. **Deploy backend to Railway/Render** (supports current stack)
3. **Connect via API calls** using environment variables

For a complete Cloudflare solution:
1. Plan database migration to D1
2. Implement R2 for file storage
3. Refactor code for Workers compatibility
4. Test thoroughly before deployment

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
