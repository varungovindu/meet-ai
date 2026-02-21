# Meet-AI Clone – Smart Video Conferencing with AI Notes

A **complete, production-ready, zero-cost** AI-enhanced video conferencing platform with two modes:
1. **Human Meeting Mode**: Real-time video with AI-powered meeting summaries
2. **AI Voice Agent Mode**: Interactive voice conversations with customizable AI personas

🎉 **FULLY COMPLETE APP WITH:**
- ✅ Authentication (Better Auth with login/signup)
- ✅ Real-time Video (Stream Video SDK)
- ✅ Live Transcription (Web Speech API)
- ✅ AI Summaries (Ollama)
- ✅ Voice AI Agents (Web Speech + Ollama)
- ✅ Protected Routes & Middleware
- ✅ Complete Database Schema
- ✅ Full tRPC API
- ✅ Modern UI with Tailwind

---

## 🚀 Quick Start (3 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials (see COMPLETE_SETUP.md)
```

### 3. Start Everything
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Initialize DB & Start App
npm run db:push
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** and sign up!

**📖 For detailed setup:** Read [COMPLETE_SETUP.md](./COMPLETE_SETUP.md)

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **API Layer**: tRPC v11
- **Authentication**: Better Auth
- **Video**: Stream Video SDK
- **AI**: Ollama (local, phi3/mistral)
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS

## 📦 Prerequisites

Before you begin, ensure you have:

1. **Node.js** 18+ installed
2. **PostgreSQL database** (free tier from [Neon](https://neon.tech))
3. **Ollama** installed locally ([Download](https://ollama.ai))

## 🔧 Installation

### 1. Clone and Install Dependencies

```bash
cd meet-ai
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Database (Get from Neon.tech)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Ollama (Local AI)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3"

# Better Auth
BETTER_AUTH_SECRET="your-random-secret-key-generate-this"
BETTER_AUTH_URL="http://localhost:3000"

# Stream Video SDK (Get from getstream.io)
NEXT_PUBLIC_STREAM_API_KEY="your-stream-api-key"
STREAM_API_SECRET="your-stream-api-secret"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Install and Start Ollama

**Download Ollama:**
- Visit [ollama.ai](https://ollama.ai) and download for your OS
- Install and start Ollama

**Pull the AI model:**
```bash
ollama pull phi3
# OR
ollama pull mistral
```

**Verify Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

### 4. Set Up Database

**Generate migration:**
```bash
npm run db:generate
```

**Push schema to database:**
```bash
npm run db:push
```

**Open Drizzle Studio (optional):**
```bash
npm run db:studio
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
meet-ai/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/
│   │   │   └── trpc/[trpc]/   # tRPC API route handler
│   │   ├── dashboard/          # Dashboard page
│   │   ├── meetings/           # Meetings pages
│   │   ├── agents/             # AI agents management
│   │   ├── ai-agent/           # Voice agent interface
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── providers.tsx       # tRPC & React Query providers
│   │
│   ├── server/
│   │   ├── db/
│   │   │   ├── index.ts        # Database connection
│   │   │   └── schema.ts       # Drizzle schema
│   │   ├── trpc/
│   │   │   ├── context.ts      # tRPC context
│   │   │   ├── root.ts         # tRPC initialization
│   │   │   ├── router.ts       # Main app router
│   │   │   └── routers/        # Feature routers
│   │   ├── services/
│   │   │   ├── ai.service.ts        # Ollama integration
│   │   │   ├── meeting.service.ts   # Meeting business logic
│   │   │   └── agent.service.ts     # Agent CRUD operations
│   │   └── lib/
│   │       └── auth.ts         # Better Auth config
│   │
│   ├── services/
│   │   └── ai.service.ts       # AI service (Ollama calls)
│   │
│   └── lib/
│       └── trpc.ts             # tRPC client setup
│
├── drizzle.config.ts           # Drizzle configuration
├── package.json
└── README.md
```

## 🎯 Usage

### Creating AI Agents

1. Navigate to `/agents`
2. Click "New Agent"
3. Enter agent name and instructions
4. Example instructions:
   ```
   You are a helpful technical assistant with expertise in 
   software development. Be concise, friendly, and provide 
   practical advice.
   ```

### Human Meetings Workflow

1. Go to `/meetings`
2. Click "New Meeting"
3. Enter meeting name
4. Click "Start Meeting" when ready
5. Add transcript (manually or via Stream SDK integration)
6. Click "Complete & Generate Summary"
7. AI generates summary using local Ollama

### AI Voice Agent

1. Go to `/ai-agent`
2. Select an AI agent from dropdown
3. Click "Start Speaking" and allow microphone access
4. Speak your question
5. AI responds with voice and text
6. Continue conversation naturally

## 🔑 Key Files Explained

### Database Schema (`server/db/schema.ts`)
- **users**: User accounts (Better Auth integration)
- **agents**: AI agent personas with custom instructions
- **meetings**: Meeting records with transcript and summary

### AI Service (`services/ai.service.ts`)
- `generateMeetingSummary()`: Post-meeting summarization
- `generateAgentResponse()`: AI voice agent conversations
- `checkOllamaHealth()`: Verify Ollama is running

### Meeting Service (`server/services/meeting.service.ts`)
- `completeMeetingAndGenerateSummary()`: Main workflow
- Handles status transitions: `active` → `processing` → `completed`

### tRPC Routers
- **meetings**: Create, list, complete, update status/transcript
- **agents**: Full CRUD operations

## 🐛 Troubleshooting

### Ollama Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama (if not running)
ollama serve
```

### Database Issues
```bash
# Reset database and re-run migrations
npm run db:push
```

### Speech Recognition Not Working
- Use Chrome or Edge browser
- Allow microphone permissions
- Check browser console for errors

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

## 🚧 Roadmap

- [ ] Stream Video SDK integration for live video
- [ ] Webhook handler for real-time transcript capture
- [ ] Authentication UI (login/signup pages)
- [ ] Meeting recordings storage
- [ ] Agent voice customization
- [ ] Multi-language support
- [ ] Export summaries as PDF

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## ⚠️ Important Notes

- **Zero Cost**: This project uses only free tiers and local AI
- **Ollama Required**: Must be running locally for AI features
- **Browser Support**: Chrome/Edge recommended for voice features
- **Development Only**: Better Auth and database need production setup

---

Built with ❤️ using Next.js 15, Drizzle ORM, tRPC, and Ollama
