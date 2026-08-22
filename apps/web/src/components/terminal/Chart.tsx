"use client";

import React from "react";

export default function Chart() {
  return (
    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-950/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
      <div className="relative flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-emerald-400 animate-spin flex items-center justify-center">
          <span className="text-xs text-emerald-400">⚡</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Terminal Chart</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
            Live feed powered by TwelveData. Connecting to gateway...
          </p>
        </div>
      </div>
    </div>
  );
}
