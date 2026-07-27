'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMapInstance, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, roundCoord } from '@/lib/map-location';

interface LeafletMapProps {
  lat: number | null;
  lng: number | null;
  /**
   * When supplied the map becomes a picker: clicking it or dragging the pin
   * reports the new point. Read-only maps also lock scroll-wheel zoom so the
   * page keeps scrolling over them.
   */
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  /** Zoom applied once a point exists; an empty map always starts zoomed out. */
  zoom?: number;
  /**
   * Bump this to re-centre on the current point at `zoom`. Needed when the pin
   * moves from outside the map — a search result or the browser's geolocation —
   * where the new point may already sit in view but far too zoomed out to see.
   */
  focusSignal?: number;
}

/** Zoom used before any point is picked — the whole country is in view. */
const EMPTY_ZOOM = 9;

/**
 * Inline SVG pin, so the marker needs no image assets and no CDN — Leaflet's
 * default icon resolves its PNGs relative to the bundle and breaks otherwise.
 */
function brandPin(L: typeof import('leaflet')) {
  return L.divIcon({
    className: '',
    html:
      '<svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 22.5s7.2-6.4 7.2-12.5a7.2 7.2 0 1 0-14.4 0c0 6.1 7.2 12.5 7.2 12.5Z" ' +
      'fill="#857363" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="10" r="2.7" fill="#ffffff"/></svg>',
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  });
}

/**
 * OpenStreetMap-backed map used both as a picker (create / edit) and as a
 * read-only preview (order details). Leaflet is imported dynamically because it
 * touches `window` at module scope and would break the server render.
 */
export function LeafletMap({
  lat,
  lng,
  onPick,
  className = '',
  zoom = 15,
  focusSignal,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  // The point the map opens on: the first render's props, read once at mount.
  const initialPointRef = useRef({ lat, lng });
  // Leaflet's handlers outlive the render that registered them, so they always
  // call through this ref rather than closing over a stale `onPick`.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const start = initialPointRef.current;
      const hasPoint = start.lat !== null && start.lng !== null;
      const pickable = Boolean(onPickRef.current);

      const map = L.map(containerRef.current, {
        center: hasPoint
          ? [start.lat as number, start.lng as number]
          : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
        zoom: hasPoint ? zoom : EMPTY_ZOOM,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: pickable,
        dragging: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const placePin = (pinLat: number, pinLng: number) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([pinLat, pinLng]);
          return;
        }
        const marker = L.marker([pinLat, pinLng], {
          icon: brandPin(L),
          draggable: pickable,
        }).addTo(map);
        if (pickable) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onPickRef.current?.(roundCoord(pos.lat), roundCoord(pos.lng));
          });
        }
        markerRef.current = marker;
      };

      if (hasPoint) placePin(start.lat as number, start.lng as number);

      if (pickable) {
        map.on('click', (e: any) => {
          const picked = { lat: roundCoord(e.latlng.lat), lng: roundCoord(e.latlng.lng) };
          placePin(picked.lat, picked.lng);
          onPickRef.current?.(picked.lat, picked.lng);
        });
      }

      // The map is often mounted inside a modal or a collapsed panel, where the
      // container has no size yet and the tiles would lay out against 0×0.
      setTimeout(() => mapRef.current?.invalidateSize(), 0);
    };

    init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount-only: later prop changes are handled by the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin aligned with points set outside the map — a pasted link, the
  // browser's geolocation, the clear button, or hydration of a saved order.
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (lat === null || lng === null) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], {
        icon: brandPin(L),
        draggable: Boolean(onPickRef.current),
      }).addTo(map);
      if (onPickRef.current) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onPickRef.current?.(roundCoord(pos.lat), roundCoord(pos.lng));
        });
      }
      markerRef.current = marker;
    }

    // Only pan when the point moved out of view — panning on every drag would
    // fight the user's own dragging.
    if (!map.getBounds().contains([lat, lng])) {
      map.setView([lat, lng], Math.max(map.getZoom(), zoom));
    }
  }, [lat, lng, zoom]);

  // Fly to the point on request. Deliberately keyed on the signal alone: a
  // coordinate change already runs the effect above, and re-centring whenever
  // `zoom` or the point changes would yank the map out from under the user.
  useEffect(() => {
    if (focusSignal === undefined) return;
    const map = mapRef.current;
    if (!map || lat === null || lng === null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), zoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal]);

  return <div ref={containerRef} className={className} />;
}

export default LeafletMap;
