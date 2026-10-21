// Shared by the Vercel function (api/events.js) and the Vite dev server (vite.config.js).
// Files starting with "_" in api/ are not exposed as routes on Vercel.
const EVENT_LIMIT = 3;

export async function getUpcomingEvents({ calendarId, apiKey }) {
  if (!calendarId || !apiKey) {
    return { status: 501, body: { error: 'Calendar is not configured' } };
  }

  const params = new URLSearchParams({
    key: apiKey,
    timeMin: new Date().toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(EVENT_LIMIT),
  });
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) {
    return { status: 502, body: { error: data.error?.message || `Google Calendar returned ${r.status}` } };
  }

  // Only pass on what the page needs.
  const events = (data.items || []).map((ev) => ({
    id: ev.id,
    summary: ev.summary,
    location: ev.location,
    description: ev.description,
    start: ev.start,
    end: ev.end,
  }));
  return { status: 200, body: { timeZone: data.timeZone, events } };
}
