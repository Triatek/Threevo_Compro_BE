/**
 * Business dates use Indonesia Western Time (WIB, UTC+7, no daylight saving).
 */
export const BUSINESS_TIMEZONE = 'Asia/Jakarta';
const OFFSET = '+07:00';

/** "2026-01-31" -> Date at 00:00:00.000 WIB */
export function startOfBusinessDay(dateString) {
  return new Date(`${dateString}T00:00:00.000${OFFSET}`);
}

/** "2026-01-31" -> Date at 23:59:59.999 WIB */
export function endOfBusinessDay(dateString) {
  return new Date(`${dateString}T23:59:59.999${OFFSET}`);
}

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Date -> "YYYY-MM-DD" in WIB */
export function formatBusinessDate(date) {
  return dateFormatter.format(date);
}

/** Date -> "YYYY-MM-DD HH:mm" in WIB */
export function formatBusinessDateTime(date) {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${formatBusinessDate(date)} ${time}`;
}
