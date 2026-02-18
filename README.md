# AI Snake Agents – Frontend

Frontend for running, comparing, and replaying AI snake agent simulations (A*, Q-Learning, Approx. QL, Deep QL).

**Live app:** [https://ai-snake-agents-frontend.vercel.app/](https://ai-snake-agents-frontend.vercel.app/)

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/865cef5b-be9f-43d2-911d-c2029ddad857" />


## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Runs the app with hot reload. Expects the backend to be available (e.g. `http://localhost:8000` for simulate/ping).

## Build

```bash
npm run build
```

Output is in `dist/`. Preview the production build with:

```bash
npm run preview
```

## Project structure

- `src/App.tsx` – Main app: model selection, grid(s), playback controls, simulation history table, and shared styles.

## ESLint

The project uses ESLint. To enable stricter type-aware rules, see the [Vite + React + TypeScript ESLint docs](https://vitejs.dev/guide/ssr.html#setting-up-the-dev-server) and consider `tseslint.configs.recommendedTypeChecked` (and related configs) in `eslint.config.js`.
