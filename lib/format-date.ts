/**
 * Locale-aware rendering for the date strings the API returns.
 *
 * The backend is not consistent about its format — some fields come back as
 * ISO (`2026-08-04T10:05:00Z`), some as a pre-formatted English string
 * (`Aug 4, 2026, 10:05 AM`) — and none of them are localised, so an Arabic UI
 * would otherwise show English months. Anything unparseable is passed through
 * untouched rather than replaced with "Invalid Date".
 */

/** Date-only, no time component: `2026-08-04`. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `new Date('2026-08-04')` is parsed as *UTC* midnight, which renders as the
 * previous day west of Greenwich — date-only values are built locally instead.
 */
function parse(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (DATE_ONLY.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const locale = (language: 'ar' | 'en') => (language === 'ar' ? 'ar' : 'en-US');

/**
 * `numberingSystem: 'latn'` keeps Arabic dates on Latin digits (`4 أغسطس 2026`,
 * not `٤ أغسطس ٢٠٢٦`) so they read the same as the reference numbers and phone
 * numbers alongside them.
 */
const OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
};

/** `2026-08-04` → `4 أغسطس 2026` / `August 4, 2026`. */
export function formatDate(value: string | null | undefined, language: 'ar' | 'en'): string {
  if (!value) return '—';
  const date = parse(value);
  if (!date) return value;
  return date.toLocaleDateString(locale(language), { ...OPTIONS, numberingSystem: 'latn' });
}

/** `2026-08-04T10:05:00Z` → `4 أغسطس 2026، 10:05 ص` / `August 4, 2026, 10:05 AM`. */
export function formatDateTime(value: string | null | undefined, language: 'ar' | 'en'): string {
  if (!value) return '—';
  const date = parse(value);
  if (!date) return value;
  return date.toLocaleString(locale(language), {
    ...OPTIONS,
    ...TIME_OPTIONS,
    numberingSystem: 'latn',
  });
}

/** Day and time split apart, for stacking them on separate lines. */
export function formatDateParts(
  value: string | null | undefined,
  language: 'ar' | 'en',
): { date: string; time: string | null } | null {
  if (!value) return null;
  const parsed = parse(value);
  if (!parsed) return { date: value, time: null };

  const hasTime = !DATE_ONLY.test(value.trim());
  return {
    date: parsed.toLocaleDateString(locale(language), { ...OPTIONS, numberingSystem: 'latn' }),
    time: hasTime
      ? parsed.toLocaleTimeString(locale(language), { ...TIME_OPTIONS, numberingSystem: 'latn' })
      : null,
  };
}
