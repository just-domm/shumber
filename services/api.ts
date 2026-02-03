import {
  AnalysisResult,
  CropInventory,
  CropInventoryCreate,
  Escrow,
  Message,
  OfflineParseResult,
  User
} from '@/app/types/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'shamba_token';

const mapInventory = (item: any): CropInventory => ({
  id: item.id,
  farmerId: item.farmer_id ?? item.farmerId,
  farmerName: item.farmer_name ?? item.farmerName,
  cropName: item.crop_name ?? item.cropName,
  quantity: item.quantity,
  qualityScore: item.quality_score ?? item.qualityScore,
  basePrice: item.base_price ?? item.basePrice,
  currentBid: item.current_bid ?? item.currentBid,
  highestBidderId: item.highest_bidder_id ?? item.highestBidderId ?? undefined,
  location: item.location,
  imageUrl: item.image_url ?? item.imageUrl ?? undefined,
  timestamp: item.timestamp,
  status: item.status,
  listingType: item.listing_type ?? item.listingType ?? 'BIDDING'
});

const mapMessage = (item: any): Message => ({
  id: item.id,
  senderId: item.sender_id ?? item.senderId,
  text: item.text,
  timestamp: item.timestamp
});

const mapEscrow = (item: any): Escrow => ({
  id: item.id,
  inventoryId: item.inventory_id ?? item.inventoryId,
  buyerId: item.buyer_id ?? item.buyerId,
  amount: item.amount,
  status: item.status,
  createdAt: item.created_at ?? item.createdAt,
  updatedAt: item.updated_at ?? item.updatedAt
});

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.toLowerCase(), password })
  });

  if (!res.ok) {
    throw new Error('Login failed');
  }

  return res.json();
};

export const storeToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const fetchMe = async (token: string): Promise<User> => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }
  return res.json();
};

export const fetchInventory = async (): Promise<CropInventory[]> => {
  const res = await fetch(`${API_BASE}/inventory`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch inventory');
  }
  const data = await res.json();
  return (data as any[]).map(mapInventory);
};

export const createInventory = async (
  token: string,
  payload: CropInventoryCreate
): Promise<CropInventory> => {
  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      crop_name: payload.cropName,
      quantity: payload.quantity,
      quality_score: payload.qualityScore,
      base_price: payload.basePrice,
      current_bid: payload.currentBid,
      location: payload.location,
      image_url: payload.imageUrl,
      listing_type: payload.listingType
    })
  });

  if (!res.ok) {
    throw new Error('Failed to create inventory');
  }

  const data = await res.json();
  return mapInventory(data);
};

export const analyzeProduceQuality = async (imageBase64: string): Promise<AnalysisResult> => {
  const res = await fetch(`${API_BASE}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64 })
  });

  if (!res.ok) {
    throw new Error('Analysis failed');
  }

  return res.json();
};

export const parseOfflineMessage = async (payload: {
  text?: string;
  audioBase64?: string;
}): Promise<OfflineParseResult> => {
  const res = await fetch(`${API_BASE}/analysis/offline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: payload.text,
      audio_base64: payload.audioBase64
    })
  });

  if (!res.ok) {
    throw new Error('Offline parsing failed');
  }

  return res.json();
};

export const fetchMessages = async (inventoryId: string, token: string): Promise<Message[]> => {
  const res = await fetch(`${API_BASE}/chat/${inventoryId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error('Failed to fetch messages');
  }
  const data = await res.json();
  return (data as any[]).map(mapMessage);
};

export const sendMessage = async (
  inventoryId: string,
  token: string,
  text: string
): Promise<Message> => {
  const res = await fetch(`${API_BASE}/chat/${inventoryId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
    throw new Error('Failed to send message');
  }
  const data = await res.json();
  return mapMessage(data);
};

export const startEscrow = async (
  inventoryId: string,
  token: string,
  amount?: number
): Promise<Escrow> => {
  const res = await fetch(`${API_BASE}/escrow/${inventoryId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount })
  });
  if (!res.ok) {
    let detail = 'Failed to start escrow';
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const data = await res.json();
  return mapEscrow(data);
};

export const verifyEscrow = async (inventoryId: string, token: string): Promise<Escrow> => {
  const res = await fetch(`${API_BASE}/escrow/${inventoryId}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    let detail = 'Failed to verify escrow';
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const data = await res.json();
  return mapEscrow(data);
};

export const releaseEscrow = async (inventoryId: string, token: string): Promise<Escrow> => {
  const res = await fetch(`${API_BASE}/escrow/${inventoryId}/release`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    let detail = 'Failed to release escrow';
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const data = await res.json();
  return mapEscrow(data);
};
