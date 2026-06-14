"use client";

import React from "react";
import { Layers, RefreshCw, Radio, HardDrive, ShieldCheck, Zap } from "lucide-react";

export default function Features() {
  const items = [
    {
      icon: <Layers className="w-6 h-6 text-blue-400" />,
      title: "Binary Heap Book",
      desc: "Bid and Ask queues are represented as binary heaps. Max-heap for bids offers O(1) retrieval of the best bid; Min-heap for asks offers O(1) of the best ask. Sub-microsecond insertion complexity O(log n).",
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-emerald-400" />,
      title: "Price-Time Priority matching",
      desc: "Implements strict Price-Time priority (FIFO). Best price fills first. For identical price levels, execution order is decided purely by submission timestamp to prevent front-running.",
    },
    {
      icon: <Radio className="w-6 h-6 text-indigo-400" />,
      title: "WebSocket Streaming",
      desc: "Leverages a bidirectional socket connection to broadcast market updates in real time. Orderbook snapshots, transaction trades, and client portfolios update instantly without polling overhead.",
    },
    {
      icon: <HardDrive className="w-6 h-6 text-purple-400" />,
      title: "Event-Sourced Persistence",
      desc: "All trade executions are logged as an append-only transaction ledger on Upstash Redis. Book state can be fully recovered from scratch by replaying the trade log.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-pink-400" />,
      title: "Mark-to-Market Portfolio",
      desc: "Computes portfolio metrics on-the-fly. Evaluates average cost basis, realized P&L from closed positions, and unrealized mark-to-market returns dynamically.",
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Scale-Out Ready",
      desc: "Engineered with a single-threaded message queue pipeline per ticker to eliminate race conditions without complex concurrency locking patterns, mimicking industrial LMAX Disruptor frameworks.",
    },
  ];

  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-24">
      
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl sm:text-4xl font-title font-extrabold text-white mb-4">
          Engineered for Low Latency and System Integrity
        </h2>
        <p className="text-slate-400 text-sm sm:text-base">
          An exploration of high-performance backend design concepts mapped into a modern React and Next.js full-stack system.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((feat, index) => (
          <div
            key={index}
            className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/5 flex flex-col justify-between"
          >
            <div>
              {/* Icon Container */}
              <div className="p-3 w-fit rounded-2xl bg-white/5 border border-white/10 mb-6">
                {feat.icon}
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-title font-bold text-white mb-2">
                {feat.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-slate-400 leading-relaxed font-sans">
                {feat.desc}
              </p>
            </div>
            
            {/* Telemetry line decorator */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-6"></div>
          </div>
        ))}
      </div>

    </section>
  );
}
