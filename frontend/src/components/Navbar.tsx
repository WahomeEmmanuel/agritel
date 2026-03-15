"use client";

import { Sprout, History, Plus } from "lucide-react";

interface NavbarProps {
    onOpenChatHistory: () => void;
    onNewChat: () => void;
}

export default function Navbar({ onOpenChatHistory, onNewChat }: NavbarProps) {
    return (
        <nav className="p-4 md:p-6 border-b border-emerald-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
                {/* Logo */}
                <div 
                    className="flex items-center gap-2 group cursor-pointer" 
                >
                    <div className="relative">
                        <div className="bg-emerald-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-emerald-200">
                        <Sprout className="text-white" size={24} />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-lime-400 w-3 h-3 rounded-full border-2 border-white animate-pulse" />
                    </div>
                    
                    <div className="flex flex-col">
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter text-emerald-900 leading-none">
                        AGRITEL<span className="text-emerald-600">.AI</span>
                        </h1>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-1">
                        Smart Shamba Guide
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <button 
                        onClick={onNewChat}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-emerald-100 text-emerald-700 font-bold text-xs hover:bg-emerald-50 hover:border-emerald-200 transition-all active:scale-95"
                    >
                        <Plus size={18} className="text-emerald-600" />
                        <span className="hidden sm:inline uppercase tracking-wider">New Chat</span>
                    </button>

                    <button 
                        onClick={onOpenChatHistory}
                        className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-900 text-white hover:bg-emerald-800 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                    >
                        <History size={18} className="text-lime-400 group-hover:rotate-[-20deg] transition-transform" />
                        <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
                        My Chats
                        </span>
                    </button>
                </div>
            </div>
        </nav>
    );
}