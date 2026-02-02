'use client';
import React, { useState } from 'react';
import HeatMap from '@/app/components/HeatMap';
import { CropInventory, User } from '@/app/types/types';

interface BuyerDashboardProps {
  user: User;
  inventory: CropInventory[];
  onPlaceBid: (cropId: string, amount: number) => void;
}

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user, inventory, onPlaceBid }) => {
  const [selectedCrop, setSelectedCrop] = useState<CropInventory | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const toast = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('shumber-toast', { detail: { message, tone } }));
  };

  const handlePlaceBid = () => {
    if (!selectedCrop || !bidAmount) return;
    const amount = parseInt(bidAmount);
    if (amount <= selectedCrop.currentBid) {
      toast("Bid must be higher than the current price!", 'error');
      return;
    }
    onPlaceBid(selectedCrop.id, amount);
    setBidAmount('');
    // Mock successful bid update for UI feedback
    setSelectedCrop({
      ...selectedCrop,
      currentBid: amount,
      highestBidderId: user.id
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 p-4 md:p-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-4 rounded-xl uber-shadow border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Nakuru Surplus Map</h2>
            <div className="flex space-x-4 text-xs font-medium">
              <span className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div> Surplus</span>
              <span className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div> High Demand</span>
            </div>
          </div>
          {/* Fix: Added missing onRegionSelect prop required by HeatMapProps */}
          <HeatMap 
            inventory={inventory} 
            onSelectCrop={setSelectedCrop} 
            onRegionSelect={(region) => console.log('Region selected:', region)} 
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {inventory.slice(0, 4).map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedCrop(item)}
              className="bg-white p-4 rounded-xl uber-shadow border border-gray-100 flex space-x-4 cursor-pointer hover:border-blue-500 transition-all"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.cropName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300 font-bold">
                    {item.cropName[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{item.cropName}</h3>
                <p className="text-xs text-gray-500">{item.location.name}</p>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-lg font-black text-blue-600">KES {item.currentBid}</span>
                  <span className="text-[10px] text-gray-400">/ Kg</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl uber-shadow border border-gray-100 h-fit sticky top-24">
          {selectedCrop ? (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedCrop.cropName}</h2>
                  <p className="text-sm text-gray-500">{selectedCrop.farmerName} • {selectedCrop.location.name}</p>
                </div>
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                  {selectedCrop.qualityScore}% Fresh
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 text-sm">Quantity Available</span>
                  <span className="font-bold text-gray-800">{selectedCrop.quantity} Kg</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 text-sm">Start Price</span>
                  <span className="font-medium text-gray-600">KES {selectedCrop.basePrice}/Kg</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-blue-50 rounded-lg px-3">
                  <span className="text-blue-700 font-bold text-sm">Current Bid</span>
                  <span className="text-2xl font-black text-blue-700">KES {selectedCrop.currentBid}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">Place Your Bid (KES / Kg)</label>
                <div className="flex space-x-2">
                  <input 
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Min KES ${selectedCrop.currentBid + 1}`}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button 
                    onClick={handlePlaceBid}
                    className="bg-black text-white font-bold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Bid
                  </button>
                </div>
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">Fast-track secure payment via M-PESA available</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400 space-y-4">
              <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Select a harvest on the map to place a bid and secure fresh produce from Nakuru farmers.</p>
            </div>
          )}
        </div>

        <div className="bg-amber-900 text-white p-6 rounded-xl uber-shadow flex flex-col items-center justify-center text-center">
          <h3 className="text-xl font-bold mb-2">Reduce Food Waste</h3>
          <p className="text-sm text-amber-100 opacity-80">By bidding on these surplus crops, you help farmers in Molo and Bahati minimize post-harvest loss.</p>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
