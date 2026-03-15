"use client";

import { useState } from "react";
import { MapPin, Search, Loader2, Wheat } from "lucide-react";

import Navbar from "@/components/Navbar";
import AdviceCard from "@/components/AdviceCard";
import { FarmingAdvice } from "@/types/advice";
import { Message } from "@/types/message";

const MOCK_ADVICE: FarmingAdvice = {
  advice: "The rainy season is approaching, making it an ideal time to plant maize in your county. Here's a tailored guide to help you get started:",
  steps: [
    "Prepare your land by plowing and harrowing to create a fine seedbed.",
    "Rains are expected to start in the next 2 weeks before March 20th, so aim to plant your maize seeds just before the onset of the rains for optimal germination.",
    "Use certified maize seeds that are resistant to local pests and diseases. Consider varieties like H614 or DK8031 which perform well in your region.",
    "Plant the seeds at a depth of 5-7 cm, spacing them about 25 cm apart in rows that are 75 cm apart to ensure good air circulation and sunlight penetration.",
    "Apply a balanced fertilizer at planting time, such as DAP (Diammonium Phosphate), to provide essential nutrients for early growth.",
    "As the maize grows, monitor for common pests like stem borers and aphids. Use integrated pest management practices, including natural predators and, if necessary, targeted insecticides.",
    "Ensure proper weed control mostly after 3 weeks by manually weeding or using herbicides at the right growth stages to prevent competition for nutrients and water.",
    "With the expected rainfall, ensure your field has good drainage to prevent waterlogging, which can harm maize roots."
  ],
  cost_estimate_per_acre_kes: 18500, 
  warning: "High rainfall expected in the next 14 days. Ensure proper drainage.",
  pro_tip: "Intercrop with beans to improve soil nitrogen levels naturally."
};

export default function Home() {
  const [domain, setDomain] = useState<"farming" | "forestry">("farming");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ county: "", crop: "" });
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleFirstMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.county) {
        setError("Please enter a location/county.");
        return;
    }
    if (domain === "farming" && !formData.crop) {
        setError("Please specify the crop you are growing.");
        return;
    }

    setLoading(true);
    setError(null);

    // Initital user message to be sent to the model
    const messageContent = domain === "farming"
      ? `I am looking for farming advice for growing ${formData.crop} in ${formData.county} county.`
      : `I want to track the forest cover changes and environmental status in ${formData.county} county.`;

    const userRequest: Message = {
      role: "user",
      type: "text",
      content: messageContent
    };

    // Simulate API call
    setTimeout(() => {
      setMessages(prev => [...prev, userRequest]);

      setMessages(prev => [...prev, { role: "model", type: "advice", content: MOCK_ADVICE }]);
      setLoading(false);
    }, 2000);
  };

  const startNewChat = () => {
    setMessages([]);
    setFormData({ county: "", crop: "" });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-emerald-950 flex flex-col">
      <Navbar 
        onNewChat={startNewChat} 
      />

      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full flex flex-col">
        {messages.length === 0 && (
          <section className="text-center space-y-4 animate-in fade-in zoom-in duration-700">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Smart Advisory for <span className="text-emerald-600 underline decoration-lime-400 decoration-4 underline-offset-4">Kenyan Farmers</span>
            </h2>
            <p className="text-emerald-800/70 max-w-2xl mx-auto font-medium">
              Get instant, AI-driven planting guides tailored to local county conditions and current market prices.
            </p>

            <div className="flex justify-center mb-8">
              <div className="bg-emerald-100/50 p-1.5 rounded-[2rem] flex items-center gap-1 border border-emerald-100">
                <button 
                  onClick={() => setDomain("farming")}
                  className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                    domain === "farming" 
                    ? "bg-emerald-600 text-white shadow-lg" 
                    : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Farm Advisor
                </button>
                <button 
                  onClick={() => setDomain("forestry")}
                  className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                    domain === "forestry" 
                    ? "bg-emerald-900 text-white shadow-lg" 
                    : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Forest Tracker
                </button>
              </div>
            </div>

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
              {domain === "farming" && (
                <div className="flex-1 flex items-center px-6 py-3 gap-3 bg-emerald-50/50 rounded-3xl">
                  <Wheat className="text-emerald-600" size={20} />
                  <input 
                    value={formData.crop} 
                    onChange={(e) => setFormData({...formData, crop: e.target.value})}
                    placeholder="What are you growing?" 
                    className="bg-transparent w-full outline-none font-semibold" 
                  />
                </div>
              )}
              <button disabled={loading} className="bg-emerald-600 hover:bg-emerald-900 text-white font-bold py-4 px-10 rounded-[2rem] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                {domain === "farming" ? "Get Advice" : "Track Forest Cover"}
              </button>
            </form>
            {error && <p className="text-red-500 font-bold mt-2 animate-bounce">{error}</p>}
          </section>
        )}

        <div className="space-y-8 flex-1">
          {/* Messages and advice will be rendered here */}
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4`}>
              {message.type === 'advice' ? (
                <AdviceCard advice={message.content as FarmingAdvice} />
              ) : (
              <div className={`max-w-[85%] p-6 rounded-[2rem] font-medium shadow-sm leading-relaxed ${
                  message.role === 'user' ? 'bg-emerald-900 text-white rounded-tr-none' : 'bg-white text-emerald-900 border border-emerald-100 rounded-tl-none'
                }`}>
                {message.content as string}
              </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
