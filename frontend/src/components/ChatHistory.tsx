"use client";

import React, { useEffect, useState } from "react";
import { X, MessageSquare, Calendar, Trash2, ChevronRight } from "lucide-react";

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
}

export default function ChatHistoryDrawer({ isOpen, onClose, onSelectChat }: ChatHistoryProps) {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem("agritel_history");
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        }
    }, [isOpen]);

    const deleteChat = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = history.filter((chat) => chat.id !== id);
        setHistory(updated);
        localStorage.setItem("agritel_history", JSON.stringify(updated));
    };

    return (
    <>  
        <div className={`fixed top-0 right-0 h-full w-full max-w-xs md:max-w-sm bg-white z-[70] shadow-[0_0_60px_-15px_rgba(2,44,34,0.3)] transform transition-transform duration-500 ease-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
        }`}>
            <div className="flex flex-col h-full bg-background/50">
                <div className="p-6 pt-10 border-b border-emerald-100 bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-black text-emerald-950 tracking-tight leading-tight">
                                My Chats
                            </h3>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-2 px-1 py-0.5 bg-emerald-50 inline-block rounded-md">
                                View your past chats
                            </p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-3 hover:bg-emerald-50 rounded-2xl text-emerald-600 transition-all hover:rotate-90"
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>
            

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {history.length > 0 ? (
                    history.map((chat) => (
                        <div 
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className="group relative w-full text-left p-6 rounded-3xl border border-emerald-100/70 bg-white hover:bg-emerald-50 hover:border-emerald-600 hover:shadow-emerald-950/5 hover:shadow-2xl transition-all cursor-pointer overflow-hidden backdrop-blur-sm active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-4">
                                <div className="relative flex-none mt-1">
                                    <div className="p-3 bg-emerald-100/50 rounded-2xl text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div className="absolute -inset-1.5 border border-emerald-100 rounded-[1.25rem] group-hover:border-emerald-200" />
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="block font-black text-emerald-950 text-base leading-tight truncate">
                                        {chat.title}
                                        </span>
                                        
                                        <button 
                                        onClick={(e) => deleteChat(e, chat.id)}
                                        className="flex-none p-1.5 text-emerald-300 hover:text-red-600 transition-colors bg-white rounded-lg group-hover:bg-red-50"
                                        >
                                        <Trash2 size={14} />
                                        </button>
                                    </div>
                                    
                                    <p className="text-xs font-medium text-emerald-800/70 leading-relaxed truncate max-w-[180px]">
                                        {(() => {
                                            const last = chat.messages[chat.messages.length - 1];
                                            if (!last) return "No messages";
                                            
                                            return last.type === "llm_response" ? last.content.summary : last.content;
                                        })()}
                                    </p>

                                    <div className="flex items-center gap-2 pt-1.5 text-[10px] text-emerald-500 font-bold uppercase">
                                        <Calendar size={11} className="text-lime-500" /> {chat.date}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 bg-emerald-100 rounded-lg text-emerald-700">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    ))
                    ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-5">
                        <div className="p-6 bg-emerald-100/50 border border-emerald-100 rounded-3xl text-emerald-300">
                            <MessageSquare size={36} strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-bold text-emerald-800/40 max-w-[200px] leading-relaxed">
                            No saved chats yet.
                        </p>
                    </div>
                    )}
                </div>

                <div className="p-6 py-5 bg-white border-t border-emerald-100">
                    <div className="p-4 bg-emerald-950 rounded-2xl flex items-center justify-between text-white">
                    <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">
                        Agritel.AI
                    </p>
                    <span className="text-[10px] font-bold text-lime-400">{ history.length } Previous Chats</span>
                    </div>
                </div>
            </div>
        </div>
    </>
    );
}