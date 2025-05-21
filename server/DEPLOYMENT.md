
# Deployment Guide

This guide covers how to deploy the WebSocket server to various platforms.

## Option 1: Railway.app

Railway.app is a modern platform that makes deployment simple.

1. Create a Railway account and install the Railway CLI
2. Initialize a new project:
   ```
   railway init
   ```
3. Add environment variables:
   ```
   railway vars set JWT_SECRET=your_secret_key
   ```
4. Deploy the app:
   ```
   railway up
   ```

## Option 2: Render.com

Render offers easy deployment with automatic builds.

1. Create a new Web Service on Render
2. Connect to your GitHub repository
3. Use the following settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables:
   - `JWT_SECRET`: Your JWT secret key

## Option 3: Digital Ocean App Platform

1. Create a new App
2. Connect to your GitHub repository
3. Configure as a Web Service
4. Add environment variables
5. Deploy

## Option 4: Traditional VPS (e.g., DigitalOcean Droplet)

1. Create a new VPS/Droplet
2. SSH into your server
3. Install Node.js:
   ```
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Clone your repository:
   ```
   git clone your-repo-url
   cd your-repo-directory
   ```
5. Install dependencies:
   ```
   npm install --production
   ```
6. Set up environment variables:
   ```
   export JWT_SECRET=your_secret_key
   ```
7. Use PM2 to run the server:
   ```
   npm install -g pm2
   pm2 start wsServer.js
   ```
8. Set up PM2 to start on boot:
   ```
   pm2 startup
   pm2 save
   ```

## Setting Up SSL

For production, you should use SSL for your WebSocket connections. 

### Using Nginx as a reverse proxy:

1. Install Nginx:
   ```
   sudo apt-get install nginx
   ```

2. Get SSL certificates using Let's Encrypt:
   ```
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. Configure Nginx to proxy WebSocket connections:
   ```
   server {
       listen 443 ssl;
       server_name your-domain.com;

       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

4. Reload Nginx:
   ```
   sudo systemctl reload nginx
   ```

Now your WebSocket server will be accessible via `wss://your-domain.com`.
