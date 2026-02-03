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
      // Load Leaflet JS & CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!(window as any).L) {
        await new Promise(r => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.onload = r;
          document.head.appendChild(s);
        });
      }
      // Load Heatmap Plugin
      if (!(window as any).L.heatLayer) {
        await new Promise(r => {
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
    const L = (window as any).L;
    
    mapRef.current = L.map(mapContainerRef.current, { 
      zoomControl: false, 
      attributionControl: false 
    }).setView([-0.3031, 36.0800], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(mapRef.current);

    // Fix staggered tiles with a delay
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 400);

    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, [libReady]);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L || !libReady) return;

    // Heat Layer
    if (heatLayerRef.current) mapRef.current.removeLayer(heatLayerRef.current);
    const points = inventory.map(i => [i.location.lat, i.location.lng, 0.7]);
    if (L.heatLayer) {
      heatLayerRef.current = L.heatLayer(points, { 
        radius: 35, 
        blur: 20, 
        gradient: { 0.4: '#86efac', 0.6: '#22c55e', 0.8: '#16a34a', 1.0: '#000000' } 
      }).addTo(mapRef.current);
    }

    // Markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = inventory.map(item => {
      const marker = L.circleMarker([item.location.lat, item.location.lng], {
        radius: 12, fillColor: '#000', color: '#fff', weight: 2, fillOpacity: 0.9
      }).addTo(mapRef.current);
      
      marker.on('click', () => item.location.name === 'Njoro' ? onRegionSelect('Njoro') : onSelectCrop(item));
      
      const sourceTag = item.source ? `<span style="color:#22c55e; font-size:8px;">● ${item.source}</span>` : '';
      marker.bindTooltip(`<b>${item.farmerName}</b> ${sourceTag}<br/>${item.cropName}`, { 
        className: 'uber-tooltip', 
        direction: 'top', 
        offset: [0, -10] 
      });
      return marker;
    });
  }, [inventory, libReady]);

  return <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-[#f3f4f6] overflow-hidden" />;
};

export default HeatMap;
