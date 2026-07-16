# Setup Guide — Daily Activity Logger

This guide walks you through setting up Google OAuth and deploying to Vercel.

---

## Step 1 — Create a Google Cloud Project

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Click the project dropdown → **New Project**
3. Name it `Daily Activity Logger` → **Create**

---

## Step 2 — Enable Required APIs

1. In the left menu go to **APIs & Services → Library**
2. Search for and enable:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**

---

## Step 3 — Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** → **Create**
3. Fill in:
   - App name: `Daily Activity Logger`
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue** through all steps
5. On the **Test users** step, add your own Gmail address
6. **Publish** the app (or keep in Testing mode for personal use)

---

## Step 4 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Daily Activity Logger Web`
5. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:5173
   http://localhost:5174
   https://YOUR-APP.vercel.app
   ```
   > ⚠️ Replace `YOUR-APP` with your actual Vercel subdomain once deployed.
6. Click **Create**
7. Copy the **Client ID** (looks like `123456789-abc...apps.googleusercontent.com`)

---

## Step 5 — Configure the App

1. In your project root, copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and paste your Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
   ```

---

## Step 6 — Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you should see the sign-in page.

---

## Step 7 — Deploy to Vercel

### Option A: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B: Vercel Dashboard
1. Push your project to GitHub/GitLab
2. Go to [https://vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Framework: **Vite**
5. Add Environment Variable:
   - Key: `VITE_GOOGLE_CLIENT_ID`
   - Value: your Client ID
6. Click **Deploy**
7. Once deployed, **go back to Google Cloud Console** → your OAuth credential → add your Vercel URL to **Authorized JavaScript origins**

---

## What Data is Accessed

The app requests these OAuth scopes:

| Scope | Reason |
|---|---|
| `spreadsheets` | Read/write your activity spreadsheet |
| `drive.file` | Create the spreadsheet in your Drive (only files this app created) |
| `profile` + `email` | Show your name and avatar in the header |

> **No data is stored on any server.** Everything goes directly to your Google Sheet.

---

## Your Google Sheet

After first login, a spreadsheet called **"Daily Activity Logger"** will appear in your Google Drive. It contains one sheet called `Activities` with these columns:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Date | Start Time | End Time | Duration (min) | Category | Activity | Created At |

You can view or edit this sheet directly: the app link in the navbar header opens it.

---

## Troubleshooting

### "This app is blocked" / 403 error
→ Add your email as a Test User in the OAuth consent screen.

### "Invalid client" error
→ Double-check `VITE_GOOGLE_CLIENT_ID` in your `.env` file. Make sure there are no extra spaces.

### Popup blocked
→ Make sure your browser allows popups from `localhost:5173`.

### Data not loading
→ The app reads all data from Google Sheets on each page visit. Make sure the spreadsheet exists and the columns match. If the sheet got corrupted, delete it from Drive and re-login (a fresh one will be created).
