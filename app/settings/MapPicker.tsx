'use client';

import { useEffect, useRef } from 'react';

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

// Default center if no coords (Riyadh, Saudi Arabia)
const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let L: any;
    let map: any;
    let mounted = true;

    const initMap = async () => {
      // Dynamically import leaflet to avoid SSR issues
      L = (await import('leaflet')).default;

      // Fix default marker icon paths (webpack bundler issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mounted || !mapRef.current) return;

      const centerLat = lat ?? DEFAULT_LAT;
      const centerLng = lng ?? DEFAULT_LNG;

      // Inject Leaflet CSS if not already injected
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: lat && lng ? 13 : 6,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Attribution compact
      L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

      // Marker
      const marker = L.marker([centerLat, centerLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(pos.lat, pos.lng);
      });

      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        onChange(clickLat, clickLng);
      });

      leafletMapRef.current = map;
    };

    initMap();

    return () => {
      mounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when lat/lng props change from outside (e.g. manual inputs)
  useEffect(() => {
    if (!markerRef.current || lat === null || lng === null) return;
    markerRef.current.setLatLng([lat, lng]);
    if (leafletMapRef.current) {
      leafletMapRef.current.panTo([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
