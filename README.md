# Kannada Bechdel Test

Tracks the [Bechdel test](https://en.wikipedia.org/wiki/Bechdel_test) for Kannada cinema — five
prominent releases per year, scored and published year over year.

A project by [Bubbly Character](https://bubblycharacter.in).

## Stack

Static site built with [Astro](https://astro.build), no framework/JS runtime needed. Deployed on
Vercel.

## Data

Movie data lives in [`src/data/movies.json`](src/data/movies.json), one object per film. To add or
correct an entry, edit that file directly and open a PR (or push to `main` — it auto-deploys).

Fields:

| Field | Meaning |
| --- | --- |
| `title`, `year`, `director` | Basic film info |
| `femaleCharacters` | Named female characters in the film |
| `twoNamedWomen` | Are there ≥2 named women? |
| `atLeastOneJob`, `job1`, `job2` | Do they have stated jobs? |
| `doTheyTalk` | Do they speak to each other on screen? |
| `conversationNotAboutMan` | Is that conversation about something other than a man? |
| `result` | `Pass` / `Fail` / `Pass (likely)` / `Fail (likely)` |
| `notes` | Free-text rationale |

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview the production build locally |
