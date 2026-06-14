import React from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import LiveDemo from "@/components/landing/LiveDemo";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Decorative top-right spotlight */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      {/* Navbar Header */}
      <Navbar />

      {/* Main Contents */}
      <main className="relative z-10">
        <Hero />
        <LiveDemo />
        <Features />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
