'use client';

import React, { useState, Suspense, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Briefcase,
  MailPlus,
  Settings,
  Globe,
  Menu,
  Bell,
  LogOut,
  Loader2,
  Wallet,
  ShoppingBag,
  Layers,
  SlidersHorizontal,
  UserPen,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { clearAuth, getAdmin, getToken, getPermissions } from '@/lib/auth';
import { logoutAdmin } from '@/lib/api';
import type { Admin } from '@/lib/api';
import { ProfileEditDialog } from './profile-edit-dialog';

/**
 * Each nav item declares which permission string is needed to see it.
 * `permission: null` means always visible (e.g. dashboard).
 */
const navItems = [
  { icon: LayoutDashboard, id: 'dashboard',     permission: null },
  { icon: UserCog,         id: 'admins',         permission: 'admins' },
  { icon: ShieldCheck,     id: 'roles',          permission: 'roles' },
  { icon: Users,           id: 'clients',        permission: 'clients' },
  { icon: CalendarDays,    id: 'events',         permission: 'events' },
  { icon: MailPlus,        id: 'invitations',    permission: 'invitations' },
  { icon: ShoppingBag,     id: 'serviceOrders',  permission: 'service-orders' },
  { icon: Layers,          id: 'services',       permission: 'services' },
  { icon: SlidersHorizontal, id: 'serviceOptions', permission: 'service-options' },
  { icon: Briefcase,       id: 'employees',      permission: 'employees' },
  { icon: Wallet,          id: 'financial',      permission: 'finance' },
  { icon: Globe,           id: 'landingPage',    permission: 'landing-page' },
  { icon: Settings,        id: 'settings',       permission: 'show-settings' },
];

// Map nav ids that differ from their URL segment
const NAV_ROUTES: Record<string, string> = {
  serviceOrders: '/service-orders',
  serviceOptions: '/service-options',
  services: '/services',
};

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage, dir } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  // Admin state — starts from localStorage, can be refreshed on profile update
  const [admin, setAdmin] = useState<Admin | null>(() => getAdmin<Admin>());

  // Permissions — read once from localStorage on mount
  const visibleNavItems = useMemo(() => {
    const perms = getPermissions();
    const isSuperAdmin = (admin as any)?.is_super_admin === true;
    return navItems.filter(item =>
      item.permission === null || isSuperAdmin || perms.includes(item.permission)
    );
  }, [admin]);

  const searchParams = useSearchParams();

  // Extract active nav item from pathname + search params
  const activeItem = pathname === '/'
    ? 'dashboard'
    : pathname.startsWith('/service-orders')
      ? 'serviceOrders'
      : pathname.startsWith('/service-options')
        ? 'serviceOptions'
        : pathname.startsWith('/services')
          ? 'services'
          : (pathname.replace('/', '').split('/')[0] || 'dashboard');

  const setActiveItem = (id: string) => {
    if (id === 'dashboard') { router.push('/'); return; }
    router.push(NAV_ROUTES[id] ?? `/${id}`);
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const token = getToken();
      if (token) await logoutAdmin(token);
    } catch {
      // swallow — always clear locally regardless
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <>
      <div className="flex h-screen overflow-hidden luxury-gradient font-sans text-secondary">
        {/* Sidebar background overlay for mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-secondary/20 backdrop-blur-sm lg:hidden"
            />
          )}
        </AnimatePresence>
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{
            width: sidebarOpen ? 280 : 88,
            x: sidebarOpen ? 0 : (dir === 'rtl' ? (typeof window !== 'undefined' && window.innerWidth < 1024 ? 280 : 0) : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -280 : 0))
          }}
          className={cn(
            "fixed top-0 bottom-0 z-50 flex flex-col pt-6 pb-4 transition-transform lg:relative lg:translate-x-0",
            "glass-panel border-r-0 lg:border-r border-white/60",
            dir === 'rtl' ? 'right-0 border-l border-white/60 lg:border-r-0 lg:border-l' : 'left-0 border-r border-white/60 lg:border-r',
            !sidebarOpen && "max-lg:-translate-x-full max-lg:rtl:translate-x-full"
          )}
        >
          <div className="flex items-center px-6 mb-8 mt-2 overflow-hidden justify-between w-full h-8">
            <div className="flex items-center gap-3">
              <Image
                src="https://raiyansoft.com/wp-content/uploads/2026/05/logo-2.png"
                alt="Tanal Logo"
                width={30}
                height={40}
                className="shrink-0 object-contain drop-shadow-sm w-[30px] h-10"
                referrerPolicy="no-referrer"
              />
              <motion.span
                animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "auto" : 0 }}
                className={cn("whitespace-nowrap text-xl font-medium tracking-wide text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic')}
              >
                {t('tanal')}
              </motion.span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
            {visibleNavItems.map((item) => {
              const isSelected = activeItem === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveItem(item.id);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full gap-4 px-3 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden cursor-pointer",
                    isSelected ? "bg-white/60 shadow-sm text-primary-dark" : "text-secondary hover:bg-white/30"
                  )}
                  title={!sidebarOpen ? t(item.id) : undefined}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute inset-0 bg-white/50 border border-white rounded-2xl z-0"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <item.icon className={cn("w-5 h-5 shrink-0 z-10", isSelected ? "text-primary" : "")} strokeWidth={1.5} />
                  <motion.span
                    animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "auto" : 0 }}
                    className="whitespace-nowrap z-10 text-sm font-normal"
                  >
                    {t(item.id)}
                  </motion.span>
                </button>
              )
            })}
          </nav>

          <div className="px-4 mt-auto pt-4 border-t border-secondary/5 mx-4">
            <button
              onClick={logout}
              disabled={loggingOut}
              className="flex items-center w-full gap-4 px-3 py-3 rounded-2xl transition-all duration-300 text-secondary hover:bg-red-50/50 hover:text-red-600/80 group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loggingOut
                ? <Loader2 className="w-5 h-5 shrink-0 z-10 animate-spin" />
                : <LogOut className="w-5 h-5 shrink-0 z-10" strokeWidth={1.5} />}
              <motion.span
                animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "auto" : 0 }}
                className="whitespace-nowrap z-10 text-sm font-normal"
              >
                {t('logout')}
              </motion.span>
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-multiply" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/20 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-multiply" />

          {/* Header */}
          <header className="h-20 lg:h-24 px-6 lg:px-10 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="p-2.5 rounded-2xl text-secondary bg-white/40 hover:bg-white/60 transition-colors shadow-[0_4px_12px_rgba(54,45,35,0.02)] ring-1 ring-white/60 focus:outline-none cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden md:block">
                <h1 className={cn("text-xl tracking-tight text-secondary/80 font-medium", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
                  {t('tanal')} / <span className="text-secondary">{t(activeItem)}</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/40 hover:bg-white/60 transition-colors shadow-sm ring-1 ring-white/60 group cursor-pointer"
              >
                <Globe className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-medium">{t('toggleLanguage')}</span>
              </button>

              <button
                onClick={() => setActiveItem('notifications')}
                className={cn(
                  "relative p-2.5 rounded-xl transition-colors shadow-sm ring-1 ring-white/60 cursor-pointer",
                  activeItem === 'notifications' ? "bg-white/70 text-primary-dark" : "bg-white/40 hover:bg-white/60"
                )}
              >
                <Bell className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-white"></span>
              </button>

              <div className="h-8 w-[1px] bg-secondary/10 mx-1 sm:mx-2" />

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-1 pr-3 rounded-full bg-white/40 hover:bg-white/60 transition-colors shadow-sm ring-1 ring-white/60 border border-transparent cursor-pointer rtl:pl-3 rtl:pr-1"
                >
                  <Image
                    src={admin?.image ?? 'https://raiyansoft.com/wp-content/uploads/2026/06/Untitled-design.png'}
                    alt="Profile"
                    width={36}
                    height={36}
                    className="rounded-full ring-2 ring-white object-cover pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <span className="hidden sm:block text-sm font-medium pointer-events-none">{admin?.name ?? 'Admin'}</span>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "absolute top-full mt-2 w-48 bg-white/90 backdrop-blur-md border border-white/60 shadow-xl rounded-2xl p-2 z-50 overflow-hidden",
                          dir === 'rtl' ? 'left-0' : 'right-0'
                        )}
                      >
                        {/* Edit Profile */}
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            setProfileEditOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-secondary hover:bg-secondary/8 rounded-xl transition-colors shrink-0 rtl:text-right cursor-pointer font-medium"
                          dir={dir}
                        >
                          <UserPen className="w-4 h-4 shrink-0 text-primary" />
                          {dir === 'rtl' ? 'تعديل الملف الشخصي' : 'Edit Profile'}
                        </button>

                        <div className="my-1 h-px bg-secondary/8" />

                        {/* Logout */}
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            logout();
                          }}
                          disabled={loggingOut}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0 rtl:text-right cursor-pointer font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                          dir={dir}
                        >
                          {loggingOut
                            ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                            : <LogOut className="w-4 h-4 shrink-0" />}
                          {t('logout' as any) || 'Logout'}
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Dashboard Content Area */}
          <main className="flex-1 overflow-auto p-6 lg:p-10 pt-2 lg:pt-4">
            <div className="max-w-[1400px] mx-auto w-full h-full space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeItem}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
      {/* Profile Edit Dialog — rendered via portal to document.body */}
      <ProfileEditDialog
        open={profileEditOpen}
        onClose={() => setProfileEditOpen(false)}
        admin={admin}
        onSuccess={(updated) => setAdmin(updated)}
      />
    </>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (
    pathname === '/login' ||
    pathname.startsWith('/client-portal') ||
    pathname.startsWith('/guest-view') ||
    pathname.startsWith('/order-client') ||
    pathname.startsWith('/order-employee')
  ) {
    return (
      <div className="font-sans text-secondary min-h-screen selection:bg-primary/20 selection:text-primary-dark">
        {children}
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex h-screen overflow-hidden luxury-gradient justify-center items-center font-sans">
        <div className="animate-pulse text-stone-400 text-sm">Loading Tanal...</div>
      </div>
    }>
      <MainLayoutContent>{children}</MainLayoutContent>
    </Suspense>
  );
}
