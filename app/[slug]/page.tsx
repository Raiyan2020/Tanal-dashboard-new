import React from 'react';
import { ModulePlaceholder } from '@/components/module-placeholder';

export default async function DynamicModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ModulePlaceholder moduleName={slug} />;
}
