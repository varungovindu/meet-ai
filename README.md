# Meet-AI

Smart video meetings with live transcription, AI summaries, and AI voice agents.

## Overview

Meet-AI provides two core experiences:

1. Human meeting mode
- Real-time video calls via Stream
- Live closed-caption transcription
- Transcript persistence
- AI-generated post-meeting summary

2. AI voice agent mode
- User-defined AI personas
- Voice/text interaction
- Conversation history persistence

## Complete Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Lucide icons
- Web Speech API (browser speech recognition + speech synthesis for AI voice screen)

### Backend/API
- tRPC v11
- Zod validation
- Next.js Route Handlers

### Authentication
- Better Auth
- Email/password authentication
- Session-based auth (database-backed sessions)

### Real-time Communication
- Stream Video SDK
   - @stream-io/video-react-sdk (client)
   - @stream-io/node-sdk (server)

### AI
- Groq (primary provider for deployment/cloud)
- Ollama (local fallback or explicit remote endpoint)

### Database
- Drizzle ORM
- libSQL client (@libsql/client)
- SQLite dialect (Drizzle config)

### Tooling
- ESLint
- Drizzle Kit
- PostCSS + Autoprefixer

## Architecture

### Auth Flow
1. Client uses Better Auth React client APIs for sign in/up/out.
2. Better Auth route handlers process auth requests.
3. Session is resolved server-side in tRPC context for protected procedures.

### Stream Call Flow
1. Room page calls `stream.getToken` (protected tRPC endpoint).
2. Server ensures Stream user exists and generates Stream token.
3. Client creates `StreamVideoClient` with API key + token.
4. Client creates/joins call with meeting id.
5. Host starts transcription; participants receive live captions.

### Transcript Flow
1. Stream emits `call.closed_caption` events.
2. App builds transcript lines with timestamp + speaker metadata from Stream.
3. On meeting end, transcript is saved via `meetings.updateTranscript`.
4. `completeMeeting` triggers AI summary generation from stored transcript.

### AI Flow
1. Server receives request (summary, Q&A, productivity, or voice response).
2. `generateAIResponse` tries Groq first.
3. If Groq is unavailable and fallback conditions allow, uses Ollama.
4. Response is returned and persisted where required.

## Key Features

- Secure login/signup and protected routes
- Meeting creation/scheduling
- Live video, screen share, reactions
- Shared live transcript inside meeting room
- AI-generated meeting summary
- Ask-AI over meeting context
- Productivity insights (decisions, action items, follow-up draft)
- Notion push for meeting insights
- AI voice agents with persona instructions

## Project Structure

```text
src/
   app/
      (auth)/
      (dashboard)/
         room/[id]/                 # Stream meeting room + live transcript UI
      api/
         auth/[...all]/route.ts     # Better Auth handler
         trpc/[trpc]/route.ts       # tRPC handler
   components/
   lib/
   server/
      db/
         index.ts                   # Drizzle + libSQL setup
         schema.ts                  # users/sessions/accounts/meetings/agents/messages
      lib/
         auth.ts                    # Better Auth server config
         stream.ts                  # Stream server client + token creation
      services/
         meeting.service.ts         # meeting lifecycle + summary trigger
      trpc/
         routers/
            meetings.ts
            agents.ts
            stream.ts
            ai.ts
   services/
      ai.service.ts                # Groq + Ollama integration
```

## Environment Variables

Create `.env` from `.env.example` and configure the following:

### Core
- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

### Database
- `DATABASE_URL`

Note: Current code uses Drizzle with libSQL client and SQLite dialect. Ensure `DATABASE_URL` is compatible with your libSQL/Turso setup.

### Stream
- `NEXT_PUBLIC_STREAM_API_KEY`
- `STREAM_API_SECRET`

### AI
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

### Optional Integrations
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Configure env

```bash
cp .env.example .env
```

3. Start local AI if using Ollama fallback

```bash
ollama serve
ollama pull phi3
```

4. Sync DB schema

```bash
npm run db:push
```

5. Start app

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint

npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
```

## Deployment Notes (Render)

- Set all required environment variables in Render dashboard.
- For production, configure Groq keys so AI does not depend on local Ollama.
- Keep `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` aligned to your deployed domain.
- If favicon/logo is needed in browser tab, app metadata points to assets in `public/`.

## Troubleshooting

### AI Not Responding
- Verify `GROQ_API_KEY` in deployment.
- For local fallback, verify Ollama is reachable:

```bash
curl http://localhost:11434/api/tags
```

### Stream Call Issues
- Confirm Stream API key/secret values.
- Ensure authenticated user can fetch `stream.getToken`.

### Transcript Not Starting
- Only host starts transcription.
- Ensure Stream transcription is enabled for your account/config.

### Auth Session Problems
- Check `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL` consistency.

## Current Status

Implemented and working:
- Better Auth session auth
- Stream real-time calls
- Live transcript capture from Stream caption events
- AI summary/Q&A/productivity/voice-agent flows
- Drizzle ORM schema and tRPC routes

## License

MIT
