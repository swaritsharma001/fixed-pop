# PopPay Deployment Architecture Guide

## Architecture Overview
- **Backend API**: Hosted on AWS EC2 at `https://api.poppay.tech` (Node.js Express + PM2 + Nginx reverse proxy + Let's Encrypt SSL)
- **Frontend App**: Hosted on Vercel at `https://poppay.tech` (Vite React SPA + automatic rewrites & global CDN)
- **Database**: MongoDB (Atlas or self-hosted)

---

## 1. AWS EC2 (Backend API: `https://api.poppay.tech`)

### A. Clone & Install
```bash
git clone https://github.com/swaritsharma001/fixed-pop.git
cd fixed-pop
npm install
```

### B. Environment Configuration
Create `server/.env`:
```env
PORT=3001
NODE_ENV=production
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/poppay?retryWrites=true&w=majority
JWT_SECRET=your_secure_jwt_secret_min_32_chars
ENCRYPTION_KEY=64_hex_characters_key_here
ADMIN_PASSWORD=admin@maheshsharma.com
FRONTEND_URL=https://poppay.tech
ALLOWED_ORIGINS=https://poppay.tech,https://www.poppay.tech
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=https://api.poppay.tech/api/v1/merchant/gmail/callback
GMAIL_POLL_INTERVAL_MS=30000
```

### C. Run with PM2
```bash
sudo npm install -g pm2
pm2 start server/src/index.js --name poppay-api
pm2 save
pm2 startup
```

### D. Nginx Configuration (`/etc/nginx/sites-available/api.poppay.tech`)
```nginx
server {
    server_name api.poppay.tech;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE (Server-Sent Events) real-time streaming support
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```
Enable the site and obtain SSL with Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/api.poppay.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.poppay.tech
```

---

## 2. Vercel (Frontend: `https://poppay.tech`)

1. Connect your GitHub repository `fixed-pop` in the Vercel Dashboard.
2. Vercel automatically detects the project settings from `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `client/dist`
3. In **Settings -> Domains**, assign:
   - `poppay.tech`
   - `www.poppay.tech`
4. In **Settings -> Environment Variables** (optional):
   - `VITE_API_URL`: `https://api.poppay.tech`
   *(Even if not set, the frontend automatically defaults to `https://api.poppay.tech` when running on `poppay.tech`)*
5. Click **Deploy**.

---

## 3. Google Cloud Console (Gmail Integration)
1. Go to Google Cloud Console -> APIs & Services -> Credentials.
2. In Authorized Redirect URIs for your OAuth 2.0 Client ID, add:
   - `https://api.poppay.tech/api/v1/merchant/gmail/callback`
