# Testing JavaGuard AI Frontend

## Local Development Setup

### Prerequisites
- **Node version:** Must use Node 18 (v18.x). Node 22+ is incompatible with `react-scripts 5.0.1` / `craco`.
- Use `nvm use 18` or equivalent to switch.

### Install Dependencies
```bash
cd frontend
npm install --legacy-peer-deps
```
The `--legacy-peer-deps` flag is required due to unresolved peer dependency conflicts in the project.

You may also need to install `ajv@8` explicitly:
```bash
npm install ajv@8 --legacy-peer-deps
```

### Dev Server vs Static Build
- The dev server (`npx craco start`) may crash due to a pre-existing HMR/webpack configuration issue. This is NOT caused by new code changes.
- **Workaround:** Build a static production build and serve it:
```bash
CI=false npx craco build
npx serve -s build -l 3000
```
- The `CI=false` flag prevents treating warnings as errors during build.
- App will be available at `http://localhost:3000`.

### Backend
- Production backend: `https://javaguardai-production.up.railway.app`
- The frontend `.env` or build config should point to this URL for API calls.

## Testing Procedures

### Test Account
- Register a new account via the app's registration form at `/register`
- Use any org name and email (e.g., TestCorp / devintest@testcorp.com)

### Key Pages to Test
1. **Analyzer** (`/analyze`) - Stack trace analysis with AI. Use "Use Sample" button to populate a sample NullPointerException.
2. **Incidents** (`/incidents`) - List of incidents with SidePanel for viewing details. Click "View" on any incident.
3. **Incident Detail** (`/incidents/:id`) - Full detail page for a single incident.

### Testing AI Analysis Rendering
- AI analysis returns structured fields: `root_cause`, `why`, `fix_steps`, `code_fix`, `fix_suggestion`, `business_impact`, `confidence`, `estimated_fix_minutes`
- All new UI sections use conditional rendering (`analysis.field && ...`) — sections only appear when the field has a truthy value
- Empty string `""` is falsy, so sections with empty data will not render (this is correct behavior)
- Loading state: Look for spinner when `status === 'received'`

### Mock Data Injection (when backend AI is unavailable)
If `EMERGENT_LLM_KEY` is not configured on the backend, AI analysis will fail and return `ANALYSIS_FAILED` status. To test UI rendering without real AI data:

1. On the **Analyzer page**, submit a stack trace and wait for analysis to complete (even if it fails)
2. Use browser console to inject mock data via React fiber traversal:
```javascript
// Find the Analyzer component's fiber and inject mock state
// This approach works on the Analyzer page but may not work reliably on other pages
// due to different component tree structures
```
3. For **Incidents SidePanel** and **IncidentDetailPage**, code review can verify the rendering patterns match the Analyzer page since they use identical conditional rendering logic.

### What to Verify
- [ ] New sections render with correct icons and colors:
  - ROOT CAUSE: yellow Target icon
  - WHY IT HAPPENED: orange HelpCircle icon  
  - FIX STEPS: blue ListOrdered icon, `whitespace-pre-line` formatting
  - CODE FIX: green Code icon, `<pre>` monospace block
- [ ] Conditional rendering: sections hide when data is empty/null
- [ ] Loading states: spinner shown while analysis is pending
- [ ] Existing sections still present and unchanged

## Known Issues
- **HMR crash in dev server:** Pre-existing webpack/craco configuration issue. Use static build workaround.
- **Peer dependency conflicts:** Use `--legacy-peer-deps` flag.
- **CI failures:** 2 pre-existing failures (missing SUPABASE_URL env var, lint on untouched files) — neither is required for merge.
- **Backend AI analysis:** May fail if `EMERGENT_LLM_KEY` is not configured on Railway deployment.

## Devin Secrets Needed
- `EMERGENT_LLM_KEY` — Required on Railway backend for AI analysis to work. Without this, all analysis calls return ANALYSIS_FAILED status.
