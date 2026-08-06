/**
 * Per-country phone rules for the dialling codes the dashboard actually serves.
 *
 * Numbers are validated in their *international* form — the national trunk `0`
 * is never part of the stored value (`01012345678` in Egypt is `1012345678`
 * here), which is what the API expects alongside `country_code`.
 *
 * The rules target **mobile** numbers: every phone collected in the dashboard is
 * a WhatsApp contact, so a Saudi landline (`11…`) is intentionally rejected in
 * favour of the mobile range (`5…`).
 *
 * Countries outside this table fall back to a length-only sanity check rather
 * than pulling in libphonenumber's full metadata (~20KB gzip) for rules nobody
 * here relies on.
 */

import { COUNTRIES } from '@/lib/countries';

export interface PhoneRule {
  /** Valid national-number lengths, digits only. */
  lengths: number[];
  /** Allowed leading digits; omitted when any prefix is valid. */
  prefixes?: string[];
  /** Shown as the input placeholder. */
  example: string;
}

/** Keyed by dialling code, which is what the forms store. */
export const PHONE_RULES: Record<string, PhoneRule> = {
  '+965': { lengths: [8], example: '50123456' },                            // Kuwait — any 8 digits
  '+966': { lengths: [9], prefixes: ['5'], example: '501234567' },          // Saudi Arabia
  '+971': { lengths: [9], prefixes: ['5'], example: '501234567' },          // UAE
  '+974': { lengths: [8], prefixes: ['3', '5', '6', '7'], example: '33123456' },   // Qatar
  '+973': { lengths: [8], prefixes: ['3', '6'], example: '36123456' },      // Bahrain
  '+968': { lengths: [8], prefixes: ['7', '9'], example: '91234567' },      // Oman
  '+20':  { lengths: [10], prefixes: ['1'], example: '1012345678' },        // Egypt
  '+962': { lengths: [9], prefixes: ['7'], example: '791234567' },          // Jordan
  '+961': { lengths: [7, 8], prefixes: ['3', '7', '8'], example: '71123456' }, // Lebanon — 3x is 7 digits
  '+963': { lengths: [9], prefixes: ['9'], example: '944123456' },          // Syria
  '+964': { lengths: [10], prefixes: ['7'], example: '7912345678' },        // Iraq
  '+967': { lengths: [9], prefixes: ['7'], example: '712345678' },          // Yemen
  '+212': { lengths: [9], prefixes: ['6', '7'], example: '612345678' },     // Morocco
  '+216': { lengths: [8], prefixes: ['2', '4', '5', '9'], example: '20123456' },  // Tunisia
  '+213': { lengths: [9], prefixes: ['5', '6', '7'], example: '551234567' },      // Algeria
  '+218': { lengths: [9], prefixes: ['9'], example: '912345678' },          // Libya
  '+249': { lengths: [9], prefixes: ['1', '9'], example: '912345678' },     // Sudan
  '+970': { lengths: [9], prefixes: ['5'], example: '591234567' },          // Palestine
};

/** Loose bounds for every other country — enough to catch typos, nothing more. */
const FALLBACK_LENGTHS = { min: 6, max: 14 };

/**
 * Digits only, with the national trunk `0` dropped so `0501234567` and
 * `501234567` are stored identically.
 */
export function normalisePhone(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

/** Longest number the country accepts — drives the input's `maxLength`. */
export function phoneMaxLength(countryCode: string): number {
  const rule = PHONE_RULES[countryCode];
  return rule ? Math.max(...rule.lengths) : FALLBACK_LENGTHS.max;
}

export function phoneExample(countryCode: string): string {
  return PHONE_RULES[countryCode]?.example ?? '50123456';
}

const countryName = (countryCode: string, ar: boolean): string => {
  // Several countries can share a dialling code; COUNTRIES is ordered with the
  // Arab ones first, so the first match is the intended one here.
  const match = COUNTRIES.find(c => c.code === countryCode);
  return match ? (ar ? match.nameAr : match.name) : '';
};

/** `['3','5','6']` → `"3, 5 or 6"` / `"3 أو 5 أو 6"`. */
const joinList = (parts: string[], ar: boolean): string => {
  if (parts.length <= 1) return parts[0] ?? '';
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  return ar ? parts.join(' أو ') : `${rest.join(', ')} or ${last}`;
};

/**
 * Human-readable rule for a country, e.g. "10 digits starting with 1".
 * Used both for the field hint and inside the error message.
 */
export function phoneRuleText(countryCode: string, language: 'ar' | 'en'): string {
  const ar = language === 'ar';
  const rule = PHONE_RULES[countryCode];

  if (!rule) {
    return ar
      ? `من ${FALLBACK_LENGTHS.min} إلى ${FALLBACK_LENGTHS.max} رقماً`
      : `${FALLBACK_LENGTHS.min}–${FALLBACK_LENGTHS.max} digits`;
  }

  const lengths = joinList(rule.lengths.map(String), ar);
  const digits = ar ? `${lengths} أرقام` : `${lengths} digits`;
  if (!rule.prefixes) return digits;

  const prefixes = joinList(rule.prefixes, ar);
  return ar ? `${digits} تبدأ بـ ${prefixes}` : `${digits} starting with ${prefixes}`;
}

/**
 * Validates a phone against its country's rule.
 *
 * Returns `null` when valid — including for an empty value, since whether the
 * field is required is the caller's decision (the alternate phone is optional).
 */
export function validatePhone(
  countryCode: string,
  phone: string,
  language: 'ar' | 'en',
): string | null {
  const ar = language === 'ar';
  const digits = normalisePhone(phone);
  if (!digits) return null;

  const rule = PHONE_RULES[countryCode];
  const country = countryName(countryCode, ar);
  const expected = phoneRuleText(countryCode, language);

  if (!rule) {
    if (digits.length < FALLBACK_LENGTHS.min || digits.length > FALLBACK_LENGTHS.max) {
      return ar ? `رقم غير صحيح — المتوقع ${expected}` : `Invalid number — expected ${expected}`;
    }
    return null;
  }

  const lengthOk = rule.lengths.includes(digits.length);
  const prefixOk = !rule.prefixes || rule.prefixes.some(p => digits.startsWith(p));
  if (lengthOk && prefixOk) return null;

  return ar
    ? `رقم ${country} يجب أن يتكون من ${expected}`
    : `${country} numbers must be ${expected}`;
}
