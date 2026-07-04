const BUSINESS_TIME_ZONE = 'America/Bogota';
const BUSINESS_OFFSET = '-05:00';

function partMap(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>;
}

export function getBusinessDateTime(date = new Date()): string {
  const parts = partMap(date);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${BUSINESS_OFFSET}`;
}

export function getBusinessDateCompact(date = new Date()): string {
  const parts = partMap(date);

  return `${parts.year}${parts.month}${parts.day}`;
}
