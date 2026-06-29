import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, onPageChange }) {
  if (pages <= 1) return null;
  const range = Array.from({ length: Math.min(5, pages) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    return start + i;
  }).filter(p => p >= 1 && p <= pages);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/5">
      <p className="text-xs text-slate-500">{total} total results</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={16} />
        </button>
        {range.map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-brand-600 text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
