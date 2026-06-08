'use client';

import React, { useState, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  ImageIcon,
  Sparkles,
  LayoutGrid,
  Phone,
  ArrowLeft,
  ArrowRight,
  Save,
  Upload,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Globe,
  Briefcase,
  Pencil,
  X,
  AlertTriangle
} from 'lucide-react';

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram },
  { id: 'twitter', name: 'X / Twitter', icon: Twitter },
  { id: 'facebook', name: 'Facebook', icon: Facebook },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
  { id: 'youtube', name: 'YouTube', icon: Youtube },
  { id: 'custom', name: 'Website / Other', icon: Globe },
];

const INITIAL_HERO = {
  headlineEn: 'Welcome to Tanal',
  headlineAr: 'مرحبا بكم في تنال',
  subheadingEn: 'Premium luxury events.',
  subheadingAr: 'مناسبات فاخرة ومميزة.',
  imageUrl: ''
};

const INITIAL_FEATURES = [
  { id: '1', icon: '', textEn: 'Luxury Planning', textAr: 'تخطيط فاخر', descriptionEn: 'Best in class events', descriptionAr: 'أفضل المناسبات في فئتها' }
];

const INITIAL_PORTFOLIO = [
  { id: '1', imageUrl: '', textEn: 'Royal Wedding', textAr: 'زفاف ملكي' }
];

interface ServiceItem {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  imageUrl: string;
}

const INITIAL_SERVICES: ServiceItem[] = [
  { id: '1', nameEn: 'Wedding Planning', nameAr: 'تنظيم حفلات الزفاف', descriptionEn: 'Luxurious wedding ceremonies tailored to your vision.', descriptionAr: 'حفلات زفاف فاخرة مصممة وفق رؤيتك.', imageUrl: '' }
];

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

interface ContactState {
  whatsapp: string;
  addressEn: string;
  addressAr: string;
  mapUrl: string;
  socials: SocialLink[];
}

const SocialPlatformSelect = ({ value, onChange, dir }: { value: string, onChange: (val: string) => void, dir: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPlatform = SOCIAL_PLATFORMS.find(p => p.id === value?.toLowerCase()) || SOCIAL_PLATFORMS[0];
  const Icon = selectedPlatform.icon;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl bg-white/50 border border-secondary/20 hover:border-primary outline-none transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-secondary/70" />
          <span className="text-secondary/90">{selectedPlatform.name}</span>
        </div>
        <ArrowDown className="w-3 h-3 text-secondary/40" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              className={cn(
                "absolute top-full mt-1 w-full bg-white border border-secondary/10 rounded-xl shadow-lg z-50 overflow-hidden",
                dir === 'rtl' ? 'right-0' : 'left-0'
              )}
            >
              <div className="max-h-48 overflow-y-auto py-1">
                {SOCIAL_PLATFORMS.map(p => {
                  const PIcon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { onChange(p.id); setIsOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/5 transition-colors text-left"
                    >
                      <PIcon className="w-4 h-4 text-secondary/70" />
                      <span className="text-secondary/90">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const INITIAL_CONTACT: ContactState = {
  whatsapp: '+966500000000',
  addressEn: 'Riyadh, SA',
  addressAr: 'الرياض، السعودية',
  mapUrl: '',
  socials: []
};

export default function LandingPageContent() {
  const { t, dir } = useLanguage();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [hero, setHero] = useState(INITIAL_HERO);
  const [features, setFeatures] = useState(INITIAL_FEATURES);
  const [portfolio, setPortfolio] = useState(INITIAL_PORTFOLIO);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [contact, setContact] = useState<ContactState>(INITIAL_CONTACT);

  // Service modal state
  type ServiceModal =
    | { mode: 'add' }
    | { mode: 'edit'; service: ServiceItem; index: number }
    | { mode: 'delete'; service: ServiceItem; index: number }
    | null;
  const [serviceModal, setServiceModal] = useState<ServiceModal>(null);
  const [serviceForm, setServiceForm] = useState<ServiceItem>({ id: '', nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', imageUrl: '' });

  const openAdd = () => {
    setServiceForm({ id: Date.now().toString(), nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', imageUrl: '' });
    setServiceModal({ mode: 'add' });
  };
  const openEdit = (service: ServiceItem, index: number) => {
    setServiceForm({ ...service });
    setServiceModal({ mode: 'edit', service, index });
  };
  const openDelete = (service: ServiceItem, index: number) => {
    setServiceModal({ mode: 'delete', service, index });
  };
  const closeServiceModal = () => setServiceModal(null);

  const saveServiceForm = () => {
    if (serviceModal?.mode === 'add') {
      setServices([...services, serviceForm]);
    } else if (serviceModal?.mode === 'edit') {
      const newS = [...services];
      newS[serviceModal.index] = serviceForm;
      setServices(newS);
    }
    closeServiceModal();
  };
  const confirmDeleteService = () => {
    if (serviceModal?.mode === 'delete') {
      setServices(services.filter((_, i) => i !== serviceModal.index));
    }
    closeServiceModal();
  };

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setServiceForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
    // reset so the same file can be re-selected
    e.target.value = '';
  };

  const sections = [
    { id: 'hero', title: t('heroSection' as any) || 'Hero Section', icon: ImageIcon, description: t('heroDesc' as any) || 'Manage the main hero banner, title, subtext, and call to action.' },
    { id: 'features', title: t('featuresSection' as any) || 'Features', icon: Sparkles, description: t('featuresDesc' as any) || 'Edit the key features and services offered.' },
    { id: 'portfolio', title: t('portfolioSection' as any) || 'Portfolio', icon: LayoutGrid, description: t('portfolioDesc' as any) || 'Update the gallery and portfolio of past events.' },
    { id: 'services', title: t('servicesSection' as any) || 'Services', icon: Briefcase, description: t('servicesDesc' as any) || 'Manage the services you offer with names, descriptions, and images.' },
    { id: 'contact', title: t('contactSection' as any) || 'Contact', icon: Phone, description: t('contactDesc' as any) || 'Manage contact information, map location, and social links.' },
  ];

  const moveItem = <T,>(arr: T[], index: number, direction: 'up' | 'down'): T[] => {
    const newArr = [...arr];
    if (direction === 'up' && index > 0) {
      [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
    } else if (direction === 'down' && index < newArr.length - 1) {
      [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
    }
    return newArr;
  };

  const currentSectionInfo = sections.find(s => s.id === activeSection);
  const BackIcon = dir === 'ltr' ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 gap-4">
        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {activeSection && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setActiveSection(null)}
                className="p-2.5 rounded-xl bg-white/40 hover:bg-white/60 shadow-sm transition-colors text-secondary cursor-pointer shrink-0"
              >
                <BackIcon className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
          <div>
            <h2 className={cn("text-2xl font-semibold text-secondary flex items-center gap-2", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
              {activeSection && currentSectionInfo ? (
                <>
                  <currentSectionInfo.icon className="w-6 h-6 text-primary shrink-0" />
                  {currentSectionInfo.title}
                </>
              ) : (
                t('landingPage' as any)
              )}
            </h2>
            <p className="text-sm text-secondary/60 mt-1">
              {activeSection && currentSectionInfo
                ? currentSectionInfo.description
                : dir === 'ltr' ? 'Manage the content of your public landing page.' : 'إدارة محتوى صفحة الهبوط العامة الخاصة بك.'}
            </p>
          </div>
        </div>

        {activeSection && (
          <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-primary/20 cursor-pointer w-full sm:w-auto">
            <Save className="w-4 h-4" />
            {dir === 'ltr' ? 'Save Changes' : 'حفظ التغييرات'}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!activeSection ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {sections.map((section, index) => (
              <motion.button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="p-6 rounded-3xl glass-panel text-start hover:bg-white/60 transition-all shadow-sm border border-secondary/5 group flex flex-col gap-4 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <section.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-secondary mb-2">{section.title}</h3>
                  <p className="text-secondary/60">{section.description}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`section-${activeSection}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 space-y-8 min-h-[80vh]"
          >
            {/* HERO SECTION */}
            {activeSection === 'hero' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'العنوان الرئيسي (EN)' : 'Headline (EN)'}</label>
                    <input
                      type="text"
                      value={hero.headlineEn}
                      onChange={(e) => setHero({ ...hero, headlineEn: e.target.value })}
                      dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'العنوان الرئيسي (AR)' : 'Headline (AR)'}</label>
                    <input
                      type="text"
                      value={hero.headlineAr}
                      onChange={(e) => setHero({ ...hero, headlineAr: e.target.value })}
                      dir="rtl"
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-right font-arabic"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'النص الفرعي (EN)' : 'Subheading (EN)'}</label>
                    <textarea
                      rows={3}
                      value={hero.subheadingEn}
                      onChange={(e) => setHero({ ...hero, subheadingEn: e.target.value })}
                      dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'النص الفرعي (AR)' : 'Subheading (AR)'}</label>
                    <textarea
                      rows={3}
                      value={hero.subheadingAr}
                      onChange={(e) => setHero({ ...hero, subheadingAr: e.target.value })}
                      dir="rtl"
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-right font-arabic"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'الصورة الرئيسية' : 'Hero Image'}</label>
                  {hero.imageUrl ? (
                    <div className="relative rounded-2xl overflow-hidden shadow-sm group">
                      <Image src={hero.imageUrl} alt="Hero" width={800} height={400} className="w-full h-64 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => setHero({ ...hero, imageUrl: '' })}
                          className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-64 rounded-2xl border-2 border-dashed border-secondary/20 flex flex-col items-center justify-center bg-white/30 text-secondary/50 hover:bg-white/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mb-3 opacity-50" />
                      <span className="font-medium">{dir === 'rtl' ? 'انقر لرفع الصورة الرئيسية' : 'Click to upload hero image'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FEATURES SECTION */}
            {activeSection === 'features' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                  <span className="font-medium text-secondary">{dir === 'rtl' ? 'المميزات المضافة' : 'Added Features'}</span>
                  <button
                    onClick={() => setFeatures([...features, { id: Date.now().toString(), icon: '', textEn: 'New Feature', textAr: 'ميزة جديدة', descriptionEn: '', descriptionAr: '' }])}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors shadow-sm ring-1 ring-black/5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> {dir === 'rtl' ? 'إضافة ميزة' : 'Add Feature'}
                  </button>
                </div>

                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={feature.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/40 border border-secondary/10 shadow-sm group">
                      <div className="flex sm:flex-col gap-1 items-center justify-center bg-secondary/5 p-2 rounded-xl">
                        <button onClick={() => setFeatures(moveItem(features, index, 'up'))} disabled={index === 0} className="p-1 hover:bg-white rounded-md disabled:opacity-30 cursor-pointer">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => setFeatures(moveItem(features, index, 'down'))} disabled={index === features.length - 1} className="p-1 hover:bg-white rounded-md disabled:opacity-30 cursor-pointer">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الأيقونة' : 'Icon'}</label>
                            {feature.icon ? (
                              <div className="relative w-full h-9 rounded-xl overflow-hidden shadow-sm group bg-secondary/5">
                                <Image src={feature.icon} alt="Icon" fill className="object-contain p-1" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={() => {
                                      const newF = [...features];
                                      newF[index].icon = '';
                                      setFeatures(newF);
                                    }}
                                    className="p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-9 rounded-xl border-2 border-dashed border-secondary/20 flex items-center justify-center bg-white/30 text-secondary/50 hover:bg-white/50 transition-colors cursor-pointer">
                                <Upload className="w-4 h-4 opacity-50" />
                              </div>
                            )}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الميزة (EN)' : 'Feature (EN)'}</label>
                            <input
                              type="text"
                              value={feature.textEn}
                              onChange={(e) => {
                                const newF = [...features];
                                newF[index].textEn = e.target.value;
                                setFeatures(newF);
                              }}
                              dir="ltr"
                              className="w-full px-3 py-2 text-sm rounded-xl bg-white/50 border border-secondary/20 focus:border-primary outline-none text-left"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الميزة (AR)' : 'Feature (AR)'}</label>
                            <input
                              type="text"
                              value={feature.textAr}
                              onChange={(e) => {
                                const newF = [...features];
                                newF[index].textAr = e.target.value;
                                setFeatures(newF);
                              }}
                              dir="rtl"
                              className="w-full px-3 py-2 text-sm rounded-xl bg-white/50 border border-secondary/20 focus:border-primary outline-none text-right font-arabic"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الوصف (EN)' : 'Description (EN)'}</label>
                            <textarea
                              value={feature.descriptionEn || ''}
                              onChange={(e) => {
                                const newF = [...features];
                                newF[index].descriptionEn = e.target.value;
                                setFeatures(newF);
                              }}
                              dir="ltr"
                              rows={2}
                              className="w-full px-3 py-2 text-sm rounded-xl bg-white/50 border border-secondary/20 focus:border-primary outline-none text-left resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الوصف (AR)' : 'Description (AR)'}</label>
                            <textarea
                              value={feature.descriptionAr || ''}
                              onChange={(e) => {
                                const newF = [...features];
                                newF[index].descriptionAr = e.target.value;
                                setFeatures(newF);
                              }}
                              dir="rtl"
                              rows={2}
                              className="w-full px-3 py-2 text-sm rounded-xl bg-white/50 border border-secondary/20 focus:border-primary outline-none text-right font-arabic resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0">
                        <button
                          onClick={() => setFeatures(features.filter(f => f.id !== feature.id))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {features.length === 0 && (
                    <div className="text-center py-8 text-secondary/50">{dir === 'rtl' ? 'لم يتم إضافة مميزات.' : 'No features added.'}</div>
                  )}
                </div>
              </div>
            )}

            {/* PORTFOLIO SECTION */}
            {activeSection === 'portfolio' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                  <span className="font-medium text-secondary">{dir === 'rtl' ? 'عناصر معرض الأعمال' : 'Portfolio Items'}</span>
                  <button
                    onClick={() => setPortfolio([...portfolio, { id: Date.now().toString(), imageUrl: '', textEn: 'New Project', textAr: 'مشروع جديد' }])}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors shadow-sm ring-1 ring-black/5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> {dir === 'rtl' ? 'إضافة عنصر' : 'Add Item'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {portfolio.map((item, index) => (
                    <div key={item.id} className="flex flex-col gap-4 p-4 rounded-2xl bg-white/40 border border-secondary/10 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1 bg-secondary/5 p-1.5 rounded-xl">
                          <button onClick={() => setPortfolio(moveItem(portfolio, index, 'up'))} disabled={index === 0} className="p-1 hover:bg-white shadow-sm rounded-md disabled:opacity-30 cursor-pointer">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button onClick={() => setPortfolio(moveItem(portfolio, index, 'down'))} disabled={index === portfolio.length - 1} className="p-1 hover:bg-white shadow-sm rounded-md disabled:opacity-30 cursor-pointer">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => setPortfolio(portfolio.filter(p => p.id !== item.id))}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.imageUrl ? (
                        <div className="relative rounded-xl overflow-hidden aspect-video bg-secondary/5">
                          <Image src={item.imageUrl} alt={item.textEn} fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => {
                                const newP = [...portfolio];
                                newP[index].imageUrl = '';
                                setPortfolio(newP);
                              }}
                              className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg shadow-sm cursor-pointer"
                            >
                              {dir === 'rtl' ? 'تغيير الصورة' : 'Replace Image'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-xl border-2 border-dashed border-secondary/20 flex flex-col items-center justify-center bg-white/30 text-secondary/50 hover:bg-white/50 transition-colors cursor-pointer">
                          <Upload className="w-6 h-6 mb-2 opacity-50" />
                          <span className="text-sm font-medium">{dir === 'rtl' ? 'رفع صورة' : 'Upload Image'}</span>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'اسم المشروع (EN)' : 'Project Name (EN)'}</label>
                          <input
                            type="text"
                            value={item.textEn}
                            onChange={(e) => {
                              const newP = [...portfolio];
                              newP[index].textEn = e.target.value;
                              setPortfolio(newP);
                            }}
                            dir="ltr"
                            className="w-full px-3 py-2 text-sm rounded-xl bg-white/50 border border-secondary/20 focus:border-primary outline-none text-left"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'اسم المشروع (AR)' : 'Project Name (AR)'}</label>
                          <input
                            type="text"
                            value={item.textAr}
                            onChange={(e) => {
                              const newP = [...portfolio];
                              newP[index].textAr = e.target.value;
                              setPortfolio(newP);
                            }}
                            dir="rtl"
                            className="w-full px-3 py-2 text-sm rounded-xl bg-white/50 border border-secondary/20 focus:border-primary outline-none text-right font-arabic"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {portfolio.length === 0 && (
                    <div className="col-span-full text-center py-8 text-secondary/50">{dir === 'rtl' ? 'لم يتم إضافة عناصر.' : 'No portfolio items added.'}</div>
                  )}
                </div>
              </div>
            )}

            {/* SERVICES SECTION */}
            {activeSection === 'services' && (
              <div className="space-y-4">
                {/* Header bar */}
                <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                  <span className="font-medium text-secondary">{dir === 'rtl' ? 'الخدمات المضافة' : 'Added Services'} <span className="text-sm text-secondary/40">({services.length})</span></span>
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> {dir === 'rtl' ? 'إضافة خدمة' : 'Add Service'}
                  </button>
                </div>

                {/* Services list */}
                <div className="rounded-2xl border border-secondary/10 overflow-hidden bg-white/20 divide-y divide-secondary/10">
                  {services.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3 text-secondary/40">
                      <Briefcase className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium">{dir === 'rtl' ? 'لم يتم إضافة خدمات بعد.' : 'No services added yet.'}</p>
                    </div>
                  ) : (
                    services.map((service, index) => (
                      <motion.div
                        key={service.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/50 transition-colors group"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary/10 shrink-0 flex items-center justify-center">
                          {service.imageUrl ? (
                            <div className="relative w-full h-full">
                              <Image src={service.imageUrl} alt={service.nameEn} fill className="object-cover" />
                            </div>
                          ) : (
                            <Briefcase className="w-5 h-5 text-secondary/30" />
                          )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold text-secondary truncate', dir === 'rtl' ? 'font-arabic text-right' : '')}>
                            {dir === 'rtl' ? (service.nameAr || service.nameEn) : (service.nameEn || service.nameAr)}
                          </p>
                          <p className={cn('text-xs text-secondary/50 mt-0.5 line-clamp-1', dir === 'rtl' ? 'font-arabic text-right' : '')}>
                            {dir === 'rtl' ? (service.descriptionAr || service.descriptionEn) : (service.descriptionEn || service.descriptionAr)}
                          </p>
                        </div>

                        {/* Reorder */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setServices(moveItem(services, index, 'up'))} disabled={index === 0} className="p-1.5 hover:bg-secondary/10 rounded-lg disabled:opacity-30 cursor-pointer transition-colors">
                            <ArrowUp className="w-3.5 h-3.5 text-secondary/60" />
                          </button>
                          <button onClick={() => setServices(moveItem(services, index, 'down'))} disabled={index === services.length - 1} className="p-1.5 hover:bg-secondary/10 rounded-lg disabled:opacity-30 cursor-pointer transition-colors">
                            <ArrowDown className="w-3.5 h-3.5 text-secondary/60" />
                          </button>
                        </div>

                        {/* Edit / Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => openEdit(service, index)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {dir === 'rtl' ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            onClick={() => openDelete(service, index)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {dir === 'rtl' ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* ── ADD / EDIT MODAL ── */}
                <AnimatePresence>
                  {(serviceModal?.mode === 'add' || serviceModal?.mode === 'edit') && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                      onClick={closeServiceModal}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                      >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Briefcase className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-secondary text-base">
                              {serviceModal.mode === 'add'
                                ? (dir === 'rtl' ? 'إضافة خدمة جديدة' : 'Add New Service')
                                : (dir === 'rtl' ? 'تعديل الخدمة' : 'Edit Service')}
                            </h3>
                          </div>
                          <button onClick={closeServiceModal} className="p-2 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
                            <X className="w-5 h-5 text-secondary/60" />
                          </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                          {/* Image */}
                          <div>
                            <label className="block text-xs font-semibold text-secondary/60 mb-2 uppercase tracking-wider">{dir === 'rtl' ? 'صورة الخدمة' : 'Service Image'}</label>
                            {serviceForm.imageUrl ? (
                              <div className="relative rounded-xl overflow-hidden aspect-video bg-secondary/5">
                                <Image src={serviceForm.imageUrl} alt={serviceForm.nameEn} fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button onClick={() => setServiceForm({ ...serviceForm, imageUrl: '' })} className="p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors cursor-pointer">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => imageInputRef.current?.click()}
                                className="aspect-video rounded-xl border-2 border-dashed border-secondary/20 flex flex-col items-center justify-center bg-secondary/5 text-secondary/40 hover:bg-primary/5 hover:border-primary/30 transition-colors cursor-pointer group/upload"
                              >
                                <Upload className="w-6 h-6 mb-2 group-hover/upload:text-primary transition-colors" />
                                <span className="text-sm font-medium group-hover/upload:text-primary transition-colors">{dir === 'rtl' ? 'انقر لرفع الصورة' : 'Click to upload image'}</span>
                                <span className="text-xs mt-1 opacity-60">{dir === 'rtl' ? 'PNG, JPG, WebP' : 'PNG, JPG, WebP'}</span>
                                <input
                                  ref={imageInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleImageUpload}
                                />
                              </div>
                            )}
                          </div>

                          {/* Names */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الاسم (EN)' : 'Name (EN)'}</label>
                              <input type="text" dir="ltr" value={serviceForm.nameEn} onChange={(e) => setServiceForm({ ...serviceForm, nameEn: e.target.value })}
                                className="w-full px-3 py-2.5 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-left transition-all" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الاسم (AR)' : 'Name (AR)'}</label>
                              <input type="text" dir="rtl" value={serviceForm.nameAr} onChange={(e) => setServiceForm({ ...serviceForm, nameAr: e.target.value })}
                                className="w-full px-3 py-2.5 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-right font-arabic transition-all" />
                            </div>
                          </div>

                          {/* Descriptions */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الوصف (EN)' : 'Description (EN)'}</label>
                              <textarea rows={3} dir="ltr" value={serviceForm.descriptionEn} onChange={(e) => setServiceForm({ ...serviceForm, descriptionEn: e.target.value })}
                                className="w-full px-3 py-2.5 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-left resize-none transition-all" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الوصف (AR)' : 'Description (AR)'}</label>
                              <textarea rows={3} dir="rtl" value={serviceForm.descriptionAr} onChange={(e) => setServiceForm({ ...serviceForm, descriptionAr: e.target.value })}
                                className="w-full px-3 py-2.5 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-right font-arabic resize-none transition-all" />
                            </div>
                          </div>
                        </div>

                        {/* Modal footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary/10 bg-secondary/5">
                          <button onClick={closeServiceModal} className="px-4 py-2 text-sm font-medium text-secondary/70 hover:text-secondary bg-white hover:bg-secondary/5 border border-secondary/15 rounded-xl transition-colors cursor-pointer">
                            {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button onClick={saveServiceForm} className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm shadow-primary/20 cursor-pointer">
                            {serviceModal.mode === 'add' ? (dir === 'rtl' ? 'إضافة' : 'Add Service') : (dir === 'rtl' ? 'حفظ التغييرات' : 'Save Changes')}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── DELETE CONFIRM MODAL ── */}
                <AnimatePresence>
                  {serviceModal?.mode === 'delete' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                      onClick={closeServiceModal}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
                      >
                        <div className="p-6 flex flex-col items-center text-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-red-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-secondary text-base mb-1">{dir === 'rtl' ? 'حذف الخدمة؟' : 'Delete Service?'}</h3>
                            <p className="text-sm text-secondary/60">
                              {dir === 'rtl'
                                ? `هل أنت متأكد من حذف "${serviceModal.service.nameAr || serviceModal.service.nameEn}"؟ لا يمكن التراجع عن هذا الإجراء.`
                                : `Are you sure you want to delete "${serviceModal.service.nameEn || serviceModal.service.nameAr}"? This action cannot be undone.`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                          <button onClick={closeServiceModal} className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 hover:bg-secondary/10 border border-secondary/15 rounded-xl transition-colors cursor-pointer">
                            {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button onClick={confirmDeleteService} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer">
                            {dir === 'rtl' ? 'نعم، احذف' : 'Yes, Delete'}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* CONTACT SECTION */}
            {activeSection === 'contact' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'رقم الواتساب' : 'WhatsApp Number'}</label>
                    <input
                      type="text"
                      value={contact.whatsapp}
                      onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                      dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-left"
                    />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'عنوان المكتب (EN)' : 'Office Address (EN)'}</label>
                      <input
                        type="text"
                        value={contact.addressEn}
                        onChange={(e) => setContact({ ...contact, addressEn: e.target.value })}
                        dir="ltr"
                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'عنوان المكتب (AR)' : 'Office Address (AR)'}</label>
                      <input
                        type="text"
                        value={contact.addressAr}
                        onChange={(e) => setContact({ ...contact, addressAr: e.target.value })}
                        dir="rtl"
                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-right font-arabic"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary mb-2">{dir === 'rtl' ? 'رابط خرائط جوجل' : 'Google Maps Embed URL'}</label>
                    <input
                      type="text"
                      value={contact.mapUrl}
                      onChange={(e) => setContact({ ...contact, mapUrl: e.target.value })}
                      dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm text-left"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-2xl border border-secondary/10 mb-4">
                    <span className="font-medium text-secondary">{dir === 'rtl' ? 'روابط التواصل الاجتماعي' : 'Social Media Links'}</span>
                    <button
                      onClick={() => setContact({ ...contact, socials: [...contact.socials, { id: Date.now().toString(), platform: 'instagram', url: 'https://' }] })}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors shadow-sm ring-1 ring-black/5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> {dir === 'rtl' ? 'إضافة رابط' : 'Add Link'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {contact.socials.map((social, index) => (
                      <div key={social.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/40 border border-secondary/10 shadow-sm items-start sm:items-center">
                        <div className="w-full sm:w-1/3">
                          <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'المنصة' : 'Platform'}</label>
                          <SocialPlatformSelect
                            value={social.platform}
                            dir={dir}
                            onChange={(val) => {
                              const newS = [...contact.socials];
                              newS[index].platform = val;
                              setContact({ ...contact, socials: newS });
                            }}
                          />
                        </div>
                        <div className="w-full sm:w-full flex-1">
                          <label className="block text-xs font-medium text-secondary/60 mb-1.5 uppercase tracking-wider">{dir === 'rtl' ? 'الرابط' : 'URL'}</label>
                          <input
                            type="text"
                            value={social.url}
                            onChange={(e) => {
                              const newS = [...contact.socials];
                              newS[index].url = e.target.value;
                              setContact({ ...contact, socials: newS });
                            }}
                            dir="ltr"
                            className="w-full px-3 py-2 text-sm rounded-xl bg-white/50 border border-secondary/20 focus:border-primary outline-none text-left"
                          />
                        </div>
                        <button
                          onClick={() => setContact({ ...contact, socials: contact.socials.filter(s => s.id !== social.id) })}
                          className="p-2.5 mt-0 sm:mt-5 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer self-end sm:self-auto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {contact.socials.length === 0 && (
                      <div className="text-center py-4 text-secondary/50 text-sm">{dir === 'rtl' ? 'لم يتم إضافة روابط.' : 'No social links added.'}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
