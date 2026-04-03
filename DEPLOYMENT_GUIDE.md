# ⚡ StrangerMeet — Free Deployment Guide

Real P2P video chat. Deploy everything for FREE in ~15 minutes.

---

## What you get
- Real WebRTC video between strangers (no bots)
- Gender filter, country filter, interests
- Text chat sidebar
- Report system
- Terms & Conditions, age verification
- Works on mobile + desktop

---

## Architecture (all FREE)

```
[User A browser] ←──── P2P video (WebRTC) ────→ [User B browser]
        │                                                │
        └──── signaling (Socket.io) ────→ [Railway server] ←────┘
                                              (just coordinates
                                               the connection,
                                               never sees video)
```

---

## STEP 1 — Deploy the Server on Railway (FREE)

Railway gives you a free server. Your video never goes through it — it just helps two browsers find each other.

### 1.1 Create a GitHub repo

1. Go to https://github.com and sign in (or create a free account)
2. Click **New repository**
3. Name it `strangermeet-server`
4. Set to **Public**, click **Create repository**
5. Upload these files to the repo:
   - `package.json`
   - `server/server.js`
   (keep the same folder structure)

### 1.2 Deploy on Railway

1. Go to https://railway.app
2. Click **Start a New Project**
3. Choose **Deploy from GitHub repo**
4. Connect your GitHub account and select `strangermeet-server`
5. Railway auto-detects Node.js and deploys it
6. Go to **Settings → Domains → Generate Domain**
7. You'll get a URL like: `https://strangermeet-server-production.up.railway.app`

**Copy this URL — you'll need it in Step 2!**

Railway free tier gives you $5/month of compute which handles thousands of users.

---

## STEP 2 — Update the Frontend with your Server URL

Open `client/index.html` and find this line near the top of the `<script>` section:

```javascript
const SERVER_URL = window.location.hostname === 'localhost' ...
  : 'YOUR_RAILWAY_SERVER_URL_HERE';   // ← paste your Railway URL here
```

Replace `YOUR_RAILWAY_SERVER_URL_HERE` with your Railway URL, like:

```javascript
  : 'https://strangermeet-server-production.up.railway.app';
```

Save the file.

---

## STEP 3 — Deploy the Frontend on Netlify (FREE)

Netlify hosts your HTML file for free with a real URL.

1. Go to https://netlify.com and create a free account
2. Click **Add new site → Deploy manually**
3. Drag and drop your `client` folder (containing `index.html`) into the upload area
4. Wait ~30 seconds
5. Netlify gives you a URL like: `https://sparkly-fox-abc123.netlify.app`

**That's your shareable URL! Send it to friends.**

Optional: Go to **Site settings → Change site name** to get a nicer URL like `strangermeet.netlify.app`

---

## STEP 4 — Share your URL!

Send the Netlify URL to anyone. They open it in Chrome/Firefox, allow camera & mic, sign up (free), and they're matched with real strangers.

---

## Files overview

```
strangermeet/
├── package.json          ← Node.js config (upload to GitHub)
├── server/
│   └── server.js         ← Signaling server (upload to GitHub)
└── client/
    └── index.html        ← Entire frontend (upload to Netlify)
```

---

## Testing locally (optional)

If you have Node.js installed:

```bash
cd strangermeet
npm install
npm start
```

Then open two browser tabs at http://localhost:3000 — you'll see yourself match with yourself for testing.

---

## Troubleshooting

**"Server unreachable" error**
→ Check your Railway URL is correct in index.html
→ Make sure Railway deployment succeeded (check logs in Railway dashboard)

**Video not connecting**
→ Both users must allow camera/mic permissions
→ Works best on Chrome or Firefox
→ Behind very strict firewalls, the TURN server fallback kicks in automatically

**"Camera not available"**
→ Check browser permissions (click the lock icon in address bar)
→ Make sure no other app is using the camera

**Users matched but no video**
→ This can happen behind certain routers. The free TURN server in the code handles this automatically.

---

## Upgrading (optional, all still free)

- **Custom domain**: Buy domain (~$10/year on Namecheap), point to Netlify — free SSL included
- **More TURN servers**: Sign up free at https://metered.ca for more reliable TURN
- **Database**: Add MongoDB Atlas free tier to store reports/bans permanently

---

## Keyboard shortcuts (in chat)

| Key | Action |
|-----|--------|
| `Ctrl + →` | Next stranger |
| `Escape` | Stop chat |
| `M` | Toggle mic |
| `C` | Toggle camera |

---

Built with: WebRTC · Socket.io · Node.js · Vanilla JS · No frameworks needed
