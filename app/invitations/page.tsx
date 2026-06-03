'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Edit2, Trash2, Eye, Calendar, Users, Send, Clock, Ticket, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';
import { InvitationDetails } from './InvitationDetails';
import { InvitationEditForm } from './InvitationEditForm';

export type InvitationStatus = 'sent' | 'unsent' | 'past';

export interface Invitation {
  id: string;
  eventId: string;
  eventName: string;
  deadlineDate: string;
  guestsNumber: number;
  status: InvitationStatus;
}

const MOCK_INVITATIONS: Invitation[] = [
  { id: 'INV-1001', eventId: '1001', eventName: 'Al Rajhi Ceremony', deadlineDate: 'Nov 15, 2026', guestsNumber: 420, status: 'sent' },
  { id: 'INV-1002', eventId: '1002', eventName: 'Al Olayan Reception', deadlineDate: 'Nov 25, 2026', guestsNumber: 1200, status: 'unsent' },
  { id: 'INV-1003', eventId: '1003', eventName: 'Ahmed Wedding', deadlineDate: 'Dec 10, 2026', guestsNumber: 300, status: 'unsent' },
  { id: 'INV-1004', eventId: '1004', eventName: 'Khalid Engagement', deadlineDate: 'Nov 20, 2024', guestsNumber: 150, status: 'past' },
  { id: 'INV-1005', eventId: '1005', eventName: 'Tariq & Sara Wedding', deadlineDate: 'Jan 14, 2027', guestsNumber: 500, status: 'sent' },
];

export default function InvitationsPage() {
  const { t, dir } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [primaryFilter, setPrimaryFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [secondaryFilter, setSecondaryFilter] = useState<'all' | 'sent' | 'unsent'>('all');
  const [invitations, setInvitations] = useState<Invitation[]>(MOCK_INVITATIONS);
  const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [viewingInvitation, setViewingInvitation] = useState<Invitation | null>(null);

  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch = inv.eventName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    
    if (primaryFilter === 'all') {
      matchesStatus = true;
    } else if (primaryFilter === 'past') {
      matchesStatus = inv.status === 'past';
    } else if (primaryFilter === 'upcoming') {
      const isUpcoming = inv.status === 'sent' || inv.status === 'unsent';
      if (!isUpcoming) {
        matchesStatus = false;
      } else if (secondaryFilter === 'all') {
        matchesStatus = true;
      } else {
        matchesStatus = inv.status === secondaryFilter;
      }
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusDisplay = (status: InvitationStatus) => {
    switch (status) {
      case 'sent':
        return { 
          icon: Send, 
          label: t('sent' as any), 
          colors: 'text-emerald-600 bg-emerald-50 ring-emerald-500/20' 
        };
      case 'unsent':
        return { 
          icon: Clock, 
          label: t('unsent' as any), 
          colors: 'text-amber-600 bg-amber-50 ring-amber-500/20' 
        };
      case 'past':
        return { 
          icon: Calendar, 
          label: t('past' as any), 
          colors: 'text-gray-600 bg-gray-50 ring-gray-500/20' 
        };
    }
  };

  const handleDelete = () => {
    if (invitationToDelete) {
      setInvitations(invitations.filter((inv) => inv.id !== invitationToDelete));
      setInvitationToDelete(null);
    }
  };

  if (isCreateModalOpen || editingInvitation) {
    return (
      <InvitationEditForm 
        invitation={editingInvitation}
        onBack={() => {
          setIsCreateModalOpen(false);
          setEditingInvitation(null);
        }}
        onSave={(savedInvitation) => {
          if (editingInvitation) {
            setInvitations(invitations.map(inv => inv.id === savedInvitation.id ? savedInvitation : inv));
            if (viewingInvitation?.id === savedInvitation.id) {
               setViewingInvitation(savedInvitation);
            }
          } else {
            setInvitations([savedInvitation, ...invitations]);
          }
          setIsCreateModalOpen(false);
          setEditingInvitation(null);
        }}
      />
    );
  }

  if (viewingInvitation) {
    return (
      <InvitationDetails 
        invitation={viewingInvitation} 
        onBack={() => setViewingInvitation(null)} 
        onNavigateToEventGuests={(eventId) => {}} 
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={cn("text-2xl font-semibold text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('invitations' as any)}
          </h2>
          <p className="text-secondary/60 mt-1">{t('manageInvitations' as any)}</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">{t('createInvitation' as any) || t('addInvitation' as any)}</span>
        </button>
      </div>

      <div className="glass-panel p-4 sm:p-6 rounded-3xl">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder={t('searchInvitations' as any)}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-12 pr-4 rtl:pr-12 rtl:pl-4 transition-all outline-none text-secondary"
          />
        </div>

        <div className="flex w-full overflow-x-auto scrollbar-hide gap-2 mb-4 pb-2">
          {([
            { id: 'all', label: t('all' as any) },
            { id: 'upcoming', label: t('upcoming' as any) },
            { id: 'past', label: t('past' as any) },
          ] as const).map((option) => (
            <button
              key={option.id}
              onClick={() => { setPrimaryFilter(option.id); setSecondaryFilter('all'); }}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ring-1 cursor-pointer",
                primaryFilter === option.id
                  ? "bg-primary text-white ring-primary shadow-primary/20"
                  : "bg-white text-secondary/70 ring-black/5 hover:bg-secondary/5 hover:text-secondary"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {primaryFilter === 'upcoming' && (
          <div className="flex w-full overflow-x-auto scrollbar-hide gap-2 mb-6 pb-2">
            {([
              { id: 'all', label: t('all' as any) },
              { id: 'sent', label: t('sent' as any) },
              { id: 'unsent', label: t('unsent' as any) },
            ] as const).map((option) => (
              <button
                key={option.id}
                onClick={() => setSecondaryFilter(option.id)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ring-1 cursor-pointer",
                  secondaryFilter === option.id
                    ? "bg-primary text-white ring-primary shadow-primary/20"
                    : "bg-white text-secondary/70 ring-black/5 hover:bg-secondary/5 hover:text-secondary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          <AnimatePresence>
            {filteredInvitations.length > 0 ? (
              filteredInvitations.map((invitation) => {
                const statusInfo = getStatusDisplay(invitation.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setViewingInvitation(invitation)}
                    className="p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:bg-white/60 transition-colors w-full cursor-pointer"
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Ticket className="w-4 h-4" />
                        </div>
                        <h3 className="font-semibold text-secondary text-base truncate">{invitation.eventName}</h3>
                        <span className={cn("px-2.5 py-1 text-[11px] font-medium rounded-full ring-1 shadow-sm flex items-center gap-1 shrink-0", statusInfo.colors)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-2 sm:gap-4 mt-1">
                        <div className="flex items-center gap-1.5">
                           <Calendar className="w-3.5 h-3.5 shrink-0" />
                           <span>{t('deadline' as any)}: {invitation.deadlineDate}</span>
                        </div>
                        <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                        <div className="flex items-center gap-1.5">
                           <Users className="w-3.5 h-3.5 shrink-0" />
                           <span>{invitation.guestsNumber} {t('guests' as any)}</span>
                        </div>
                        <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                        <span className="font-mono text-xs">{invitation.id}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3 md:mt-0 border-t border-secondary/5 md:border-none pt-3 md:pt-0 justify-end shrink-0">
                      <button 
                        title="View"
                        onClick={(e) => { e.stopPropagation(); setViewingInvitation(invitation); }}
                        className="p-2 sm:p-2.5 bg-white text-blue-500 border border-transparent hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {invitation.status !== 'past' && (
                        <button 
                          title={t('edit' as any)}
                          onClick={(e) => { e.stopPropagation(); setEditingInvitation(invitation); }}
                          className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {invitation.status === 'unsent' && (
                        <button 
                          title={t('remove' as any)}
                          onClick={(e) => { e.stopPropagation(); setInvitationToDelete(invitation.id); }}
                          className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4"
              >
                <Ticket className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-base">{t('noDataFound' as any) || 'No invitations found'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!invitationToDelete}
        onClose={() => setInvitationToDelete(null)}
        onConfirm={handleDelete}
        title={t('confirmDeleteInvitation' as any)}
        message={t('confirmDeleteInvitationMessage' as any)}
      />
    </div>
  );
}
