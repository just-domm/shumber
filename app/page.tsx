'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User, UserRole, CropInventory, CropInventoryCreate, AppRoute, Escrow } from '@/app/types/types';
import { NAKURU_LOCATIONS } from '../constants';
import {
  createInventory,
  fetchInventory,
  login,
  fetchMe,
  storeToken,
  getStoredToken,
  clearToken,
  startEscrow,
  placeBid,
  updateInventory
} from '@/services/api';
import HeatMap from '@/app/components/HeatMap';
import ChatPortal from '@/app/components/ChatPortal';
import EscrowPortal from '@/app/components/EscrowPortal';
import FarmerDashboard from '@/app/components/FarmerDashboard';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.BUYER);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  const [inventory, setInventory] = useState<CropInventory[]>([]);
  const [route, setRoute] = useState<AppRoute>(AppRoute.MARKETPLACE);
  const [selectedCrop, setSelectedCrop] = useState<CropInventory | null>(null);
  const [drillDownRegion, setDrillDownRegion] = useState<string | null>(null);
  const [notification, setNotification] = useState<{show: boolean, type: string} | null>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [requestQuantity, setRequestQuantity] = useState<string>('');
  const [bidAmount, setBidAmount] = useState<string>('');
  const [pendingRoute, setPendingRoute] = useState<AppRoute | null>(null);
  const [pendingCropId, setPendingCropId] = useState<string | null>(null);
  const [pendingRegion, setPendingRegion] = useState<string | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState<string | null>(null);
  const [pendingCropSnapshot, setPendingCropSnapshot] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; tone: 'info' | 'success' | 'error' } | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const user: User = authUser || {
    id: 'guest',
    name: 'Guest User',
    role: UserRole.BUYER,
    location: 'Nakuru'
  };

  const farmersInRegion = drillDownRegion 
    ? inventory.filter(i => i.location.name === drillDownRegion)
    : [];

  const lastSelectedIdRef = useRef<string | null>(null);

  const handleConnectRequest = (crop: CropInventory) => {
    setSelectedCrop(crop);
    setNotification({ show: true, type: 'REQUESTING' });
    
    setTimeout(() => {
      setNotification({ show: true, type: 'ACCEPTED' });
      setTimeout(() => {
        setNotification(null);
        setRoute(AppRoute.NEGOTIATION);
      }, 1500);
    }, 2500);
  };

  const showToast = useCallback((message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast({ show: true, message, tone });
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { message?: string; tone?: 'info' | 'success' | 'error' } | undefined;
      if (!detail?.message) return;
      showToast(detail.message, detail.tone || 'info');
    };
    window.addEventListener('shumber-toast', handler as EventListener);
    return () => window.removeEventListener('shumber-toast', handler as EventListener);
  }, [showToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (route === AppRoute.MARKETPLACE) {
      localStorage.setItem('shumber_route', route);
    } else {
      localStorage.removeItem('shumber_route');
    }
  }, [route]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedCrop) {
      localStorage.setItem('shumber_selected_crop_id', selectedCrop.id);
      localStorage.setItem('shumber_selected_crop_snapshot', JSON.stringify(selectedCrop));
    } else {
      localStorage.removeItem('shumber_selected_crop_id');
      localStorage.removeItem('shumber_selected_crop_snapshot');
    }
  }, [selectedCrop]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (drillDownRegion) {
      localStorage.setItem('shumber_region', drillDownRegion);
    } else {
      localStorage.removeItem('shumber_region');
    }
  }, [drillDownRegion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (requestQuantity) {
      localStorage.setItem('shumber_request_quantity', requestQuantity);
    } else {
      localStorage.removeItem('shumber_request_quantity');
    }
  }, [requestQuantity]);

  const handleStartEscrow = async () => {
    if (!selectedCrop) return;
    if (!authToken) {
      showToast('Please log in to start escrow.', 'error');
      return;
    }
    try {
      const quantity = Math.max(
        1,
        Math.min(selectedCrop.quantity, parseInt(requestQuantity || `${selectedCrop.quantity}`, 10))
      );
      const amount = selectedCrop.currentBid * quantity;
      const created = await startEscrow(selectedCrop.id, authToken, amount);
      setEscrow(created);
      setRoute(AppRoute.ESCROW);
    } catch (error) {
      console.error('Failed to start escrow', error);
      const message = error instanceof Error ? error.message : 'Escrow setup failed. Please try again.';
      showToast(message, 'error');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedRoute = localStorage.getItem('shumber_route') as AppRoute | null;
    const storedCropId = localStorage.getItem('shumber_selected_crop_id');
    const storedCropSnapshot = localStorage.getItem('shumber_selected_crop_snapshot');
    const storedRegion = localStorage.getItem('shumber_region');
    const storedQuantity = localStorage.getItem('shumber_request_quantity');
    if (storedRoute) {
      setPendingRoute(storedRoute);
    }
    if (storedCropId) {
      setPendingCropId(storedCropId);
    }
    if (storedRegion) {
      setPendingRegion(storedRegion);
    }
    if (storedQuantity) {
      setPendingQuantity(storedQuantity);
    }
    if (storedCropSnapshot) {
      setPendingCropSnapshot(storedCropSnapshot);
    }
  }, []);

  const loadInventory = async () => {
    setIsLoadingInventory(true);
    setInventoryError(null);
    try {
      const items = await fetchInventory();
      setInventory(items);
      if (items.length === 0) {
        setInventoryError('No inventory available yet. Ask a farmer to post a listing.');
      }
    } catch (error) {
      console.error('Failed to load inventory.', error);
      setInventoryError('Unable to fetch inventory. Check if the backend is running.');
      showToast('Inventory sync failed. Please retry.', 'error');
    } finally {
      setIsLoadingInventory(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (pendingRegion) {
      setDrillDownRegion(pendingRegion);
    }
    if (pendingQuantity) {
      setRequestQuantity(pendingQuantity);
    }
    if (!pendingCropId) {
      if (pendingRoute && pendingRoute === AppRoute.MARKETPLACE) {
        setRoute(pendingRoute);
      }
      setPendingRegion(null);
      setPendingQuantity(null);
      setPendingRoute(null);
      setPendingCropSnapshot(null);
      return;
    }
    const match = inventory.find((item) => item.id === pendingCropId);
    if (match) {
      setSelectedCrop(match);
      if (pendingRoute) {
        setRoute(pendingRoute);
      }
    } else {
      setSelectedCrop(null);
      if (route !== AppRoute.MARKETPLACE) {
        setRoute(AppRoute.MARKETPLACE);
      }
    }
    setPendingCropId(null);
    setPendingRoute(null);
    setPendingRegion(null);
    setPendingQuantity(null);
    setPendingCropSnapshot(null);
  }, [inventory, pendingCropId, pendingRoute, pendingRegion, pendingQuantity, pendingCropSnapshot]);

  useEffect(() => {
    if (!selectedCrop) {
      lastSelectedIdRef.current = null;
      return;
    }
    if (lastSelectedIdRef.current !== selectedCrop.id) {
      setRequestQuantity('');
      setBidAmount('');
      lastSelectedIdRef.current = selectedCrop.id;
    }
  }, [selectedCrop]);

  useEffect(() => {
    if (!selectedCrop) return;
    const updated = inventory.find((item) => item.id === selectedCrop.id);
    if (updated) {
      setSelectedCrop(updated);
    }
  }, [inventory, selectedCrop]);

  useEffect(() => {
    if (!selectedCrop) return;
    const stillExists = inventory.some((item) => item.id === selectedCrop.id);
    if (!stillExists) {
      setSelectedCrop(null);
      if (route !== AppRoute.MARKETPLACE) {
        setRoute(AppRoute.MARKETPLACE);
      }
    }
  }, [inventory, route, selectedCrop]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const stored = getStoredToken();
      if (!stored) return;
      setIsAuthLoading(true);
      try {
        const me = await fetchMe(stored);
        setAuthUser(me);
        setAuthToken(stored);
        setUserRole(me.role);
      } catch (error) {
        clearToken();
      } finally {
        setIsAuthLoading(false);
      }
    };
    bootstrapAuth();
  }, []);

  const handleLogin = async (): Promise<boolean> => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const token = await login(loginEmail, loginPassword);
      storeToken(token.access_token);
      const me = await fetchMe(token.access_token);
      setAuthUser(me);
      setAuthToken(token.access_token);
      setUserRole(me.role);
      setLoginPassword('');
      return true;
    } catch (error) {
      setAuthError('Login failed. Check your credentials.');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setAuthUser(null);
    setAuthToken(null);
    setUserRole(UserRole.BUYER);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shumber_route');
      localStorage.removeItem('shumber_selected_crop_id');
      localStorage.removeItem('shumber_selected_crop_snapshot');
      localStorage.removeItem('shumber_region');
      localStorage.removeItem('shumber_request_quantity');
    }
  };

  const handleCreateInventory = async (payload: CropInventoryCreate) => {
    try {
      if (!authToken) {
        showToast('Please log in as a farmer first.', 'error');
        return null;
      }
      const created = await createInventory(authToken, payload);
      setInventory((prev) => [created, ...prev]);
      setUserRole(UserRole.BUYER);
      setRoute(AppRoute.MARKETPLACE);
      setNotification({ show: true, type: 'ACCEPTED' });
      setTimeout(() => setNotification(null), 2000);
      return created;
    } catch (error) {
      console.error('Failed to create inventory', error);
      showToast('Posting failed. Please ensure the backend is running.', 'error');
      return null;
    }
  };

  const handlePlaceBid = async (item: CropInventory) => {
    if (!authToken) {
      showToast('Please log in as a buyer to place a bid.', 'error');
      return;
    }
    const amount = parseInt(bidAmount, 10);
    if (!amount || amount <= item.currentBid) {
      showToast('Bid must be higher than the current price.', 'error');
      return;
    }
    try {
      const updated = await placeBid(item.id, authToken, amount);
      setInventory((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      setSelectedCrop(updated);
      showToast('Bid submitted!', 'success');
      setBidAmount('');
    } catch (error) {
      console.error('Failed to place bid', error);
      showToast('Bid failed. Please retry.', 'error');
    }
  };

  const handleLockPrice = async (item: CropInventory) => {
    if (!authToken) {
      showToast('Please log in as a farmer to lock a price.', 'error');
      return;
    }
    try {
      const updated = await updateInventory(item.id, authToken, {
        currentBid: item.currentBid,
        listingType: 'FIXED'
      });
      setInventory((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      if (selectedCrop?.id === updated.id) {
        setSelectedCrop(updated);
      }
      showToast('Price locked.', 'success');
    } catch (error) {
      console.error('Failed to lock price', error);
      showToast('Unable to lock price.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50 font-sans overflow-x-hidden">
      {/* Uber-style Toast Notification */}
      {notification?.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-6">
          <div className="bg-black text-white p-5 rounded-3xl shadow-2xl flex items-center space-x-4 border border-gray-800 animate-bounce">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25"></div>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight">
                {notification.type === 'REQUESTING' ? 'Requesting Connection...' : 'Status Updated!'}
              </p>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                {notification.type === 'REQUESTING' ? 'Connecting to Hub...' : 'Live on Marketplace'}
              </p>
            </div>
          </div>
        </div>
      )}

      {toast?.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-6">
          <div
            className={`p-4 rounded-3xl shadow-2xl border flex items-center space-x-3 ${
              toast.tone === 'success'
                ? 'bg-green-600 text-white border-green-700'
                : toast.tone === 'error'
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-black text-white border-gray-800'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Global Navbar */}
      <nav className="bg-black text-white px-4 md:px-8 py-4 md:py-5 flex flex-wrap justify-between items-center gap-4 z-[60] shadow-2xl shrink-0 relative">
        <div className="flex items-center space-x-3 md:space-x-4 cursor-pointer" onClick={() => {setRoute(AppRoute.MARKETPLACE); setDrillDownRegion(null);}}>
          <div className="bg-white text-black px-2.5 py-1 rounded-md font-black text-2xl italic tracking-tighter shadow-lg">S</div>
          <div>
            <span className="text-2xl font-black tracking-tighter">Shumber</span>
            <p className="text-[9px] text-green-500 font-black uppercase tracking-[0.2em] leading-none">Uber for harvests</p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          {!authUser ? (
            <div className="hidden lg:flex items-center space-x-3 bg-gray-900/60 border border-gray-800 rounded-full px-4 py-2">
              <input
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="email"
                className="bg-transparent text-xs text-white placeholder-gray-500 outline-none w-40"
              />
              <input
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                type="password"
                placeholder="password"
                className="bg-transparent text-xs text-white placeholder-gray-500 outline-none w-32"
              />
              <button
                onClick={handleLogin}
                disabled={isAuthLoading || !loginEmail || !loginPassword}
                className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full disabled:opacity-40"
              >
                {isAuthLoading ? '...' : 'Login'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="bg-gray-800 hover:bg-gray-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-gray-700 transition-colors"
            >
              Logout
            </button>
          )}
          {!authUser && (
            <button
              onClick={() => setShowLogin(true)}
              className="lg:hidden bg-white text-black text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full"
            >
              Login
            </button>
          )}
          <div className="hidden lg:flex items-center gap-4">
            {authError && (
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                {authError}
              </span>
            )}
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-green-800 overflow-hidden shadow-inner">
               <img src={`https://ui-avatars.com/api/?name=${user.name}&background=000&color=fff&bold=true`} alt="User" />
            </div>
          </div>
          <button
            onClick={() => setIsNavOpen((v) => !v)}
            className="lg:hidden w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center bg-gray-900/60"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {isNavOpen && (
          <div className="lg:hidden absolute top-full right-4 mt-3 w-72 bg-black border border-gray-800 rounded-2xl shadow-2xl p-4 space-y-3 z-[70]">
            {authError && (
              <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                {authError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border-2 border-green-800 overflow-hidden shadow-inner">
                <img src={`https://ui-avatars.com/api/?name=${user.name}&background=000&color=fff&bold=true`} alt="User" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest">{user.name}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{userRole}</p>
              </div>
            </div>
            {!authUser ? (
              <button
                onClick={() => {
                  setShowLogin(true);
                  setIsNavOpen(false);
                }}
                className="w-full bg-white text-black text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full"
              >
                Login
              </button>
            ) : (
              <button
                onClick={() => {
                  handleLogout();
                  setIsNavOpen(false);
                }}
                className="w-full bg-gray-800 hover:bg-gray-700 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full border border-gray-700 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </nav>

          <div className="flex-1 relative flex flex-col overflow-hidden">
        {showLogin && !authUser && (
          <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-6">
            <div className="bg-white rounded-[28px] p-8 w-full max-w-sm">
              <h3 className="text-2xl font-black tracking-tight mb-4">Sign in</h3>
              <div className="space-y-3 mb-4">
                <input
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="email"
                  className="w-full bg-gray-100 rounded-2xl p-4 text-sm font-bold"
                />
                <input
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  type="password"
                  placeholder="password"
                  className="w-full bg-gray-100 rounded-2xl p-4 text-sm font-bold"
                />
              </div>
              {authError && (
                <p className="text-xs text-red-500 font-bold uppercase tracking-widest mb-3">{authError}</p>
              )}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowLogin(false)}
                  className="text-xs font-black text-gray-400 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const ok = await handleLogin();
                    if (ok) setShowLogin(false);
                  }}
                  disabled={isAuthLoading || !loginEmail || !loginPassword}
                  className="bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full disabled:opacity-40"
                >
                  {isAuthLoading ? '...' : 'Login'}
                </button>
              </div>
            </div>
          </div>
        )}
        {userRole === UserRole.FARMER ? (
          <div className="flex-1 overflow-y-auto">
            {route === AppRoute.NEGOTIATION && selectedCrop ? (
              <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
                <div className="max-w-2xl mx-auto mb-4">
                  <button
                    onClick={() => setRoute(AppRoute.MARKETPLACE)}
                    className="text-xs font-black text-gray-400 hover:text-black flex items-center space-x-2"
                  >
                    <span>←</span> <span>BACK TO DASHBOARD</span>
                  </button>
                </div>
                <ChatPortal
                  currentUser={user}
                  connectedWith={selectedCrop}
                  authToken={authToken || ''}
                  onConfirmQuality={handleStartEscrow}
                />
              </div>
            ) : route === AppRoute.ESCROW && selectedCrop ? (
              <div className="flex-1 bg-gray-50 p-6 overflow-y-auto flex flex-col items-center justify-center">
                <div className="w-full max-w-md mb-4">
                  <button
                    onClick={() => setRoute(AppRoute.MARKETPLACE)}
                    className="text-xs font-black text-gray-400 hover:text-black flex items-center space-x-2"
                  >
                    <span>←</span> <span>BACK TO DASHBOARD</span>
                  </button>
                </div>
                <EscrowPortal
                  item={selectedCrop}
                  authToken={authToken || ''}
                  escrow={escrow}
                  onRelease={() => {
                    showToast(`M-PESA B2B SUCCESS: Funds released to ${selectedCrop.farmerName}`, 'success');
                    setInventory((prev) =>
                      prev.map((item) =>
                        item.id === selectedCrop.id ? { ...item, status: 'SOLD' } : item
                      )
                    );
                    setRoute(AppRoute.MARKETPLACE);
                    setDrillDownRegion(null);
                    setSelectedCrop(null);
                    setEscrow(null);
                  }}
                />
              </div>
            ) : authUser?.role === UserRole.FARMER ? (
              <FarmerDashboard
                user={{...user, role: UserRole.FARMER}}
                onCreateInventory={handleCreateInventory}
                inventory={inventory}
                authToken={authToken || ''}
                onOpenChat={(item) => {
                  setSelectedCrop(item);
                  setRoute(AppRoute.NEGOTIATION);
                }}
                onLockPrice={handleLockPrice}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-10">
                <div className="bg-white p-10 rounded-[32px] shadow-xl border border-gray-100 text-center max-w-md">
                  <h3 className="text-2xl font-black tracking-tight mb-2">Farmer Access Required</h3>
                  <p className="text-sm text-gray-500 font-medium mb-6">
                    Log in with a farmer account to post inventory.
                  </p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    Demo: mzee@example.com / password123
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {route === AppRoute.MARKETPLACE && (
              <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
                {/* Map Container - Important: set relative and flex-1 */}
                <div className="flex-1 relative bg-gray-200 min-h-[45vh] lg:min-h-full overflow-hidden">
                  <HeatMap 
                    inventory={inventory} 
                    onSelectCrop={setSelectedCrop} 
                    onRegionSelect={setDrillDownRegion} 
                    defaultCenter={[NAKURU_LOCATIONS[8].lat, NAKURU_LOCATIONS[8].lng]}
                    defaultZoom={11}
                  />
                  {!isLoadingInventory && inventory.length === 0 && (
                    <div className="absolute inset-0 z-[35] flex items-center justify-center bg-white/60 backdrop-blur-sm">
                      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xl text-center max-w-sm mx-6">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">No Listings Yet</p>
                        <p className="text-sm font-semibold text-gray-600">
                          {inventoryError || 'Inventory is empty. Create a listing as a farmer to populate the heatmap.'}
                        </p>
                        <button
                          onClick={loadInventory}
                          className="mt-4 bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full"
                        >
                          Refresh Inventory
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-6 left-6 z-[40]">
                    <div className="bg-white px-5 py-2.5 rounded-full shadow-2xl border border-gray-100 flex items-center space-x-3">
                       <div className="w-2.5 h-2.5 bg-black rounded-full animate-pulse"></div>
                       <span className="text-[11px] font-black uppercase tracking-widest">
                         {isLoadingInventory ? 'Syncing Inventory...' : 'Live Surplus Hubs'}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[420px] bg-white border-l border-gray-100 overflow-y-auto p-5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 shadow-2xl z-50 shrink-0">
                  {drillDownRegion ? (
                    <div className="animate-slideInRight">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-3xl font-black tracking-tighter">{drillDownRegion} Hub</h2>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Available Pickups</p>
                        </div>
                        <button onClick={() => setDrillDownRegion(null)} className="text-xs font-black text-gray-300 hover:text-black transition-colors">BACK</button>
                      </div>
                      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                        {farmersInRegion.map(item => (
                          <div 
                            key={item.id}
                            onClick={() => {
                              setSelectedCrop(item);
                              setDrillDownRegion(null);
                            }}
                            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${selectedCrop?.id === item.id ? 'border-black bg-gray-50 shadow-xl scale-[1.02]' : 'border-gray-50 hover:border-gray-200'}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-black text-lg">{item.farmerName}</h4>
                              <span className="bg-green-100 text-green-800 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter">{item.qualityScore}% QA</span>
                            </div>
                            <p className="text-sm font-medium text-gray-500 mb-4">{item.cropName}</p>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Listing</span>
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-black text-white">
                                {item.listingType === 'FIXED' ? 'Fixed Price' : 'Open Bid'}
                              </span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Market Price</p>
                                <p className="text-2xl font-black">KES {item.currentBid}<span className="text-xs font-bold text-gray-400 ml-1">/Kg</span></p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedCrop ? (
                    <div className="animate-fadeIn flex flex-col overflow-y-auto pr-1 pb-36">
                       <div className="mb-8">
                         <h2 className="text-4xl font-black tracking-tighter mb-1">{selectedCrop.cropName}</h2>
                         <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{selectedCrop.farmerName} • Verified Origin</p>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-gray-100 p-5 rounded-3xl border border-gray-200">
                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Volume</p>
                             <p className="text-xl font-black">{selectedCrop.quantity} Kg</p>
                          </div>
                          <div className="bg-gray-100 p-5 rounded-3xl border border-gray-200">
                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Quality</p>
                             <p className="text-xl font-black text-green-700">{selectedCrop.qualityScore}% Grade</p>
                          </div>
                       </div>

                       <div className="bg-white border border-gray-200 rounded-3xl p-5 mb-8">
                         <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Request Amount (Kg)</p>
                         <div className="flex items-center space-x-3">
                           <input
                             type="number"
                             min={1}
                             max={selectedCrop.quantity}
                             value={requestQuantity || selectedCrop.quantity}
                             onChange={(e) => setRequestQuantity(e.target.value)}
                             className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl p-4 font-bold focus:ring-2 focus:ring-black outline-none"
                           />
                           <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                             Max {selectedCrop.quantity}
                           </div>
                         </div>
                         <p className="text-[11px] text-gray-500 font-semibold mt-3">
                           Estimated total: KES {selectedCrop.currentBid * Math.max(1, Math.min(selectedCrop.quantity, parseInt(requestQuantity || `${selectedCrop.quantity}`, 10)))}
                         </p>
                       </div>

                       {selectedCrop.listingType === 'BIDDING' && (
                         <div className="bg-white border border-gray-200 rounded-3xl p-5 mb-8">
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Place Bid (KES per Kg)</p>
                           <div className="flex items-center space-x-3">
                             <input
                               type="number"
                               min={selectedCrop.currentBid + 1}
                               value={bidAmount}
                               onChange={(e) => setBidAmount(e.target.value)}
                               placeholder={`Min KES ${selectedCrop.currentBid + 1}`}
                               className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl p-4 font-bold focus:ring-2 focus:ring-black outline-none"
                             />
                             <button
                               onClick={() => handlePlaceBid(selectedCrop)}
                               className="bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full"
                             >
                               Bid
                             </button>
                           </div>
                         </div>
                       )}

                       <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-auto">
                         <div className="lg:hidden bg-white/90 backdrop-blur border-t border-gray-100 px-6 py-4">
                           <button 
                            onClick={() => handleConnectRequest(selectedCrop)}
                            className="w-full bg-black text-white py-4 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-gray-200"
                           >
                             {selectedCrop.listingType === 'FIXED' ? 'Buy At Fixed Price' : 'Start Bid Request'}
                           </button>
                         </div>
                         <div className="hidden lg:block pt-4">
                           <button 
                            onClick={() => handleConnectRequest(selectedCrop)}
                            className="w-full bg-black text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-gray-200"
                           >
                             {selectedCrop.listingType === 'FIXED' ? 'Buy At Fixed Price' : 'Start Bid Request'}
                           </button>
                         </div>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 opacity-40 flex flex-col items-center">
                       <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       </div>
                       <p className="font-black uppercase tracking-widest text-[10px]">Select a sector or harvest pin to begin</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {route === AppRoute.NEGOTIATION && selectedCrop && (
              <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
                <ChatPortal 
                  currentUser={user} 
                  connectedWith={selectedCrop}
                  authToken={authToken || ''}
                  requestedQuantity={
                    requestQuantity
                      ? Math.max(
                          1,
                          Math.min(selectedCrop.quantity, parseInt(requestQuantity, 10))
                        )
                      : undefined
                  }
                  onConfirmQuality={handleStartEscrow}
                />
              </div>
            )}

            {route === AppRoute.ESCROW && selectedCrop && (
              <div className="flex-1 bg-gray-50 p-6 overflow-y-auto flex flex-col items-center justify-center">
                <div className="w-full max-w-md mb-4">
                  <button onClick={() => setRoute(AppRoute.NEGOTIATION)} className="text-xs font-black text-gray-400 hover:text-black flex items-center space-x-2">
                    <span>←</span> <span>RETURN TO PORTAL</span>
                  </button>
                </div>
                <EscrowPortal 
                  item={selectedCrop} 
                  authToken={authToken || ''}
                  escrow={escrow}
                  onRelease={() => {
                    showToast(`M-PESA B2B SUCCESS: Funds released to ${selectedCrop.farmerName}`, 'success');
                    setInventory((prev) =>
                      prev.map((item) =>
                        item.id === selectedCrop.id ? { ...item, status: 'SOLD' } : item
                      )
                    );
                    setRoute(AppRoute.MARKETPLACE);
                    setDrillDownRegion(null);
                    setSelectedCrop(null);
                    setEscrow(null);
                  }} 
                />
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-gray-100 px-4 sm:px-8 md:px-10 py-4 md:py-6 flex flex-wrap justify-between items-center gap-3 text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] z-[60] shrink-0">
         <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <p>&copy; {new Date().getFullYear()} Shumber Inc.</p>
            <a href="/safety" className="hover:text-black transition-colors">Safety</a>
            <a href="/escrow-terms" className="hover:text-black transition-colors">Escrow Terms</a>
         </div>
         <div className="flex flex-wrap items-center gap-3">
            <span className="text-black">Gemini AI Vision Certified</span>
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>Nakuru Hub</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
