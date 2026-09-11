# Frontend Agent Guidelines (Next.js & UI Standards)

> Refer to root [AGENTS.md](file:///c:/Users/athal/gabriel/AGENTS.md) for full project architecture and backend standards.

---

## 🎨 Frontend Specific Standards

### 1. Aesthetic Guidelines (ChatGPT Dark Minimalist)
* **Color Palette**: Deep dark background (`#0d0d10`), dark sidebar (`#131316`), dark card panels (`#17171a`), subtle borders (`#222228`).
* **Icons**: Use `lucide-react` icons EXCLUSIVELY.
* **NO EMOJIS**: Do not put emojis in button labels, subtext, or empty state text.
* **Typography**: Clean, concise text. Avoid slop, filler subtext, or instructions like *"Click any slide card to open full-screen preview..."*. Use minimal titles like `261 Slides` or `57 Pages`.

### 2. History & Session Loading
* Clicking a job in the `History` sidebar MUST immediately navigate to that workflow and load the **Session Detail View** (`selectedJobId`).
* When a job result session is loaded, **hide the upload dropzone form**.
* Provide a clean `+ Upload New PDF` / `Process Another Video` button in the Session Header to reset and show the upload form if desired.

### 3. Verification
Before committing frontend edits, always run:
```bash
cd frontend
npx tsc --noEmit
```
Ensure 0 TypeScript errors.
