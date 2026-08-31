# Quick Deployment Guide - Wakaf Bareng ID

This guide provides the quickest path to deploy Wakaf Bareng ID to production using services that support the current technology stack.

## 🚀 Recommended Approach: Split Deployment

Deploy frontend to Cloudflare Pages (static hosting) and backend to Railway (supports Bun + PostgreSQL).

## Frontend Deployment (Cloudflare Pages)

### 1. Build the Frontend
```bash
cd wakaf-bareng-id
bun run build:client
```

### 2. Deploy to Cloudflare Pages

#### Option A: Via Wrangler CLI
```bash
# Install Wrangler
bun add --dev wrangler

# Login to Cloudflare
bunx wrangler login

# Create Pages project
bunx wrangler pages project create wakaf-bareng-frontend

# Deploy
bunx wrangler pages deploy ./client/dist --project-name=wakaf-bareng-frontend
```

#### Option B: Via Cloudflare Dashboard
1. Go to Cloudflare Dashboard → Pages
2. "Create a project" → "Upload Assets"
3. Upload the contents of `client/dist/`
4. Set custom domain if needed

### 3. Configure Environment Variables
In Cloudflare Pages dashboard → Settings → Environment Variables:
```
VITE_SERVER_URL=https://your-backend-url.railway.app
```

## Backend Deployment (Railway)

### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Sign up/login
- Connect your GitHub account

### 2. Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `wakaf-bareng-id` repository
4. Configure build settings:
   - **Build Command**: `cd server && bun install && bun run build`
   - **Start Command**: `cd server && bun run dist/index.js`

### 3. Add PostgreSQL Database
1. In Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will provide `DATABASE_URL`

### 4. Set Environment Variables
In Railway project settings:
```
DATABASE_URL=<from Railway PostgreSQL service>
JWT_SECRET=your-secure-random-secret-here
NODE_ENV=production
PORT=3000
```

### 5. Deploy
Railway will automatically deploy when you push to GitHub.

## Alternative Backend Options

### Render
1. Create account at [render.com](https://render.com)
2. Create "Web Service"
3. Connect GitHub repository
4. Set build command: `cd server && bun install && bun run build`
5. Set start command: `cd server && bun run dist/index.js`
6. Add PostgreSQL database
7. Set environment variables

### DigitalOcean App Platform
1. Create account at [digitalocean.com](https://digitalocean.com)
2. Create "Apps" → "Create App"
3. Connect GitHub repository
4. Configure build and run settings
5. Add PostgreSQL database
6. Set environment variables

## Post-Deployment Configuration

### 1. Update Client API Configuration
Make sure `client/src/lib/api.ts` uses the correct server URL:

```typescript
const BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000/api";
```

### 2. Update CORS Configuration
In `server/src/index.ts`, restrict CORS to your frontend domain:

```typescript
app.use("*", cors({
  origin: "https://your-frontend-domain.pages.dev",
  credentials: true,
}));
```

### 3. Test the Deployment
1. Test frontend: Open your Cloudflare Pages URL
2. Test backend health: `https://your-backend-url.railway.app/`
3. Test API: `https://your-backend-url.railway.app/api/`
4. Test login functionality
5. Test certificate generation (will need storage solution)

## Storage Solution for Certificates

Since Railway doesn't provide persistent file storage, you have several options:

### Option 1: Cloudflare R2 (Recommended)
1. Create R2 bucket in Cloudflare
2. Use R2 SDK in your backend
3. Update certificate generation to upload to R2
4. Serve downloads via R2 public URLs

### Option 2: AWS S3
1. Create S3 bucket
2. Use AWS SDK in backend
3. Configure appropriate permissions
4. Update certificate generation logic

### Option 3: Temporary Storage (Not Recommended)
- Store certificates in database as base64
- Not recommended for production due to size limits

## Custom Domain Setup

### Frontend (Cloudflare Pages)
1. In Cloudflare Pages dashboard → Settings → Custom Domains
2. Add your domain (e.g., `app.wakafbareng.id`)
3. Configure DNS records as instructed

### Backend (Railway)
1. In Railway project → Settings → Domains
2. Add your domain (e.g., `api.wakafbareng.id`)
3. Configure DNS records as instructed

## Monitoring and Maintenance

### Railway
- Built-in metrics and logs
- Automatic deployments on git push
- Easy scaling options

### Cloudflare Pages
- Analytics dashboard
- Preview deployments
- Easy rollbacks

## Cost Estimate

### Cloudflare Pages
- Free tier: 500 builds/month
- Paid: $20/month for unlimited builds

### Railway
- Free tier: $5 credit (good for testing)
- Paid: ~$20-30/month for production with database

### Total: ~$20-50/month for production

## Troubleshooting

### Frontend Issues
- Check Cloudflare Pages logs
- Verify environment variables
- Ensure API URL is correct

### Backend Issues
- Check Railway logs
- Verify database connection
- Check environment variables
- Ensure port is correctly configured

### CORS Issues
- Verify CORS configuration
- Check allowed origins
- Ensure credentials are handled correctly

## Security Considerations

1. **Environment Variables**: Never commit secrets to git
2. **CORS**: Restrict to your frontend domain only
3. **JWT Secret**: Use strong, random secret
4. **Database**: Use Railway's connection pooling
5. **HTTPS**: Always use HTTPS in production

## Next Steps

1. Deploy frontend to Cloudflare Pages
2. Deploy backend to Railway
3. Set up custom domains
4. Implement R2/S3 for certificate storage
5. Set up monitoring and alerts
6. Configure backup strategy for database

## Support

- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Cloudflare Pages**: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
- **Project Issues**: Check GitHub issues or create new one

This approach gets you to production quickly while maintaining the ability to migrate to a full Cloudflare solution later if needed.
