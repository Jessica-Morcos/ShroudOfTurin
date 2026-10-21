import { getUpcomingEvents } from './_calendar.js';

// GET /api/events: the next few talks from the public Google Calendar.
// The API key stays on the server (GCAL_ID / GCAL_API_KEY in Vercel's environment variables).
export default async function handler(req, res) {
  const { status, body } = await getUpcomingEvents({
    calendarId: process.env.GCAL_ID,
    apiKey: process.env.GCAL_API_KEY,
  });

  // Let Vercel's CDN reuse the answer for 5 minutes so Google isn't called on every page view.
  if (status === 200) res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(status).json(body);
}
