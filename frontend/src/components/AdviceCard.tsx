import { FarmingAdvice } from "@/types/advice";
import { AlertTriangle, Lightbulb, Banknote, Sprout } from "lucide-react";

// Inside AdviceCard.tsx
export default function AdviceCard({ advice }: { advice: FarmingAdvice }) {
  return (
    <div className="bg-white border border-emerald-100 rounded-[2.5rem] p-8 shadow-xl max-w-2xl transition-all hover:border-emerald-200">
        <div className="flex items-center gap-3 mb-6 relative">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-200">
                <Sprout size={20} />
            </div>
            <h3 className="text-2xl font-black text-emerald-950 tracking-tight">
                Guide
            </h3>
        </div>

        {/* General Advice */}
        <p className="text-emerald-800 font-medium mb-6 leading-relaxed">
            {advice.advice}
        </p>

        {/* Farming Steps */}
        <div className="space-y-4 mb-8">
            {advice.steps.map((step, idx) => (
            <div key={idx} className="flex gap-4">
                <span className="flex-none w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                {idx + 1}
                </span>
                <p className="text-emerald-900/80 text-sm leading-relaxed">{step}</p>
            </div>
            ))}
        </div>
        
        {/* Warning */}
        {advice.warning && (
            <div className="flex items-start gap-3 bg-red-50 p-5 rounded-3xl border border-red-100 mb-3 animate-pulse-subtle">
                <AlertTriangle className="text-red-500 flex-none" size={20} />
                <div>
                    <p className="text-sm font-bold text-red-900/80 leading-snug">{advice.warning}</p>
                </div>
            </div>
        )}

        {/* Card Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-emerald-100/50">
            <div className="flex items-center gap-4 bg-lime-50 p-4 rounded-2xl border border-lime-100/50">
                <div className="flex-none p-2.5 bg-white rounded-xl text-lime-600 shadow-sm border border-lime-100">
                    <Banknote size={20} />
                </div>
                <div className="flex flex-col">
                    <p className="text-[9px] font-black text-lime-700 uppercase tracking-wider leading-none mb-1.5">
                        Est. Cost / Acre
                    </p>
                    <p className="text-xl font-black text-emerald-900 leading-none">
                        KES {advice.cost_estimate_per_acre_kes.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100/50">
                <div className="flex-none p-2.5 bg-white rounded-xl text-amber-600 shadow-sm border border-amber-100">
                    <Lightbulb size={20} />
                </div>
                <div className="flex flex-col">
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-wider leading-none mb-1.5">
                        Pro Tip
                    </p>
                    <p className="text-[11px] font-bold text-emerald-950 leading-snug">
                        {advice.pro_tip}
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}