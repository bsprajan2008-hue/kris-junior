# NEXUS

NEXUS is a Windows desktop companion built with Electron, React, TypeScript, Three.js and React Three Fiber. It is designed to sit quietly in the corner of the desktop, remember the things you do not want to carry in your head, and make the next step feel a little lighter.

## What is implemented

- Transparent, frameless Electron window that launches directly as a compact always-on-top floating companion. The dashboard is an on-demand view opened from the character.
- Real-time 3D character rendered from Three.js meshes with breathing, blinking, head movement, waving, celebration, focus and sleep moods. This is a real 3D scene; it is not a static image or CSS animation.
- Local, atomic JSON persistence in Electron's `userData` directory. Data survives restarts and Windows startup launches without exposing a database port or API key.
- Task creation, deletion, completion, categories, priority, due times, recurring-task field, and a daily progress view.
- Voice commands through Chromium speech recognition when available, with a Windows `System.Speech` microphone fallback for Electron; speech synthesis uses `en-IN` voices where available and Windows Speech Synthesis as a fallback.
- Compact chat bubble inside floating companion mode, with local conversation history and task-aware commands without opening the dashboard.
- Natural-language commands for task listing, next-task suggestions, focus sessions, task creation, and completion.
- Windows notifications for scheduled reminders, quiet hours, launch-at-startup setting, always-on-top setting, and focus timer.
- Secure Electron boundary: context isolation enabled, Node integration disabled, renderer does not receive arbitrary IPC or shell access.

## Run locally

Requires Node.js 20+ and a Windows desktop. From this folder:
PS C:\Users\RBSMANIAN> pnpm install
pnpm : The term 'pnpm' is not recognized as the name of a cmdlet, function, script file, or operable program. Check
the spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:1 char:1
+ pnpm install
+ ~~~~
    + CategoryInfo          : ObjectNotFound: (pnpm:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

PS C:\Users\RBSMANIAN>
```powershell
npm install
npm run dev
```

Optional: if you prefer pnpm, install it first with `npm install --global pnpm`, then use:

```powershell
pnpm install
pnpm dev
```

The app opens in development mode at `http://127.0.0.1:5173` inside Electron. For a production build:

```powershell
pnpm build
pnpm start
```

To create a Windows NSIS installer:

```powershell
pnpm dist:win
```

The installer will be written to `release/`.

## Voice and offline boundaries

NEXUS does not ship a cloud speech API key and does not claim a cloud model is present. It first uses the speech-recognition and speech-synthesis engines exposed by the local Chromium/Windows environment. Speech recognition availability varies by Windows policy and Electron build; when it is unavailable, the app keeps task management functional and displays a clear voice-unavailable state.

The command parser is local and deterministic. An Ollama adapter is intentionally not enabled in this first delivery: it should be added behind a small, allow-listed intent interface rather than letting an LLM execute arbitrary commands. A future adapter can translate natural language into the existing `Intent` type in `src/ai/commandParser.ts`.

## Architecture

```text
electron/main.ts       window lifecycle, notifications, atomic persistence, startup setting
electron/preload.ts    allow-listed, context-isolated renderer API
src/App.tsx            dashboard orchestration and companion mode
src/components/        3D character, task rows, focus timer
src/voice/              local speech recognition and speech synthesis hook
src/ai/                 safe intent parser; no terminal execution
src/store/              Zustand state and persistence actions
src/styles.css         warm ivory / charcoal / bronze visual system
```

## Phase status

Phase 1 through the functional desktop/task/voice/proactive slice are implemented in this repository. The remaining production-hardening items are deliberate extension points rather than hidden claims:

- Replace the procedural character with an artist-authored rigged GLB/GLTF only when a suitable original asset is available; `src/components/Character.tsx` is isolated for that swap.
- Add an Ollama-backed intent adapter with explicit timeout, confirmation, and allow-listed actions.
- Expand recurring-task scheduling, calendar UI, drag-to-walk desktop positioning, and deeper animation clip blending.
- Add installer signing, crash reporting policy, and Windows accessibility review before broad distribution.

## Troubleshooting

- If npm reports `Cannot read properties of null (reading 'matches')`, the folder was previously installed with pnpm and npm 11 is trying to reuse pnpm's linked dependency tree. Close running NEXUS terminals, then from the project folder run `Remove-Item -Recurse -Force node_modules`, followed by `npm install`.
- If the character is not visible, check that the Electron window has GPU acceleration enabled and that the app window is not behind a fullscreen app.
- If voice is unavailable, verify Windows microphone permission and try the text task flow; the app intentionally degrades without speech support.
- User data lives at `%APPDATA%\\nexus-desktop-companion\\nexus-data.json` (the exact Electron user-data folder is platform-managed).
- For a clean developer reset, close NEXUS and remove that single `nexus-data.json` file; this removes only NEXUS's local state.
