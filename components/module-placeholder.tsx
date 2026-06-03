'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export function ModulePlaceholder({ moduleName }: { moduleName: string }) {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center shadow-[0_0_40px_rgba(133,115,99,0.15)] ring-1 ring-primary/20">
        <span className="text-4xl text-primary font-serif italic relative top-1">T</span>
      </div>
      <h2 className="text-2xl font-semibold text-secondary mb-2 font-serif capitalize">
        {moduleName.replace(/([A-Z])/g, ' $1').trim()} Module
      </h2>
      <p className="text-secondary/60 max-w-md">
        This module is currently under construction. It will feature premium tools and interfaces for managing the Tanal platform.
      </p>
      <button 
        onClick={() => router.push('/')} 
        className="mt-8 px-6 py-2.5 bg-white border border-secondary/10 hover:border-primary/30 rounded-xl text-primary font-medium hover:bg-primary/5 transition-all shadow-sm flex items-center gap-2 mx-auto cursor-pointer"
      >
        Return to Dashboard
      </button>
    </div>
  );
}
