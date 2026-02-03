'use client';
import React from 'react';

const EscrowTermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-8 md:px-12 py-10">
      <div className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 md:p-10 uber-shadow">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">Escrow</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Escrow Terms</h1>
          <p className="text-sm text-gray-500 mt-2">
            These terms explain how Shumber escrow protects buyers and farmers during pickup and payment.
          </p>
        </div>

        <div className="space-y-6 text-sm text-gray-700">
          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">1. How Escrow Works</h2>
            <p>
              Buyers place funds in escrow when they initiate a request. Funds are held until pickup
              verification is completed at the hub or agreed collection point.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">2. Verification & Release</h2>
            <p>
              Verification occurs at pickup. Once the buyer confirms quality/quantity, escrow is released
              to the farmer. If verification fails, the transaction is paused for resolution.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">3. Disputes</h2>
            <p>
              If there is a dispute, funds remain in escrow while Shumber reviews evidence (photos,
              timestamps, pickup confirmations) and works with both parties to resolve.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">4. Quality Guidance</h2>
            <p>
              AI quality scores are guidance only. Final acceptance is determined at pickup. Buyers should
              inspect produce in person before approving release.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-black">5. Refunds</h2>
            <p>
              If a transaction is cancelled before release, escrow funds are returned to the buyer. Processing
              times may vary by payment provider.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EscrowTermsPage;
