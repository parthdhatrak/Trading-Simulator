"use client";

import React from "react";
import { ArrowRight, Code, Database, Layers, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Neon Spotlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-6 text-center">
        
        {/* Tech Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-mono font-medium text-slate-300 uppercase tracking-wider">
            Built for Barclays-Style Quant & Backend Interviews
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-title font-extrabold tracking-tight text-white mb-6 max-w-4xl mx-auto leading-[1.15]">
          A Production-Grade{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Real-Time Trading
          </span>{" "}
          Engine
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Simulate a high-frequency stock exchange in your browser. Engineered with 
          <span className="text-slate-200"> Binary Heap-based Priority Queues</span>, 
          <span className="text-slate-200"> FIFO Price-Time Priority Matching</span>, and 
          <span className="text-slate-200"> real-time WebSocket pushing</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#live-demo"
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-slate-900 bg-white rounded-full hover:bg-slate-100 hover:shadow-lg hover:shadow-blue-500/10 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            Launch Trading Console
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-slate-300 glass-panel rounded-full hover:text-slate-100 hover:border-slate-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Code className="w-4 h-4" />
            Explore Architecture
          </a>
        </div>

        {/* Key Features Quick Metric Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            {
              icon: <Layers className="w-5 h-5 text-blue-400" />,
              title: "O(log n) Heap Queues",
              desc: "Fast Bid/Ask queues via custom Min-Max heaps",
            },
            {
              icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
              title: "Price-Time Priority",
              desc: "Fair FIFO queue matching exactly like NYSE & NSE",
            },
            {
              icon: <Database className="w-5 h-5 text-indigo-400" />,
              title: "Upstash Redis Log",
              desc: "Persistent event sourcing & sorted sets order books",
            },
            {
              icon: <ArrowRight className="w-5 h-5 text-amber-400" />,
              title: "Full Telemetry",
              desc: "Unrealized/Realized P&L, averages, and trade tape",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="glass-panel p-5 rounded-2xl text-left border border-white/5 hover:border-white/10 transition-all duration-300"
            >
              <div className="p-2 w-fit rounded-xl bg-white/5 border border-white/10 mb-4">
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-200 font-title mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
