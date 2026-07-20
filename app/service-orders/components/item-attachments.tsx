'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Upload, Trash2, Loader2, FileText, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  getServiceOrderItemAttachments,
  uploadServiceOrderItemAttachment,
  deleteServiceOrderItemAttachment,
  type ApiServiceOrderItemAttachment,
} from '@/lib/api';

interface ItemAttachmentsProps {
  orderId: number;
  itemId: number;
  token: string;
}

/**
 * Attachment list + upload for a single service-order item.
 *
 * The list is fetched lazily on first expand — an order can hold many items and
 * fetching every item's attachments up front would fire a request per item on
 * open.
 */
export function ItemAttachments({ orderId, itemId, token }: ItemAttachmentsProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<ApiServiceOrderItemAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getServiceOrderItemAttachments(orderId, itemId, token);
      setAttachments(res.data?.items ?? []);
      setLoaded(true);
    } catch (err) {
      toast.error((err as Error).message || (isAr ? 'فشل تحميل المرفقات' : 'Failed to load attachments'));
    } finally {
      setLoading(false);
    }
  }, [orderId, itemId, token, isAr]);

  useEffect(() => {
    if (expanded && !loaded) fetchAttachments();
  }, [expanded, loaded, fetchAttachments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadServiceOrderItemAttachment(orderId, itemId, file, token);
      toast.success(isAr ? 'تم رفع المرفق' : 'Attachment uploaded');
      await fetchAttachments();
    } catch (err) {
      toast.error((err as Error).message || (isAr ? 'فشل رفع المرفق' : 'Upload failed'));
    } finally {
      setUploading(false);
      // Reset so re-selecting the same file fires a change event again.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachmentId: number) => {
    setDeletingId(attachmentId);
    try {
      await deleteServiceOrderItemAttachment(orderId, itemId, attachmentId, token);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success(isAr ? 'تم حذف المرفق' : 'Attachment deleted');
    } catch (err) {
      toast.error((err as Error).message || (isAr ? 'فشل حذف المرفق' : 'Delete failed'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="pt-2 border-t border-secondary/8">
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-secondary/50 hover:text-secondary transition-colors cursor-pointer"
      >
        <Paperclip className="w-3 h-3" />
        {isAr ? 'المرفقات' : 'Attachments'}
        {loaded && attachments.length > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{attachments.length}</span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {loading && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          )}

          {!loading && attachments.length === 0 && (
            <p className="text-[11px] text-secondary/40 py-1">
              {isAr ? 'لا توجد مرفقات' : 'No attachments yet'}
            </p>
          )}

          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-secondary/40 shrink-0" />
              <div className="min-w-0 flex-1">
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-secondary hover:text-primary hover:underline inline-flex items-center gap-1 truncate"
                >
                  <span className="truncate">{att.original_name}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
                {att.notes && <p className="text-[10px] text-secondary/45 truncate">{att.notes}</p>}
                <p className="text-[10px] text-secondary/35">{att.created_at}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(att.id)}
                disabled={deletingId === att.id}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {deletingId === att.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          ))}

          <label className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-primary/30 text-primary text-[11px] font-medium cursor-pointer hover:bg-primary/5 transition-colors">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {isAr ? 'رفع مرفق' : 'Upload attachment'}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </div>
      )}
    </div>
  );
}
