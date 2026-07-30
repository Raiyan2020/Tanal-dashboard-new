'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, UserPlus, FileText, QrCode, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationType = 'invite' | 'invoice' | 'checkin' | 'system';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

export default function NotificationsContent() {
  const { t, dir } = useLanguage();
  // There is no notifications endpoint on the API yet, so the list stays empty
  // and the page renders its empty state instead of fabricated entries.
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'invite': return <UserPlus className="w-5 h-5" />;
      case 'invoice': return <FileText className="w-5 h-5" />;
      case 'checkin': return <QrCode className="w-5 h-5" />;
      case 'system': return <Bell className="w-5 h-5" />;
    }
  };

  const getColorForType = (type: NotificationType) => {
    switch (type) {
      case 'invite': return 'bg-blue-100 text-blue-600';
      case 'invoice': return 'bg-emerald-100 text-emerald-600';
      case 'checkin': return 'bg-purple-100 text-purple-600';
      case 'system': return 'bg-orange-100 text-orange-600';
    }
  };

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={cn("text-2xl font-medium text-secondary flex items-center gap-2", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            <Bell className="w-6 h-6 text-primary" />
            {t('notifications' as any)}
            {unreadCount > 0 && (
              <span className="ml-2 rtl:ml-0 rtl:mr-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {unreadCount} {t('unread' as any)}
              </span>
            )}
          </h2>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="text-secondary/60 hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            {t('markAllAsRead' as any)}
          </button>
        )}
      </div>

      <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-sm border border-secondary/5">
        <div className="space-y-2">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleNotificationClick(notification.id)}
              className={cn(
                "p-4 rounded-2xl flex gap-4 cursor-pointer transition-all border",
                notification.isRead 
                  ? "bg-transparent border-transparent hover:bg-white/40" 
                  : "bg-white/60 border-primary/10 shadow-sm hover:shadow-md"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                getColorForType(notification.type)
              )}>
                {getIconForType(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4 className={cn(
                    "text-secondary truncate",
                    notification.isRead ? "font-medium" : "font-semibold"
                  )}>
                    {notification.title}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-secondary/50 shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{notification.time}</span>
                  </div>
                </div>
                <p className={cn(
                  "text-sm line-clamp-2",
                  notification.isRead ? "text-secondary/60" : "text-secondary/80"
                )}>
                  {notification.message}
                </p>
              </div>
              
              {!notification.isRead && (
                <div className="flex items-center justify-center shrink-0 w-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              )}
            </motion.div>
          ))}
          
          {notifications.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-secondary/40 gap-4">
              <Bell className="w-12 h-12 opacity-50" />
              <p>{t('noNotifications' as any) || 'No new notifications'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
