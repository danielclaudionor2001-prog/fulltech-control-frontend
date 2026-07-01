import { createMyActivityLog } from '../services/api';

export function sendLocationDebugLog(entry, getToken) {
  return createMyActivityLog(
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
