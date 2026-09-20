# Vocaly Browser Agent

Vocaly is a voice-first web automation workspace built with Next.js. Describe a browser task in natural language, speak it through the browser microphone, or type it directly. Vocaly starts a real cloud browser session, shows the agent's progress, and lets a person take over before any irreversible action.

## Project Video Prototype

**[▶ Watch the project video prototype](https://github.com/ahlawatsakshi6/vocaly-browser-agent/raw/refs/heads/main/Untitled%20design.mp4)**

[Open the video file on GitHub](https://github.com/ahlawatsakshi6/vocaly-browser-agent/blob/main/Untitled%20design.mp4)

## What It Does

- Accepts browser tasks by text or voice using the Web Speech API.
- Starts Browser Use Cloud tasks with vision, reasoning, highlighted elements, and session recording enabled.
- Polls task progress and renders the current step log in the workspace.
- Embeds the live browser session and provides a human takeover link.
- Reads the final task output, status, and estimated run cost.
- Allows a running task to be stopped from the UI.
- Blocks the agent at payments, bookings, message sending, and other irreversible confirmation points.
- Includes a PostgreSQL-backed health endpoint for deployment checks.

## Architecture

```mermaid
flowchart LR
    User[User voice or text command] --> UI[Next.js Vocaly workspace]
    UI -->|POST /api/tasks| Tasks[Next.js task API]
    Tasks -->|Create task| BrowserUse[Browser Use Cloud]
    BrowserUse --> Session[Cloud browser session]
    Session -->|Live URL, steps, result, recording| Tasks
    UI -->|Poll GET /api/tasks/:id| Tasks
    UI -->|PATCH /api/tasks/:id| Tasks
    Tasks --> UI
    Health[GET /api/health] --> Database[(PostgreSQL)]
```

## Tech Stack

- Next.js 16 with the App Router
- React 19 and TypeScript
- Browser Use Cloud API v2
- PostgreSQL with `pg` and Drizzle ORM
- Lucide React icons
- Tailwind CSS v4 through PostCSS
- ESLint and TypeScript checks

## Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database
- A Browser Use Cloud API key
- Google Chrome or Microsoft Edge for voice input

## Getting Started

1. Clone the repository and enter the project directory.

   ```bash
   git clone <your-github-repository-url>
   cd voice-driven-web-automation-agent
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create a local environment file.

   ```bash
   copy .env.example .env.local
   ```

   Add the required values:

   ```env
   BROWSER_USE_API_KEY=your_browser_use_api_key
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
   ```

   Never commit `.env`, `.env.local`, or any file containing real credentials.

4. Start the development server.

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `BROWSER_USE_API_KEY` | Yes for automation | Authenticates requests to Browser Use Cloud |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by the health check |

The API key is read only on the server. It is never sent to the browser client.

## API Reference

### `GET /api/tasks`

Returns whether Browser Use Cloud is configured:

```json
{ "configured": true }
```

### `POST /api/tasks`

Starts a cloud browser task.

```json
{ "task": "Find the best noise-cancelling headphones under $300" }
```

The request enables vision, reasoning, highlighted elements, and recording. It also sends a safety instruction that prevents irreversible actions from being finalized.

### `GET /api/tasks/:id`

Returns the current Browser Use task, its steps, the latest session URLs, and the recording URL when available.

### `PATCH /api/tasks/:id`

Stops the task and its browser session.

### `GET /api/health`

Runs `select 1` against PostgreSQL and returns HTTP 200 when the database is reachable.

## Safety Model

Vocaly is designed for human-supervised automation. The browser agent can research, compare, navigate, and fill forms, but its server-side system prompt instructs it to stop on the final confirmation screen before it can complete a purchase, booking, message, or other irreversible action. The user can inspect the live session and take over.

## Project Structure

```text
src/
  app/
    api/
      health/                 PostgreSQL health check
      tasks/                  Create and inspect browser tasks
      tasks/[id]/             Poll or stop a specific task
    globals.css               Workspace styling and responsive layout
    layout.tsx                Metadata and root layout
    page.tsx                  Voice-first browser workspace
  db/
    index.ts                  PostgreSQL and Drizzle connection
    schema.ts                 Drizzle schema entrypoint
```

## Current Limitations

- Voice input depends on browser support and microphone permission.
- Browser Use Cloud credentials and usage are required for real automation.
- The current database schema is intentionally minimal; PostgreSQL is currently used by the health endpoint.
- Task history is held in the browser session and is not yet persisted as application data.

## License

No license has been selected for this project yet.