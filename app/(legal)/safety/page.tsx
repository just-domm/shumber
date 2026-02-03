'use client';
import React from 'react';

const SafetyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-8 md:px-12 py-10">
      <div className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 md:p-10 uber-shadow">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">Safety</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Safety & Pickup Guidelines</h1>
          <p className="text-sm text-gray-500 mt-2">
            Simple rules to keep every pickup secure, fair, and smooth for buyers and farmers.
          </p>
        </div>

        <div className="space-y-6 text-sm text-gray-700">
          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">1. Meet at Verified Locations</h2>
            <p>
              Prefer official hub locations or public, well‑lit areas. Avoid late‑night pickups when possible.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">2. Inspect Before Release</h2>
            <p>
              Buyers should inspect quality and quantity before confirming escrow release. Farmers should
              ensure produce matches the listing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">3. Keep Communication in App</h2>
            <p>
              Use in‑app chat for pickup coordination and record‑keeping. This helps resolve disputes faster.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">4. Report Issues Quickly</h2>
            <p>
              If something feels off, pause the pickup and report immediately. Escrow funds remain protected.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">5. Respect & Professionalism</h2>
            <p>
              Treat counterparties with respect. Clear communication and fair expectations keep the marketplace healthy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SafetyPage;
