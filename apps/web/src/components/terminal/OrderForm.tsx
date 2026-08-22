"use client";

import React from "react";

export default function OrderForm() {
  return (
    <div className="w-full bg-slate-950/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
      <div className="relative flex flex-col space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">Submit Order</h3>
        <p className="text-xs text-slate-500">
          Connecting to gateway to load trading options.
        </p>
        <div className="h-8 bg-white/5 rounded animate-pulse" />
        <div className="h-8 bg-white/5 rounded animate-pulse" />
        <button disabled className="w-full py-2.5 rounded-lg text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed">
          Initializing Engine...
        </button>
      </div>
    </div>
  );
}
