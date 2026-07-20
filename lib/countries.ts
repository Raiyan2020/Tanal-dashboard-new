/**
 * Country dialling codes used by every phone input in the dashboard.
 * Extracted from the (now removed) clients module so it stays available to the
 * service-orders and employees forms.
 */

import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

export interface CountryOption {
  code: string;
  flag: string;
  name: string;
  nameAr: string;
  iso: string;
}

const countryCodeToFlag = (countryCode: string) =>
  countryCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));

const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
const arabicNames = new Intl.DisplayNames(['ar'], { type: 'region' });

const rawCountries = getCountries().map((country) => ({
  code: `+${getCountryCallingCode(country)}`,
  flag: countryCodeToFlag(country),
  name: englishNames.of(country) || country,
  nameAr: arabicNames.of(country) || country,
  iso: country,
}));

// Sort so that Gulf/Arab countries appear first
const PRIORITY_ISOS = ['KW', 'SA', 'AE', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'YE', 'MA', 'TN', 'DZ', 'LY', 'SD', 'PS'];

export const COUNTRIES: CountryOption[] = [
  ...rawCountries.filter(c => PRIORITY_ISOS.includes(c.iso)).sort((a, b) => PRIORITY_ISOS.indexOf(a.iso) - PRIORITY_ISOS.indexOf(b.iso)),
  ...rawCountries.filter(c => !PRIORITY_ISOS.includes(c.iso)).sort((a, b) => a.name.localeCompare(b.name)),
];

/** Default dialling code for new records (Kuwait). */
export const DEFAULT_COUNTRY_CODE = '+965';
