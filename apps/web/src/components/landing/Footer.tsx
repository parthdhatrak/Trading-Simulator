"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950/20 py-12 mt-16 font-sans">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left column */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-title font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              ApeX Exchange
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
            A real-time financial simulation engine built to showcase core software design, algorithms, and micro-latency architecture.
          </p>
        </div>

        {/* Right column */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-mono text-slate-400">
          <a href="#live-demo" className="hover:text-white transition-colors">Sandbox</a>
          <a href="#features" className="hover:text-white transition-colors">Architecture</a>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500">Stack: Next.js 14 • Redis • TypeScript</span>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-white/5 text-center text-[10px] text-slate-600 font-mono">
        © {new Date().getFullYear()} ApeX Trading. Designed for engineering evaluations. No real currency is traded here.
      </div>
    </footer>
  );
}
