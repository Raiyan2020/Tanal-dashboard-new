'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { FileSpreadsheet, Loader2, Upload, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { importInvitationGuests, ApiError, type InvitationGuestImportResult } from '@/lib/api';
import { toast } from 'sonner';

interface GuestImportModalProps {
  invitationId: number;
  token: string;
  onClose: () => void;
  /** Fired after any import that may have added rows, so the list can refetch. */
  onImported: () => void;
}

const ACCEPTED = '.csv,.xlsx,.xls';

export function GuestImportModal({
  invitationId,
  token,
  onClose,
  onImported,
}: GuestImportModalProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<InvitationGuestImportResult | null>(null);

  const submit = async () => {
    if (!file || importing) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await importInvitationGuests(invitationId, file, token);
      const data = res.data ?? {};
      setResult(data);
      onImported();

      // A partial failure still imported rows, so keep the modal open to show
      // which ones were rejected rather than closing over the detail.
      if (data.failed_count) {
        toast.warning(res.msg || t('guestsImportedPartially'));
      } else {
        toast.success(res.msg || t('guestsImported'));
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setResult({ errors: [{ message: err.fieldError('file') ?? err.message }] });
      }
      toast.error((err as Error).message || t('guestsImportFailed'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md glass-panel rounded-3xl relative z-10 shadow-2xl p-6 sm:p-8 text-start"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </span>
          <h3 className="text-lg font-bold text-secondary">{t('uploadSheet')}</h3>
        </div>
        <p className="text-xs text-secondary/50 mb-5">{t('guestImportHint')}</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={e => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-secondary/20 bg-white/30 hover:bg-white/60 hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-60"
        >
          <Upload className="w-6 h-6 text-secondary/40" />
          <span className="text-sm font-medium text-secondary/70">
            {file ? file.name : t('chooseFile')}
          </span>
          <span className="text-[11px] text-secondary/40">CSV, XLSX</span>
        </button>

        {/* Per-row failures from a partial import */}
        {result && (result.failed_count || result.errors?.length) ? (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/70 space-y-1.5 max-h-40 overflow-y-auto">
            <div className="flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-bold">
                {result.imported_count != null
                  ? `${result.imported_count} ${t('imported')} · ${result.failed_count ?? 0} ${t('failedRows')}`
                  : t('guestsImportFailed')}
              </span>
            </div>
            {result.errors?.map((rowError, i) => (
              <p key={i} className="text-[11px] text-amber-800/90 ps-5">
                {rowError.row != null ? `${t('row')} ${rowError.row}: ` : ''}
                {rowError.message}
              </p>
            ))}
          </div>
        ) : null}

        <div className="flex gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-sm font-medium text-secondary/70 bg-white/60 hover:bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!file || importing}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('uploadSheet')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
