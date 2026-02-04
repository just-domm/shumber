'use client';
import React, { useEffect, useRef, useState } from 'react';
import { CropInventory } from '@/app/types/types';

interface HeatMapProps {
  inventory: CropInventory[];
  onSelectCrop: (crop: CropInventory) => void;
  onRegionSelect: (regionName: string) => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

const HeatMap: React.FC<HeatMapProps> = ({
  inventory,
  onSelectCrop,
  onRegionSelect,
  defaultCenter = [-0.3031, 36.08],
  defaultZoom = 11
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [libReady, setLibReady] = useState(false);
  const lastInventoryKeyRef = useRef<string>('');
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);
  const lastHeatPointsRef = useRef<number[][]>([]);
  const [initTick, setInitTick] = useState(0);

  useEffect(() => {
    const loadAssets = async () => {
      if (!document.getElementById('leaflet-css')) {
        await new Promise((r) => {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.onload = r;
          link.onerror = r;
          document.head.appendChild(link);
        });
      }
      if (!(window as any).L) {
        await new Promise((r) => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.onload = r;
          document.head.appendChild(s);
        });
      }
      if (!(window as any).L.heatLayer) {
        await new Promise((r) => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
          s.onload = r;
          document.head.appendChild(s);
        });
      }
      setLibReady(true);
    };
    loadAssets();
  }, []);

  useEffect(() => {
    if (!libReady || !mapContainerRef.current || mapRef.current) return;
    if (mapContainerRef.current.offsetWidth === 0 || mapContainerRef.current.offsetHeight === 0) {
      const retry = window.setTimeout(() => setInitTick((t) => t + 1), 200);
      return () => window.clearTimeout(retry);
    }

    const L = (window as any).L;
    let resizeObserver: ResizeObserver | null = null;
    let scheduleInvalidate: (() => void) | null = null;
    let handleVisibility: (() => void) | null = null;

    try {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        markerZoomAnimation: true,
        scrollWheelZoom: true
      });

      const storedCenter = localStorage.getItem('shumber_map_center');
      const storedZoom = localStorage.getItem('shumber_map_zoom');
      if (storedCenter && storedZoom) {
        try {
          const parsed = JSON.parse(storedCenter) as [number, number];
          const zoom = parseInt(storedZoom, 10);
          mapRef.current.setView(parsed, zoom);
        } catch {
          mapRef.current.setView(defaultCenter, defaultZoom);
        }
      } else {
        mapRef.current.setView(defaultCenter, defaultZoom);
      }

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapRef.current);

      scheduleInvalidate = () => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      };
      window.setTimeout(scheduleInvalidate, 50);
      window.setTimeout(scheduleInvalidate, 400);
      window.setTimeout(scheduleInvalidate, 1200);

      handleVisibility = () => {
        if (document.visibilityState === 'visible' && scheduleInvalidate) {
          scheduleInvalidate();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('resize', scheduleInvalidate);

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !mapRef.current) return;
        const { width, height } = entry.contentRect;
        const last = lastSizeRef.current;
        if (!last || last.width !== width || last.height !== height) {
          lastSizeRef.current = { width, height };
          if (width === 0 || height === 0) {
            if (heatLayerRef.current) {
              mapRef.current.removeLayer(heatLayerRef.current);
              heatLayerRef.current = null;
            }
            return;
          }
          mapRef.current.invalidateSize();
          if (heatLayerRef.current && lastHeatPointsRef.current.length > 0) {
            heatLayerRef.current.setLatLngs(lastHeatPointsRef.current);
          }
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      mapRef.current.on('moveend zoomend', () => {
        if (!mapRef.current) return;
        const center = mapRef.current.getCenter();
        localStorage.setItem('shumber_map_center', JSON.stringify([center.lat, center.lng]));
        localStorage.setItem('shumber_map_zoom', `${mapRef.current.getZoom()}`);
      });

      if (!storedCenter && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mapRef.current) return;
            mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], defaultZoom);
            localStorage.setItem(
              'shumber_map_center',
              JSON.stringify([pos.coords.latitude, pos.coords.longitude])
            );
            localStorage.setItem('shumber_map_zoom', `${defaultZoom}`);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 60000, timeout: 5000 }
        );
      }
    } catch (e) {
      console.error('Leaflet initialization failed', e);
    }

    return () => {
      if (handleVisibility) {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (scheduleInvalidate) {
        window.removeEventListener('resize', scheduleInvalidate);
      }
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [libReady, initTick, defaultCenter, defaultZoom]);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L || !libReady || !mapContainerRef.current) return;
    if (!(mapRef.current as any)._loaded) return;
    const size = mapRef.current.getSize();
    if (size.x === 0 || size.y === 0) {
      window.setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 200);
      return;
    }

    const inventoryKey = inventory
      .map(
        (item) =>
          `${item.id}:${item.location.lat},${item.location.lng}:${item.quantity}:${item.cropName}:${item.farmerName}:${
            item.source || ''
          }`
      )
      .join('|');
    if (inventoryKey === lastInventoryKeyRef.current) return;
    lastInventoryKeyRef.current = inventoryKey;

    const heatPoints = inventory.map((item) => [item.location.lat, item.location.lng, 0.8]);
    lastHeatPointsRef.current = heatPoints;

    if (L.heatLayer) {
      if (heatPoints.length === 0) {
        if (heatLayerRef.current) {
          mapRef.current.removeLayer(heatLayerRef.current);
          heatLayerRef.current = null;
        }
        return;
      }
      if (heatLayerRef.current) {
        heatLayerRef.current.setLatLngs(heatPoints);
      } else {
        heatLayerRef.current = L.heatLayer(heatPoints, {
          radius: 40,
          blur: 25,
          maxZoom: 13,
          gradient: {
            0.2: '#e2e8f0',
            0.4: '#86efac',
            0.6: '#22c55e',
            0.8: '#16a34a',
            1.0: '#000000'
          }
        }).addTo(mapRef.current);
      }
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = inventory.map((item) => {
      const marker = L.circleMarker([item.location.lat, item.location.lng], {
        radius: 12,
        fillColor: '#000',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9
      }).addTo(mapRef.current);

      marker.on('click', () => (item.location.name === 'Njoro' ? onRegionSelect('Njoro') : onSelectCrop(item)));

      const sourceTag = item.source ? `<span style="color:#22c55e; font-size:8px;">● ${item.source}</span>` : '';
      marker.bindTooltip(`<b>${item.farmerName}</b> ${sourceTag}<br/>${item.cropName}`, {
        className: 'uber-tooltip',
        direction: 'top',
        offset: [0, -10]
      });
      return marker;
    });
  }, [inventory, libReady, onRegionSelect, onSelectCrop]);

  return <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-[#f3f4f6] overflow-hidden" />;
};

export default HeatMap;
