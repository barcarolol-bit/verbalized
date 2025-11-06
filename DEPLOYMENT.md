# 🚀 Deployment Guide - Verbalized

## Why Not GitHub Pages?

GitHub Pages only supports **static websites** (HTML, CSS, JS files). Verbalized is a **Next.js application** with:
- Server-side API routes (`/api/transcribe` and `/api/compose`)
- Node.js runtime requirements
- Environment variables for API keys

**Solution**: Deploy to a platform that supports Next.js applications.

---

## ✅ Recommended: Deploy to Vercel (FREE)

Vercel is made by the Next.js team and offers the best experience for Next.js apps.

### Step-by-Step Deployment:

#### 1. Create a Vercel Account
- Go to [vercel.com](https://vercel.com)
- Click "Sign Up"
- Choose "Continue with GitHub"
- Authorize Vercel to access your GitHub account

#### 2. Import Your Repository
- Click "Add New..." → "Project"
- Select "Import Git Repository"
- Find and select `barcarolol-bit/verbalized`
- Click "Import"

#### 3. Configure Environment Variables
In the deployment settings, add these environment variables:

```env
OPENAI_API_KEY=sk-your-openai-key-here
OLLAMA_API_KEY=your-ollama-key-here
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_MODEL=gpt-oss:120b-cloud
NEXT_PUBLIC_MAX_DURATION_SECONDS=180
```

⚠️ **IMPORTANT**: Without these API keys, transcription and composition won't work!

#### 4. Deploy
- Click "Deploy"
- Wait 1-2 minutes for the build to complete
- Get your live URL (e.g., `verbalized.vercel.app`)

#### 5. Custom Domain (Optional)
- In Vercel dashboard, go to your project
- Click "Settings" → "Domains"
- Add your custom domain if you have one

### Automatic Updates
Every time you push to GitHub, Vercel will automatically rebuild and redeploy! 🎉

---

## Alternative Option 1: Netlify

### Deploy to Netlify:
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your `verbalized` repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables (same as Vercel)
7. Click "Deploy"

---

## Alternative Option 2: Railway

### Deploy to Railway:
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `verbalized`
5. Add environment variables
6. Railway will auto-detect Next.js and deploy

---

## Alternative Option 3: Render

### Deploy to Render:
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your `verbalized` repository
5. Settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. Add environment variables
7. Click "Create Web Service"

---

## 📊 Platform Comparison

| Platform | Free Tier | Auto Deploy | Custom Domain | Best For |
|----------|-----------|-------------|---------------|----------|
| **Vercel** | ✅ Yes | ✅ Yes | ✅ Yes | Next.js apps (recommended) |
| **Netlify** | ✅ Yes | ✅ Yes | ✅ Yes | General web apps |
| **Railway** | ⚠️ Limited | ✅ Yes | ✅ Yes | Full-stack apps |
| **Render** | ⚠️ Limited | ✅ Yes | ✅ Yes | Backend services |

**Recommendation**: Use **Vercel** - it's free, fast, and made specifically for Next.js!

---

## 🔐 Security Notes

### Protect Your API Keys:
1. **Never commit** `.env.local` to GitHub (already in `.gitignore`)
2. **Only add** environment variables in the deployment platform's dashboard
3. **Rotate keys** if they're ever exposed
4. Consider using **environment-specific keys** (dev vs production)

### API Key Best Practices:
- Use separate API keys for development and production
- Set usage limits on your OpenAI account
- Monitor API usage regularly
- Consider implementing rate limiting

---

## 🎯 Quick Start: Vercel Deployment

### One-Click Summary:
1. **Sign up**: [vercel.com](https://vercel.com) with GitHub
2. **Import**: Select `barcarolol-bit/verbalized`
3. **Configure**: Add your API keys as environment variables
4. **Deploy**: Click deploy and wait ~2 minutes
5. **Share**: Get your live URL and share your app!

### After Deployment:
- ✅ Your app is live on the internet
- ✅ HTTPS automatically enabled
- ✅ Global CDN for fast loading
- ✅ Automatic deployments on git push
- ✅ Preview deployments for pull requests

---

## 🆘 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure Node.js version is 20+ (set in Vercel settings if needed)
- Check build logs for specific errors

### API Routes Don't Work
- Verify environment variables are set correctly
- Check API key validity
- Look at function logs in platform dashboard

### App Loads but Features Don't Work
- Check browser console for errors
- Verify API keys are correct in environment variables
- Test API routes directly (e.g., `/api/health/transcribe`)

---

## 📱 Share Your App

Once deployed, share your live URL:
- **Vercel**: `https://verbalized.vercel.app` (or your custom domain)
- Works on all devices: desktop, mobile, tablet
- No installation needed - just open in browser!

---

## 🎉 You're Live!

After following these steps, your enhanced Verbalized app will be:
- ✅ Live on the internet
- ✅ Accessible from anywhere
- ✅ Automatically updated when you push to GitHub
- ✅ Served over HTTPS
- ✅ Optimized for performance

**Recommended Next Step**: Deploy to Vercel now! It takes less than 5 minutes. 🚀

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)

**Need Help?** Check the platform's documentation or reach out to their support teams!
