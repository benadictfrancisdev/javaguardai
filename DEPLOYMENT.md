# FrameworkGuard Deployment Guide

## Option 1: Railway (Backend)

### Prerequisites
- [Railway account](https://railway.app)
- GitHub repository with your code

### Steps

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/frameworkguard.git
   git push -u origin main
   ```

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your frameworkguard repository

3. **Configure Environment Variables**
   
   In Railway dashboard, go to your service → Variables, add:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key
   EMERGENT_LLM_KEY=sk-emergent-your_key
   REDIS_URL=redis://default:password@your-redis.railway.internal:6379
   ENV=production
   CORS_ORIGINS=https://your-frontend.pages.dev
   ```

4. **Add Redis Service** (Optional but recommended)
   - In Railway dashboard, click "New" → "Database" → "Redis"
   - Copy the internal Redis URL to your backend's REDIS_URL variable

5. **Deploy**
   - Railway auto-deploys on git push
   - Check deployment logs for errors
   - Your backend URL will be like: `https://frameworkguard-production.up.railway.app`

6. **Verify**
   ```bash
   curl https://YOUR-RAILWAY-URL.up.railway.app/api/health
   ```

---

## Option 2: Cloudflare Pages (Frontend)

### Prerequisites
- [Cloudflare account](https://cloudflare.com)
- GitHub repository with your code

### Steps

1. **Go to Cloudflare Dashboard**
   - Navigate to "Workers & Pages"
   - Click "Create application" → "Pages" → "Connect to Git"

2. **Select Repository**
   - Authorize GitHub access
   - Select your frameworkguard repository

3. **Configure Build Settings**
   ```
   Framework preset: Create React App
   Build command: cd frontend && yarn build
   Build output directory: frontend/build
   Root directory: /
   ```

4. **Set Environment Variables**
   ```
   REACT_APP_BACKEND_URL=https://YOUR-RAILWAY-URL.up.railway.app
   ```

5. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete
   - Your frontend URL: `https://frameworkguard.pages.dev`

6. **Custom Domain** (Optional)
   - Go to your Pages project → "Custom domains"
   - Add your domain (e.g., `app.frameworkguard.ai`)
   - Update DNS records as instructed

---

## Option 3: Full Stack on Railway

Deploy both backend and frontend on Railway:

### Backend Service
1. Create new service from GitHub
2. Set root directory to `/backend`
3. Add all environment variables
4. Deploy

### Frontend Service  
1. Create another service from same repo
2. Set root directory to `/frontend`
3. Build command: `yarn build`
4. Start command: `npx serve -s build -l 3000`
5. Add environment variable:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.up.railway.app
   ```

### Redis Service
1. Add Redis from Railway's database templates
2. Copy Redis URL to backend's REDIS_URL

---

## Update Backend CORS

After deploying frontend, update backend's CORS_ORIGINS:

```bash
# In Railway dashboard, update the variable:
CORS_ORIGINS=https://frameworkguard.pages.dev,https://your-custom-domain.com
```

---

## Verify Deployment

### Check Backend Health
```bash
curl https://YOUR-BACKEND-URL/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "claude_api": "available",
  "version": "1.0.0"
}
```

### Test Exception Reporting
```bash
curl -X POST https://YOUR-BACKEND-URL/api/exceptions \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "exception_class": "java.lang.NullPointerException",
    "message": "Test exception",
    "stack_trace": "at Test.main(Test.java:10)",
    "heap_used_mb": 512,
    "thread_count": 10,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

---

## Java Agent with Cloud Backend

Once deployed, use the agent with your Railway backend:

```bash
java -javaagent:frameworkguard-agent-1.0.0.jar=apiKey=YOUR_API_KEY,endpoint=https://YOUR-BACKEND-URL.up.railway.app \
     -jar your-application.jar
```

---

## Monitoring & Logs

### Railway Logs
- Go to your service → "Deployments" → Click deployment → "View Logs"

### Cloudflare Analytics  
- Go to your Pages project → "Analytics"

### Health Monitoring
Set up an external monitor (UptimeRobot, Pingdom) to check:
- `https://YOUR-BACKEND-URL/api/health/live` (should return 200)
