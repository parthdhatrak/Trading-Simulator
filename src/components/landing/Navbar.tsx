"use client";

import React, { useEffect, useState } from "react";
import { Activity, Zap, Cpu } from "lucide-react";

export default function Navbar() {
  const [latency, setLatency] = useState(1.15);
  const [tps, setTps] = useState(94210);

  // Dynamic simulation for subtle realism
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Number((1.05 + Math.random() * 0.2).toFixed(2)));
      setTps(Math.floor(94000 + Math.random() * 800));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-6 py-3.5 rounded-full shadow-lg border border-white/5">
        
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-title font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            ApeX
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse glow-text-green"></span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pl-1 border-l border-slate-800">
            Simulator
          </span>
        </div>

        {/* Engine Performance Telemetry (Hidden on Mobile) */}
        <div className="hidden md:flex items-center space-x-6 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2 border-r border-slate-800 pr-4">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Matching Engine:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              ONLINE <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
            </span>
          </div>

          <div className="flex items-center space-x-2 border-r border-slate-800 pr-4">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Latency:</span>
            <span className="text-slate-200 font-semibold">{latency}ms</span>
          </div>

          <div className="flex items-center space-x-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Throughput:</span>
            <span className="text-slate-200 font-semibold">{tps.toLocaleString()} TPS</span>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex items-center space-x-4">
          <a
            href="#live-demo"
            className="hidden sm:inline-block text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors duration-200"
          >
            Live Demo
          </a>
          <button className="relative px-5 py-2 text-xs font-bold text-slate-100 rounded-full bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all duration-300 group overflow-hidden shadow-md">
            <span className="relative z-10">Launch terminal</span>
            <span className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </button>
        </div>

      </div>
    </nav>
  );
}
