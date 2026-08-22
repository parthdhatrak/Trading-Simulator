import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Decorative spotlight */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-screen py-12">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
