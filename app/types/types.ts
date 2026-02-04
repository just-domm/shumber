

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
  listingType: 'BIDDING' | 'FIXED';
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
  listingType: 'BIDDING' | 'FIXED';
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: string;
}

export type EscrowStatus = 'PENDING' | 'VERIFIED' | 'RELEASED';

export interface Escrow {
  id: string;
  inventoryId: string;
  buyerId: string;
  amount: number;
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisResult {
  cropName: string;
  freshnessScore: number;
  estimatedShelfLife: string;
  marketInsight: string;
}

export interface OfflineParseResult {
  cropName: string;
  quantity: number;
  locationName: string;
  farmerName?: string;
}

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
  source?: 'APP' | 'SMS' | 'VOICE'; // For tracking offline ingestion
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
