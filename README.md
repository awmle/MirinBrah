# MirinBrah

A personal workout app for iPhone, built as an installable web app. Everything is stored on the phone; there is no server or account.

- **Plan:** routines with a fixed weekday schedule (rest days included), exercises with sets, reps (e.g. `8–12`), rest time, optional deload set count and a note.
- **Track:** one exercise per screen with a live workout clock, last session's numbers as hints, tick a set to log it and start the rest timer (beeps when done), Next / Finish.
- **Deload weeks:** switch on from Today; sets are halved (rounded down, min 1), weights unchanged, and it ends on Sunday by itself.
- **Analyze:** volume per session for each workout day, and per-exercise charts (top set, estimated 1RM, volume) with deload weeks shaded or hidden. Replacing an exercise keeps the old one's history.
- **Weight:** one weigh-in per day in kg, a chart of daily entries with a 7-day rolling average, Monday–Sunday weekly averages with the change from the week before, and a "Weight today" row on Today.
- **Backup:** Today → gear icon → Export / Restore.

## Develop

Requires Node.js 20+.

```sh
npm install
npm run dev      # local dev server (also reachable from your phone on the same Wi-Fi)
npm test         # logic tests
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Put it on the iPhone

The app has to be served over **HTTPS** for "Add to Home Screen" to work offline. Host the `dist/` folder on any static host (GitHub Pages, Netlify, Cloudflare Pages), then on the iPhone:

1. Open the URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the home screen icon. It opens full-screen and works offline.

Your data lives in that home-screen app's storage on the phone. Updating the hosted files updates the app the next time it opens; your data is kept.
