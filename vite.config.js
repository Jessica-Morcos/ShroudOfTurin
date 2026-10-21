import { defineConfig, loadEnv } from 'vite';
import { getUpcomingEvents } from './api/_calendar.js';

// Serves /api/events during `npm run dev` the same way the Vercel function does in production.
function devEventsApi(env) {
  return {
    name: 'dev-events-api',
    configureServer(server) {
      server.middlewares.use('/api/events', async (req, res) => {
        const { status, body } = await getUpcomingEvents({ calendarId: env.GCAL_ID, apiKey: env.GCAL_API_KEY });
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load all .env values (not just VITE_ ones) for the dev server only; none of these reach the browser.
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [devEventsApi(env)] };
});
