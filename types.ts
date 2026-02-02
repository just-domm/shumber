
export enum UserRole {
  FARMER = 'FARMER',
  BUYER = 'BUYER'
}

export enum AppRoute {
  MARKETPLACE = 'MARKETPLACE',
  NEGOTIATION = 'NEGOTIATION',
  ESCROW = 'ESCROW'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  location: string;
  rating?: number;
}

export interface CropInventory {
  id: string;
  farmerId: string;
  farmerName: string;
  cropName: string;
  quantity: number; 
  qualityScore: number; 
  basePrice: number; 
  currentBid: number;
  highestBidderId?: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  imageUrl?: string;
  timestamp: string;
  status: 'AVAILABLE' | 'NEGOTIATING' | 'SOLD';
}

export interface CropInventoryCreate {
  cropName: string;
  quantity: number;
  qualityScore: number;
  basePrice: number;
  currentBid: number;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  imageUrl?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface AnalysisResult {
  cropName: string;
  freshnessScore: number;
  estimatedShelfLife: string;
  marketInsight: string;
}
