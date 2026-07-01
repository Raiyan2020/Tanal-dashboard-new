'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type PaginatedItems, type Admin } from '@/lib/api';

interface PaginationProps {
  pagination: PaginatedItems<Admin>['pagination'];
  onPage: (p: number) => void;
}

export function Pagination({
  pagination,
  onPage,
}: PaginationProps) {
  const { last_page, current_page } = pagination;
  if (last_page <= 1) return null;

  const pages = Array.from({ length: last_page }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
      <button
        onClick={() => onPage(current_page - 1)}
        disabled={current_page === 1}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={cn(
            'w-9 h-9 rounded-xl text-sm font-medium transition-all cursor-pointer',
            p === current_page
              ? 'bg-primary text-white shadow-md'
              : 'bg-white/50 border border-secondary/10 hover:bg-white/80 text-secondary',
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(current_page + 1)}
        disabled={current_page === last_page}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
