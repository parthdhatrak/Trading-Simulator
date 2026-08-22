import React from 'react';

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700 text-slate-100 overflow-hidden selection:bg-emerald-500/30 selection:text-white">
      {/* Decorative backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] bg-gradient-to-b from-emerald-500/10 to-transparent rounded-full blur-[200px]" />
      </div>
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}
