'use client';
import React, { useEffect, useRef, useState } from 'react';
import { CropInventory } from '@/types';

interface HeatMapProps {
  inventory: CropInventory[];
  onSelectCrop: (crop: CropInventory) => void;
  onRegionSelect: (regionName: string) => void;
}

const HeatMap: React.FC<HeatMapProps> = ({ inventory, onSelectCrop, onRegionSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [libReady, setLibReady] = useState(false);
  const lastInventoryKeyRef = useRef<string>('');
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);

  // Dynamically load Leaflet JS, CSS, and Heat Plugin
  useEffect(() => {
    const loadAssets = async () => {
      // 1. Load CSS if not present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 2. Load Leaflet JS
      if (!(window as any).L) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      // 3. Load Heatmap Plugin
      if (!(window as any).L.heatLayer) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
          script.async = true;
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      setLibReady(true);
    };

    loadAssets();
  }, []);

  const [initTick, setInitTick] = useState(0);

  useEffect(() => {
    if (!libReady || !mapContainerRef.current || mapRef.current) return;
    if (mapContainerRef.current.offsetWidth === 0 || mapContainerRef.current.offsetHeight === 0) {
      const retry = window.setTimeout(() => setInitTick((t) => t + 1), 200);
      return () => window.clearTimeout(retry);
    }

    const L = (window as any).L;
    
    try {
      // Initialize Map instance
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        markerZoomAnimation: true,
        scrollWheelZoom: true
      }).setView([-0.3031, 36.0800], 11);

      // Add Tile Layer (CartoDB Positron for clean look)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(mapRef.current);

      // Force size recalculation after a short delay to fix tile staggering
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 250);

      // Robust Resize Handling
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !mapRef.current) return;
        const { width, height } = entry.contentRect;
        const last = lastSizeRef.current;
        if (!last || last.width !== width || last.height !== height) {
          lastSizeRef.current = { width, height };
          mapRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    } catch (e) {
      console.error("Leaflet initialization failed", e);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [libReady, initTick]);

  // Handle Markers and Heat Layer Update
  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L || !libReady) return;
    if (!mapContainerRef.current) return;
    if (mapContainerRef.current.offsetWidth === 0 || mapContainerRef.current.offsetHeight === 0) {
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
          `${item.id}:${item.location.lat},${item.location.lng}:${item.quantity}:${item.cropName}`
      )
      .join('|');
    if (inventoryKey === lastInventoryKeyRef.current) return;
    lastInventoryKeyRef.current = inventoryKey;

    const heatPoints = inventory.map(item => [
      item.location.lat,
      item.location.lng,
      0.8
    ]);

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

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    inventory.forEach((item) => {
      const marker = L.circleMarker([item.location.lat, item.location.lng], {
        radius: 12,
        fillColor: '#000',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
        className: 'shumber-marker'
      }).addTo(mapRef.current);

      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        if (item.location.name === 'Njoro') {
          onRegionSelect('Njoro');
        } else {
          onSelectCrop(item);
        }
      });

      marker.bindTooltip(`<b>${item.farmerName}</b><br/>${item.cropName}`, {
        direction: 'top',
        className: 'uber-tooltip',
        offset: [0, -10]
      });

      markersRef.current.push(marker);
    });
  }, [inventory, onSelectCrop, onRegionSelect, libReady]);

  return (
    <div 
      ref={mapContainerRef} 
      className="absolute inset-0 w-full h-full bg-[#f3f4f6]"
      style={{ 
        minHeight: '400px',
        overflow: 'hidden'
      }}
    />
  );
};

export default HeatMap;
