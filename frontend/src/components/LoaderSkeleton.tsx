export default function LoaderSkeleton() {
  return (
    <div className="w-full bg-white rounded-[2.5rem] border border-emerald-50 overflow-hidden animate-pulse">
      <div className="bg-emerald-50 h-32 p-8 space-y-3">
        <div className="h-2 w-20 bg-emerald-200 rounded-full" />
        <div className="h-6 w-3/4 bg-emerald-200/50 rounded-lg" />
      </div>

      <div className="p-8 space-y-6">
        <div className="h-20 w-full bg-emerald-50/40 rounded-2xl" />
        <div className="h-20 w-full bg-emerald-50/40 rounded-2xl" />
        
        <div className="flex gap-4">
          <div className="h-24 flex-1 bg-amber-50/50 rounded-2xl" />
          <div className="h-24 flex-1 bg-lime-50/50 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}