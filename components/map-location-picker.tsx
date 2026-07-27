'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { LeafletMap } from '@/components/leaflet-map';
import {
  buildMapsUrl,
  formatLatLng,
  roundCoord,
  searchPlaces,
  type PlaceResult,
} from '@/lib/map-location';

export interface MapLocationValue {
  /** The original `location_url` field — still sent, still shown to clients. */
  locationUrl: string;
  mapDesc: string;
  lat: number | null;
  lng: number | null;
}

interface MapLocationPickerProps {
  value: MapLocationValue;
  onChange: (value: MapLocationValue) => void;
}

const MAP_DESC_MAX = 500;

/** Below this the query is too vague to spend a geocoder request on. */
const MIN_QUERY_LENGTH = 3;

/** Keeps typing under Nominatim's one-request-per-second policy. */
const SEARCH_DEBOUNCE_MS = 600;

/**
 * The location block of the order form: a pin on the map (`lat` / `lng`), a free
 * text description of where exactly to go (`map_desc`), and the maps link
 * (`location_url`) that older screens and the client portal still read.
 *
 * The link and the pin stay in sync in both directions — picking a point writes
 * a maps link, and pasting a link that carries coordinates moves the pin.
 */
export function MapLocationPicker({ value, onChange }: MapLocationPickerProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Address search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  /**
   * Query text the code wrote rather than the admin — filling the field with a
   * picked result must not bounce straight back into another search.
   */
  const skipQueryRef = useRef<string | null>(null);

  /** Bumped whenever the pin moves from off-map, to pull the view along with it. */
  const [focusSignal, setFocusSignal] = useState(0);

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm';

  const hasPoint = value.lat !== null && value.lng !== null;

  /**
   * The pin is the single source of truth for the link — the field below is
   * read-only, so a moved pin always rewrites it. Leaving a hand-written link in
   * place would strand it: nothing in the UI could correct it afterwards.
   */
  const setPoint = (lat: number, lng: number) => {
    onChange({ ...value, lat, lng, locationUrl: buildMapsUrl({ lat, lng }) });
  };

  const handleClear = () => {
    setGeoError('');
    onChange({ ...value, lat: null, lng: null, locationUrl: '' });
  };

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError(ar ? 'المتصفح لا يدعم تحديد الموقع' : 'This browser has no location support');
      return;
    }
    setGeoError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        setPoint(roundCoord(pos.coords.latitude), roundCoord(pos.coords.longitude));
        setFocusSignal(n => n + 1);
      },
      () => {
        setLocating(false);
        setGeoError(ar ? 'تعذر تحديد موقعك الحالي' : 'Could not determine your location');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /** One in-flight geocode at a time — a newer query aborts the previous one. */
  const runSearch = useCallback(
    async (term: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      setSearchError('');
      try {
        const places = await searchPlaces(term, { language, signal: controller.signal });
        if (controller.signal.aborted) return;
        setResults(places);
        setResultsOpen(true);
        if (places.length === 0) {
          setSearchError(ar ? 'لا توجد نتائج مطابقة' : 'No matching places');
        }
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(ar ? 'تعذر البحث حالياً، حاول مرة أخرى' : 'Search is unavailable right now');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    },
    [ar, language],
  );

  // Debounced search as the admin types.
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) return;
    if (skipQueryRef.current === query) {
      skipQueryRef.current = null;
      return;
    }
    const timer = setTimeout(() => runSearch(term), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  // Drop any request still in flight when the form closes.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Close the results when focus moves elsewhere on the form.
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setResultsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    if (next.trim().length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setResults([]);
      setSearchError('');
      setResultsOpen(false);
      setSearching(false);
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    setPoint(place.lat, place.lng);
    setFocusSignal(n => n + 1);
    skipQueryRef.current = place.label;
    setQuery(place.label);
    setResultsOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
          <MapPin className="w-4 h-4 text-secondary/40" />
          {ar ? 'موقع القاعة على الخريطة' : 'Hall Location on Map'}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-pulse' : ''}`} />
            {ar ? 'موقعي الحالي' : 'Use my location'}
          </button>
          {hasPoint && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs font-medium text-secondary/60 bg-secondary/5 hover:bg-secondary/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              {ar ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Address search — sits above the map's stacking context so the results
          list is not swallowed by Leaflet's panes. */}
      <div className="relative z-30" ref={searchBoxRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-secondary/40 absolute top-1/2 -translate-y-1/2 start-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            placeholder={
              ar ? 'ابحث عن العنوان أو اسم المكان...' : 'Search for an address or place…'
            }
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => results.length > 0 && setResultsOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                // The form would otherwise submit on Enter from inside a field.
                e.preventDefault();
                const term = query.trim();
                if (term.length >= MIN_QUERY_LENGTH) runSearch(term);
              }
              if (e.key === 'Escape') setResultsOpen(false);
            }}
            className={`${inputClass} ps-11 pe-11`}
          />
          {searching && (
            <Loader2 className="w-4 h-4 text-primary absolute top-1/2 -translate-y-1/2 end-4 animate-spin" />
          )}
          {!searching && query && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded-lg text-secondary/40 hover:text-secondary/70 hover:bg-secondary/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {resultsOpen && results.length > 0 && (
          <ul className="absolute z-40 mt-2 w-full max-h-64 overflow-y-auto bg-white border border-secondary/15 rounded-2xl shadow-xl py-1">
            {results.map(place => {
              // `display_name` leads with the place itself and trails the region.
              const [head, ...rest] = place.label.split(',');
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-start hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-sm text-secondary font-medium truncate">
                        {head?.trim()}
                      </span>
                      {rest.length > 0 && (
                        <span className="block text-xs text-secondary/50 truncate">
                          {rest.join(',').trim()}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            <li className="px-3 pt-1.5 pb-1 text-[10px] text-secondary/30 border-t border-secondary/8 mt-1">
              {ar ? 'نتائج البحث من OpenStreetMap' : 'Search results by OpenStreetMap'}
            </li>
          </ul>
        )}

        {searchError && <p className="text-xs text-secondary/50 mt-1.5">{searchError}</p>}
      </div>

      <div className="rounded-xl overflow-hidden border border-white/60 shadow-sm">
        <LeafletMap
          lat={value.lat}
          lng={value.lng}
          onPick={setPoint}
          focusSignal={focusSignal}
          className="h-[260px] w-full z-0"
        />
        <div className="flex items-center justify-between gap-2 bg-white/60 px-3 py-2 text-xs">
          <span className={hasPoint ? 'text-secondary font-mono' : 'text-secondary/40'} dir="ltr">
            {hasPoint
              ? formatLatLng({ lat: value.lat as number, lng: value.lng as number })
              : ar
                ? 'لم يتم تحديد نقطة بعد'
                : 'No point selected yet'}
          </span>
          <span className="text-secondary/40 text-end">
            {ar ? 'اضغط على الخريطة أو اسحب المؤشر' : 'Click the map or drag the pin'}
          </span>
        </div>
      </div>

      {geoError && <p className="text-xs text-red-500">{geoError}</p>}

      {/* Map link — derived from the pin, shown read-only so the two can never
          disagree. Still submitted as `location_url` for the client portal. */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-secondary/80">
          {ar ? 'رابط الخريطة (يُنشأ تلقائياً)' : 'Map Link (auto-generated)'}
        </label>
        <input
          type="url"
          disabled
          readOnly
          placeholder={ar ? 'يظهر بعد تحديد النقطة على الخريطة' : 'Appears once a point is picked'}
          value={value.locationUrl}
          dir="ltr"
          className={`${inputClass} font-mono text-left disabled:bg-secondary/5 disabled:text-secondary/50 disabled:cursor-not-allowed`}
        />
        <p className="text-xs text-secondary/40">
          {ar
            ? 'الرابط يُنشأ من النقطة المحددة على الخريطة ولا يمكن تعديله يدوياً'
            : 'Built from the pin on the map — move the pin to change it'}
        </p>
      </div>

      {/* map_desc — how to actually reach the spot once you are there. */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-secondary/80">
          {ar ? 'وصف الموقع' : 'Location Description'}
        </label>
        <textarea
          rows={2}
          maxLength={MAP_DESC_MAX}
          placeholder={
            ar ? 'المدخل الشمالي بجانب الكوفي' : 'North entrance, next to the coffee shop'
          }
          value={value.mapDesc}
          onChange={e => onChange({ ...value, mapDesc: e.target.value })}
          className={`${inputClass} resize-none`}
        />
        <p className="text-xs text-secondary/40 text-end">
          {value.mapDesc.length}/{MAP_DESC_MAX}
        </p>
      </div>
    </div>
  );
}

export default MapLocationPicker;
