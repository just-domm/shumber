import React from 'react';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-y-auto">
      <nav className="bg-black text-white px-4 md:px-8 py-4 md:py-5 flex items-center justify-between shadow-2xl">
        <a href="/" className="flex items-center space-x-3">
          <div className="bg-white text-black px-2.5 py-1 rounded-md font-black text-2xl italic tracking-tighter shadow-lg">
            S
          </div>
          <div>
            <span className="text-2xl font-black tracking-tighter">Shumber</span>
            <p className="text-[9px] text-green-500 font-black uppercase tracking-[0.2em] leading-none">
              Uber for harvests
            </p>
          </div>
        </a>
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
          <a href="/safety" className="hover:text-green-500 transition-colors">Safety</a>
          <a href="/escrow-terms" className="hover:text-green-500 transition-colors">Escrow Terms</a>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-gray-100 px-4 sm:px-8 md:px-10 py-4 md:py-6 flex flex-wrap justify-between items-center gap-3 text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
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
}
