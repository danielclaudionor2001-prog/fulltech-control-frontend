import { createMyActivityLog } from '../services/api';

export function sendUserActivityLog(
  { event, level = 'info', message, metadata = {}, source = 'app' },
  getToken,
) {
  return createMyActivityLog(
    {
      event,
      level,
      message: message || event,
      metadata,
      source,
    },
    getToken,
  );
}

export function sendLocationDebugLog(entry, getToken) {
  return sendUserActivityLog(
    {
      event: `location.${entry.event}`,
      level: entry.level || 'info',
      message: entry.message || entry.event,
      metadata: entry,
      source: entry.source || 'location',
    },
    getToken,
  );
}
