/**
 * Helpers for the map location fields (`location_url`, `map_desc`, `lat`, `lng`).
 *
 * The three new fields live alongside the original `location_url`, so the two
 * representations are kept in sync here: picking a point on the map produces a
 * link, and pasting a link recovers the coordinates when it carries any.
 */

/** Kuwait City — the default map view until a point is picked. */
export const DEFAULT_MAP_CENTER = { lat: 29.3759, lng: 47.9774 };

/** Coordinates are stored to 6 decimals — roughly 0.1 m, well past what a pin needs. */
const COORD_PRECISION = 6;

export interface LatLng {
  lat: number;
  lng: number;
}

export const isValidLat = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90;
export const isValidLng = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180;

/** Normalises whatever the API returns for a coordinate — number, string or null. */
export function toCoord(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

/** Rounds a picked coordinate so the payload does not carry float noise. */
export const roundCoord = (value: number) => Number(value.toFixed(COORD_PRECISION));

/** `29.375900, 47.977400` — the read-only chip under the map. */
export const formatLatLng = ({ lat, lng }: LatLng) =>
  `${lat.toFixed(COORD_PRECISION)}, ${lng.toFixed(COORD_PRECISION)}`;

/** The link written back into `location_url` whenever a point is picked. */
export const buildMapsUrl = ({ lat, lng }: LatLng) =>
  `https://www.google.com/maps?q=${lat.toFixed(COORD_PRECISION)},${lng.toFixed(COORD_PRECISION)}`;

/**
 * Patterns that carry a coordinate pair, most specific first. Short links
 * (`maps.app.goo.gl/...`) resolve only server-side, so they yield nothing here
 * and the pasted URL is simply kept as-is.
 */
const URL_COORD_PATTERNS = [
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,               // .../data=!3d29.37!4d47.97
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,                    // /maps/@29.37,47.97,15z
  /[?&](?:q|query|ll|sll|daddr|center)=(-?\d+(?:\.\d+)?)%2C\s*(-?\d+(?:\.\d+)?)/i,
  /[?&](?:q|query|ll|sll|daddr|center)=(?:loc:)?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
  /geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
  /(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,          // bare "29.37, 47.97"
];

/**
 * Pulls a coordinate pair out of a maps link or a "lat, lng" string. Used to
 * recover a pin from orders whose only location is a link — anything saved
 * before the map fields existed, or filled in through the client's own form.
 */
export function parseLatLng(input: string): LatLng | null {
  const text = input.trim();
  if (!text) return null;

  for (const pattern of URL_COORD_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (isValidLat(lat) && isValidLng(lng)) return { lat: roundCoord(lat), lng: roundCoord(lng) };
  }
  return null;
}

// ── Address search ────────────────────────────────────────────────────────────

/**
 * Nominatim is the geocoder behind the same OpenStreetMap data the tiles come
 * from, so it needs no API key. Its usage policy caps callers at one request per
 * second — the picker debounces typing and aborts superseded requests to stay
 * under that, and results must be credited to OpenStreetMap in the UI.
 */
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * The area to prefer, roughly Kuwait. Sent unbounded so an address abroad is
 * still findable, and re-ranked below — Nominatim treats the viewbox as a weak
 * hint only, so a generic name like "قاعة الأفراح" otherwise surfaces halls in
 * other countries ahead of the local ones.
 */
const PREFERRED_AREA = { west: 46.5, south: 28.5, east: 48.5, north: 30.15 };

const PREFERRED_VIEWBOX =
  `${PREFERRED_AREA.west},${PREFERRED_AREA.north},${PREFERRED_AREA.east},${PREFERRED_AREA.south}`;

const isNearby = ({ lat, lng }: LatLng) =>
  lat >= PREFERRED_AREA.south &&
  lat <= PREFERRED_AREA.north &&
  lng >= PREFERRED_AREA.west &&
  lng <= PREFERRED_AREA.east;

export interface PlaceResult {
  id: string;
  /** Full address line as returned by the geocoder. */
  label: string;
  lat: number;
  lng: number;
}

/** Geocodes free text — a hall name, a street, an address — into candidate pins. */
export async function searchPlaces(
  query: string,
  options: { language?: 'ar' | 'en'; signal?: AbortSignal; limit?: number } = {},
): Promise<PlaceResult[]> {
  const { language = 'en', signal, limit = 6 } = options;
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: String(limit),
    addressdetails: '0',
    'accept-language': language === 'ar' ? 'ar' : 'en',
    viewbox: PREFERRED_VIEWBOX,
    bounded: '0',
  });

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Place search failed with ${response.status}`);

  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) return [];

  const places: PlaceResult[] = rows.flatMap((row: any) => {
    const lat = toCoord(row?.lat);
    const lng = toCoord(row?.lon);
    if (lat === null || lng === null || !isValidLat(lat) || !isValidLng(lng)) return [];
    return [{
      id: String(row?.place_id ?? `${lat},${lng}`),
      label: String(row?.display_name ?? row?.name ?? ''),
      lat: roundCoord(lat),
      lng: roundCoord(lng),
    }];
  });

  // Stable partition: local hits first, each group keeping the geocoder's own
  // relevance order.
  return [...places.filter(isNearby), ...places.filter(place => !isNearby(place))];
}
