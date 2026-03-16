"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Search, Loader2, Wheat, Send } from "lucide-react";

import Navbar from "@/components/Navbar";
import ResponseCard from "@/components/ResponseCard";
import ChatHistory from "@/components/ChatHistory";
import LoaderSkeleton from "@/components/LoaderSkeleton";
import { Response } from "@/types/response";
import { Message } from "@/types/message";
import { getFarmAdvice } from './services/api';

export default function Home() {
  const [domain, setDomain] = useState<"farming" | "forestry">("farming");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ county: "", crop: "" });
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      ? `I am looking for farming advice for growing ${formData.crop} in ${formData.county}.`
      : `I want to track the forest cover changes and environmental status in ${formData.county}.`;

    try {
      const llmResponse = await getFarmAdvice({
        last_message: messageContent,
        context_history: [], // First message has no history
        county: formData.county,
        crop: formData.crop || "General Forestry",
      });

      setMessages([
        { role: "user", type: "text", content: messageContent },
        { role: "model", type: "llm_response", content: llmResponse }
      ]);
    } catch (err: any) {
      setError(err.message || "Agricultural advisor unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpMessage.trim()) return;
    setLoading(true);

    try {
      const llmResponse = await getFarmAdvice({
        last_message: followUpMessage,
        context_history: messages, // Pass the existing chat history!
        county: formData.county,
        crop: formData.crop || "General Forestry",
      });
      setMessages(prev => [...prev, { role: "user", type: "text", content: followUpMessage }]);
      setFollowUpMessage("");

      setMessages(prev => [...prev, { role: "model", type: "llm_response", content: llmResponse }]);
    } catch (err: any) {
      setError("Connection lost. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryChat = (chatId: string) => {
    const history = JSON.parse(localStorage.getItem("agritel_history") || "[]");
    const selected = history.find((h: any) => h.id === chatId);
    
    if (selected) {
      setMessages(selected.messages);
      // CRITICAL: Restore the context for follow-up questions
      const [titleCounty, titleCrop] = selected.title.split(' ');
      setFormData({ county: titleCounty, crop: titleCrop });
      
      sessionStorage.setItem("current_chat_id", selected.id);
      setChatHistoryOpen(false);
    }
  };

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const history = JSON.parse(localStorage.getItem("agritel_history") || "[]");
      let currentId = sessionStorage.getItem("current_chat_id");

      if (!currentId) {
        // NEW CHAT: Create ID and initial entry
        currentId = Date.now().toString();
        sessionStorage.setItem("current_chat_id", currentId);
        
        const newEntry = {
          id: currentId,
          title: `${formData.county || 'Kigumo'} ${formData.crop || 'Maize'}`,
          date: new Date().toLocaleString(),
          messages: messages
        };
        localStorage.setItem("agritel_history", JSON.stringify([newEntry, ...history]));
      } else {
        // UPDATE EXISTING CHAT: Find the chat in history and update messages
        const updatedHistory = history.map((h: any) => 
          h.id === currentId ? { ...h, messages } : h
        );
        localStorage.setItem("agritel_history", JSON.stringify(updatedHistory));
      }
    }
  }, [messages]);

  const startNewChat = () => {
    setMessages([]);
    setFormData({ county: "", crop: "" });
    setError(null);
    setChatHistoryOpen(false);
    sessionStorage.removeItem("current_chat_id");
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-emerald-950 flex flex-col">
      <Navbar 
        onOpenChatHistory={() => setChatHistoryOpen(true)} 
        onNewChat={startNewChat} 
      />

      <ChatHistory 
        isOpen={chatHistoryOpen} 
        onClose={() => setChatHistoryOpen(false)} 
        onSelectChat={loadHistoryChat}
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
              {message.type === 'llm_response' ? (
                <ResponseCard resp={message.content as Response} />
              ) : (
              <div className={`max-w-[85%] p-6 rounded-[2rem] font-medium shadow-sm leading-relaxed ${
                  message.role === 'user' ? 'bg-emerald-900 text-white rounded-tr-none' : 'bg-white text-emerald-900 border border-emerald-100 rounded-tl-none'
                }`}>
                {message.content as string}
              </div>
              )}
            </div>
          ))}

          {loading && <div className="w-full"><LoaderSkeleton /></div>}
          <div ref={scrollRef} />
        </div>
      </main>

      {/* Follow up input - sticky at the bottom */}
      {messages.length > 0 && (
        <div className="sticky bottom-0 p-6 bg-gradient-to-t from-[#F8FAF9] via-[#F8FAF9] pt-10">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleFollowUpSubmit} className="flex gap-2 bg-white p-2 rounded-[2rem] shadow-2xl border border-emerald-100 focus-within:ring-4 focus-within:ring-emerald-600/10">
              <input 
                value={followUpMessage} 
                onChange={(e) => setFollowUpMessage(e.target.value)}
                placeholder="Ask a follow-up question..." 
                className="flex-1 px-6 outline-none font-medium bg-transparent"
              />
              <button disabled={loading} className="bg-emerald-600 p-4 rounded-full text-white hover:bg-emerald-900 transition-all shadow-lg active:scale-90">
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
