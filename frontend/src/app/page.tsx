"use client";

import { useState } from "react";
import { MapPin, Search, Loader2, Wheat } from "lucide-react";

import Navbar from "@/components/Navbar";
import { Message } from "@/types/message";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ county: "", crop: "" });
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleFirstMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.county || !formData.crop) {
        setError("Please fill in both fields.");
        return;
    }

    setLoading(true);
    // Initital user message to be sent to the model
    const userRequest: Message = {
      role: "user",
      type: "text",
      content: `I am looking for farming advice for growing ${formData.crop} in ${formData.county} county.`
    };
    setMessages(prev => [...prev, userRequest]);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-emerald-950 flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full flex flex-col">
        {messages.length === 0 && (
          <section className="text-center space-y-4 animate-in fade-in zoom-in duration-700">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Smart Advisory for <span className="text-emerald-600 underline decoration-lime-400 decoration-4 underline-offset-4">Kenyan Farmers</span>
            </h2>
            <p className="text-emerald-800/70 max-w-2xl mx-auto font-medium">
              Get instant, AI-driven planting guides tailored to local county conditions and current market prices.
            </p>

            <form onSubmit={handleFirstMessageSubmit} className="mt-10 bg-white p-3 rounded-[2.5rem] shadow-xl border border-emerald-100/50 flex flex-col md:flex-row gap-2 max-w-3xl mx-auto focus-within:ring-4 focus-within:ring-emerald-600/10 transition-all">
              <div className="flex-1 flex items-center px-6 py-3 gap-3 bg-emerald-50/50 rounded-3xl">
                <MapPin className="text-emerald-600" size={20} />
                <input 
                  value={formData.county} 
                  onChange={(e) => setFormData({...formData, county: e.target.value})}
                  placeholder="Which County, Location?" 
                  className="bg-transparent w-full outline-none font-semibold" 
                />
              </div>
              <div className="flex-1 flex items-center px-6 py-3 gap-3 bg-emerald-50/50 rounded-3xl">
                <Wheat className="text-emerald-600" size={20} />
                <input 
                  value={formData.crop} 
                  onChange={(e) => setFormData({...formData, crop: e.target.value})}
                  placeholder="What are you growing?" 
                  className="bg-transparent w-full outline-none font-semibold" 
                />
              </div>
              <button disabled={loading} className="bg-emerald-600 hover:bg-emerald-900 text-white font-bold py-4 px-10 rounded-[2rem] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />} Get Advice
              </button>
            </form>
            {error && <p className="text-red-500 font-bold mt-2 animate-bounce">{error}</p>}
          </section>
        )}

        <div className="space-y-8 flex-1">
          {/* Messages and advice will be rendered here */}
          {messages.map((message, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-md">
              <p>{message.content as string}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
