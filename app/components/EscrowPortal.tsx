'use client';
import React, { useState } from 'react';
import { releaseEscrow, verifyEscrow } from '@/services/api';
import { CropInventory, Escrow } from '@/app/types/types';

interface EscrowPortalProps {
  item: CropInventory;
  authToken: string;
  escrow: Escrow | null;
  onRelease: () => void;
}

const EscrowPortal: React.FC<EscrowPortalProps> = ({ item, authToken, escrow, onRelease }) => {
  const [step, setStep] = useState<'INITIAL' | 'SCANNING' | 'CONFIRMED'>('INITIAL');
  const [isWorking, setIsWorking] = useState(false);
  const grossAmount = escrow?.amount ?? item.currentBid * (escrow?.requestedQuantity ?? item.quantity);
  const platformFee = escrow?.platformFee ?? Math.max(Math.round(grossAmount * 0.02), 0);
  const payoutAmount = escrow?.payoutAmount ?? Math.max(grossAmount - platformFee, 0);
  const toast = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('shumber-toast', { detail: { message, tone } }));
  };

  const simulateScan = async () => {
    setStep('SCANNING');
    setIsWorking(true);
    try {
      await verifyEscrow(item.id, authToken);
      setStep('CONFIRMED');
    } catch (error) {
      console.error('Failed to verify escrow', error);
      toast('Verification failed. Please try again.', 'error');
      setStep('INITIAL');
    } finally {
      setIsWorking(false);
    }
  };

  const handleRelease = async () => {
    setIsWorking(true);
    try {
      await releaseEscrow(item.id, authToken);
      onRelease();
    } catch (error) {
      console.error('Failed to release escrow', error);
      toast('Release failed. Please try again.', 'error');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="max-w-md mx-4 sm:mx-auto mt-4 md:mt-8 bg-white uber-shadow rounded-3xl overflow-hidden animate-slideInRight">
      <div className="p-6 md:p-8 text-center space-y-6">
        {step === 'INITIAL' && (
          <>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black">Escrow Held Securely</h2>
              <p className="text-gray-500 mt-2 text-sm italic">Verification required at point of collection.</p>
            </div>
            <button 
              onClick={simulateScan}
              disabled={isWorking}
              className="w-full bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              <span>Scan Farmer's QR</span>
            </button>
          </>
        )}

        {step === 'SCANNING' && (
          <div className="space-y-6 md:space-y-8 py-8 md:py-10">
            <div className="w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 border-4 border-black border-dashed rounded-3xl mx-auto flex items-center justify-center relative overflow-hidden bg-gray-50">
               <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,1)] animate-[bounce_2s_infinite]"></div>
               <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl border border-gray-200 grid grid-cols-3 gap-2 p-3">
                 <div className="bg-black rounded-sm"></div>
                 <div className="bg-black/10 rounded-sm"></div>
                 <div className="bg-black rounded-sm"></div>
                 <div className="bg-black/10 rounded-sm"></div>
                 <div className="bg-black rounded-sm"></div>
                 <div className="bg-black/10 rounded-sm"></div>
                 <div className="bg-black rounded-sm"></div>
                 <div className="bg-black/10 rounded-sm"></div>
                 <div className="bg-black rounded-sm"></div>
               </div>
            </div>
            <p className="text-base md:text-lg font-black tracking-tight animate-pulse">Confirming Gemini QA Standards...</p>
          </div>
        )}

        {step === 'CONFIRMED' && (
          <>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-green-700">Produce Verified</h2>
              <p className="text-gray-500 mt-2 text-sm">
                Quality matches Gemini score of {item.qualityScore}%. Authorized to release KES {payoutAmount}.
              </p>
              <div className="mt-3 text-[11px] text-gray-400 font-semibold uppercase tracking-widest space-y-1">
                <p>Platform fee (2%): KES {platformFee}</p>
                <p>Gross amount: KES {grossAmount}</p>
              </div>
              {escrow?.requestedQuantity ? (
                <p className="text-xs text-gray-400 mt-2 font-semibold uppercase tracking-widest">
                  Quantity locked: {escrow.requestedQuantity} Kg
                </p>
              ) : null}
            </div>
            <button 
              onClick={handleRelease}
              disabled={isWorking}
              className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-100 hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Confirm M-PESA B2B Transfer
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EscrowPortal;
