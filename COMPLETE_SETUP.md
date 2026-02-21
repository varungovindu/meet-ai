# 🚀 Complete Meet-AI Clone Setup Guide

## Full installation from scratch. Follow EVERY step!

---

## ✅ Prerequisites

Before starting, ensure you have:
- **Node.js 18+** installed ([Download](https://nodejs.org))
- **Git** installed
- A **Neon** account (free) - [neon.tech](https://neon.tech)
- A **Stream** account (free) - [getstream.io](https://getstream.io)
- **Ollama** downloaded - [ollama.ai](https://ollama.ai)

---

## 📦 Step 1: Install Dependencies

```bash
cd meet-ai
npm install
```

This installs:
- Next.js 15, React 19, TypeScript
- tRPC v11 + TanStack Query
- Drizzle ORM + Neon serverless
- Better Auth
- Stream Video SDK (client + server)
- Tailwind CSS

---

## 🤖 Step 2: Install & Configure Ollama

### Windows:
1. Download installer from [ollama.ai/download](https://ollama.ai/download)
2. Run the installer
3. Open **Command Prompt** or **PowerShell**
4. Pull the AI model:
   ```bash
   ollama pull phi3
   ```
5. Start Ollama server:
   ```bash
   ollama serve
   ```
   **Leave this terminal open!**

### macOS:
```bash
brew install ollama
ollama pull phi3
ollama serve
```

### Linux:
```bash
curl https://ollama.ai/install.sh | sh
ollama pull phi3
ollama serve
```

### Verify Ollama:
```bash
curl http://localhost:11434/api/tags
```
Should return JSON with model info.

---

## 🗄️ Step 3: Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **"New Project"**
3. Name it: `meet-ai-db`
4. Select region closest to you
5. Click **"Create Project"**
6. Copy the **Connection String** (looks like):
   ```
   postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
7. **Save this** - you'll need it next!

---

## 📹 Step 4: Set Up Stream Video SDK

1. Go to [getstream.io](https://getstream.io) and sign up (free)
2. Create a new app
3. Choose **"Video & Audio"** product
4. Go to your **Dashboard**
5. Copy three values:
   - **App ID** (also called API Key)
   - **API Key** (public key)
   - **API Secret** (private key)
6. **Save these** - you'll need them next!

---

## 🔐 Step 5: Configure Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your editor

3. Fill in ALL values:

```env
# ==== DATABASE ====
# Paste your Neon connection string here
DATABASE_URL="postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# ==== OLLAMA (Local AI) ====
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3"

# ==== BETTER AUTH ====
# Generate a random 32+ character string
# You can use: openssl rand -base64 32
BETTER_AUTH_SECRET="generate-a-long-random-string-here-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# ==== STREAM VIDEO SDK ====
# Paste your Stream credentials here
NEXT_PUBLIC_STREAM_API_KEY="your-stream-api-key-from-dashboard"
STREAM_API_SECRET="your-stream-api-secret-from-dashboard"

# ==== APP CONFIG ====
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 🔑 Generate BETTER_AUTH_SECRET:
**Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**macOS/Linux:**
```bash
openssl rand -base64 32
```

---

## 🏗️ Step 6: Initialize Database

Push the schema to Neon:

```bash
npm run db:push
```

You should see:
```
✓ Schema applied successfully!
```

**Optional:** Open Drizzle Studio to view your database:
```bash
npm run db:studio
```
Visit [https://local.drizzle.studio](https://local.drizzle.studio)

---

## 📁 Step 7: Reorganize Files (IMPORTANT!)

The protected pages need to be in the `(dashboard)` route group.

**Windows PowerShell:**
```powershell
# Create protected route group
New-Item -ItemType Directory -Force -Path "src\app\(dashboard)"

# Move pages to protected group
Move-Item "src\app\dashboard" "src\app\(dashboard)\dashboard" -Force
Move-Item "src\app\meetings" "src\app\(dashboard)\meetings" -Force
Move-Item "src\app\agents" "src\app\(dashboard)\agents" -Force
Move-Item "src\app\ai-agent" "src\app\(dashboard)\ai-agent" -Force
Move-Item "src\app\room" "src\app\(dashboard)\room" -Force
```

**macOS/Linux:**
```bash
# Create protected route group
mkdir -p "src/app/(dashboard)"

# Move pages
mv src/app/dashboard "src/app/(dashboard)/"
mv src/app/meetings "src/app/(dashboard)/"
mv src/app/agents "src/app/(dashboard)/"
mv src/app/ai-agent "src/app/(dashboard)/"
mv src/app/room "src/app/(dashboard)/"
```

---

## 🚀 Step 8: Start Development Server

Make sure Ollama is still running in another terminal!

```bash
npm run dev
```

Visit: **[http://localhost:3000](http://localhost:3000)**

---

## ✅ Step 9: Test the Complete App

### 9.1 Create Account
1. Go to [http://localhost:3000](http://localhost:3000)
2. Click **"Sign Up"**
3. Enter:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
4. Click **"Sign Up"**
5. You should be redirected to dashboard

### 9.2 Create AI Agent
1. Click **"AI Agents"** in navbar
2. Click **"+ New Agent"**
3. Fill in:
   - Name: `Technical Assistant`
   - Instructions: `You are a helpful technical assistant with expertise in software development. Be concise and friendly.`
4. Click **"Create Agent"**

### 9.3 Test Voice Agent
1. Click **"Voice Agent"** in navbar
2. Select your agent from dropdown
3. Click **"Start Speaking"**
4. Allow microphone access
5. Say: "What is React?"
6. AI will respond with voice!

### 9.4 Create Meeting
1. Click **"Meetings"** in navbar
2. Click **"+ New Meeting"**
3. Enter name: "Team Standup"
4. Click **"Create Meeting"**
5. Click on the meeting to open details
6. Click **"Join Video Call"**

### 9.5 Video Call Features
- **Camera/Mic controls** at bottom
- **Start Transcript** button (uses browser speech recognition)
- **End Meeting** saves transcript
- Back at meeting page, click **"Complete & Generate Summary"**
- AI generates meeting summary using Ollama!

---

## 🎉 Success Checklist

After setup, you should be able to:

- [x] Sign up / Login
- [x] View Dashboard with stats
- [x] Create AI agents
- [x] Edit/delete agents
- [x] Test voice chat with AI (Web Speech API + Ollama)
- [x] Create meetings
- [x] Join video calls (Stream Video SDK)
- [x] Capture live transcripts
- [x] Generate AI summaries from transcripts
- [x] View meeting history

---

## 🐛 Troubleshooting

### "Failed to connect to Ollama"
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve
```

### "Database connection failed"
- Check `DATABASE_URL` in `.env`
- Verify Neon project is active
- Try rerunning: `npm run db:push`

### "Stream initialization failed"
- Check `NEXT_PUBLIC_STREAM_API_KEY` in `.env`
- Check `STREAM_API_SECRET` in `.env`
- Verify keys from Stream dashboard

### "Cannot find module errors"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Speech recognition not working"
- Use Chrome or Edge browser
- Allow microphone permissions
- Check browser console for errors

### Port 3000 already in use
```bash
# Use different port
PORT=3001 npm run dev
```

### Better Auth session errors
- Check `BETTER_AUTH_SECRET` is set in `.env`
- Verify it's at least 32 characters
- Try generating a new secret

---

## 📊 Monitor Your App

### Check Ollama Status:
```bash
curl http://localhost:11434/api/tags
```

### Check Database:
```bash
npm run db:studio
```

### Check Logs:
Look at terminal running `npm run dev` for:
- tRPC calls
- Ollama API requests
- Database queries
- Webhook events

---

## 🎯 What You Built

**Zero-Cost Full-Stack SaaS with:**
1. ✅ Complete authentication (Better Auth)
2. ✅ Real-time video conferencing (Stream SDK)
3. ✅ Live transcription (Web Speech API)
4. ✅ AI-powered meeting summaries (Ollama)
5. ✅ AI voice agents (Web Speech + Ollama)
6. ✅ Full CRUD operations (tRPC + Drizzle)
7. ✅ PostgreSQL database (Neon)
8. ✅ Type-safe API (tRPC v11)
9. ✅ Modern UI (Tailwind CSS)
10. ✅ Production-ready architecture

**Tech Stack:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- tRPC v11
- Drizzle ORM
- PostgreSQL (Neon)
- Better Auth
- Stream Video SDK
- Ollama (local AI)
- TanStack Query
- Tailwind CSS

---

## 🚀 Next Steps (Optional)

1. **Deploy to Vercel:**
   - Push to GitHub
   - Connect to Vercel
   - Add environment variables
   - Deploy!

2. **Add More Features:**
   - Email notifications
   - Calendar integration
   - Meeting scheduling
   - File sharing
   - Screen sharing
   - Chat during calls

3. **Customize:**
   - Change AI models (mistral, llama3, etc.)
   - Add more agent personas
   - Custom UI themes
   - Advanced workflows

---

## 💡 Pro Tips

1. **Keep Ollama running** in a separate terminal
2. **Use phi3 model** for faster responses (or mistral for better quality)
3. **Monitor DB Studio** to see data in real-time
4. **Check Network tab** in DevTools to see tRPC calls
5. **Use Chrome/Edge** for best speech recognition
6. **Enable HTTPS** in production for Web Speech API

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM](https://orm.drizzle.team)
- [Stream Video SDK](https://getstream.io/video/docs/)
- [Ollama Models](https://ollama.ai/library)
- [Better Auth](https://better-auth.com)

---

## 🤝 Need Help?

1. Check [README.md](./README.md) for features
2. Review [SETUP.md](./SETUP.md) for quick start
3. Look at code comments in `src/` files
4. Check browser console for errors
5. Verify Ollama logs: `ollama serve`

---

**🎉 Congratulations! You've built a complete AI-powered video conferencing platform!** 

Now go create AI agents, host meetings, and generate summaries! 🚀
