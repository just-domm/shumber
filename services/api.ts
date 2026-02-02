import { AnalysisResult, CropInventory, CropInventoryCreate, User } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'shamba_token';

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
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
  return data as CropInventory[];
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
      image_url: payload.imageUrl
    })
  });

  if (!res.ok) {
    throw new Error('Failed to create inventory');
  }

  return res.json();
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
