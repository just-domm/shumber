
import { CropInventory } from '@/app/types/types';

export const NAKURU_LOCATIONS = [
  { name: 'Molo', lat: -0.2483, lng: 35.7324 },
  { name: 'Bahati', lat: -0.1477, lng: 36.1558 },
  { name: 'Naivasha', lat: -0.7172, lng: 36.4310 },
  { name: 'Gilgil', lat: -0.4851, lng: 36.3150 },
  { name: 'Njoro', lat: -0.3411, lng: 35.9400 },
  { name: 'Rongai', lat: -0.1742, lng: 35.8617 },
  { name: 'Subukia', lat: 0.0076, lng: 36.2239 },
  { name: 'Kuresoi', lat: -0.2194, lng: 35.5398 },
  { name: 'Nakuru CBD', lat: -0.3031, lng: 36.0800 }
];

export const INITIAL_INVENTORY: CropInventory[] = [
  {
    id: 'c1',
    farmerId: 'f1',
    farmerName: 'Mzee Juma',
    cropName: 'Potatoes (Shangi)',
    quantity: 1200,
    qualityScore: 88,
    basePrice: 45,
    currentBid: 48,
    location: NAKURU_LOCATIONS[4], // Njoro
    timestamp: new Date().toISOString(),
    status: 'AVAILABLE',
    listingType: 'BIDDING'
  },
  {
    id: 'c1-alt',
    farmerId: 'f5',
    farmerName: 'Jane Koech',
    cropName: 'Carrots',
    quantity: 450,
    qualityScore: 92,
    basePrice: 30,
    currentBid: 32,
    location: { name: 'Njoro', lat: -0.3450, lng: 35.9450 },
    timestamp: new Date().toISOString(),
    status: 'AVAILABLE',
    listingType: 'BIDDING'
  },
  {
    id: 'c2',
    farmerId: 'f2',
    farmerName: 'Sarah Wambui',
    cropName: 'Sukuma Wiki',
    quantity: 300,
    qualityScore: 95,
    basePrice: 20,
    currentBid: 22,
    location: NAKURU_LOCATIONS[1], // Bahati
    timestamp: new Date().toISOString(),
    status: 'AVAILABLE',
    listingType: 'BIDDING'
  },
  {
    id: 'c3',
    farmerId: 'f3',
    farmerName: 'John Koech',
    cropName: 'Carrots',
    quantity: 800,
    qualityScore: 72,
    basePrice: 35,
    currentBid: 35,
    location: NAKURU_LOCATIONS[4], // Njoro
    timestamp: new Date().toISOString(),
    status: 'AVAILABLE',
    listingType: 'BIDDING'
  }
];
