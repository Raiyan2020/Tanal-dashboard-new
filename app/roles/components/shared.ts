/* ─── Shared helpers ────────────────────────────────────────────── */

export function actionColor(action: string) {
  switch (action) {
    case 'view':   return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'add':    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'edit':   return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'delete': return 'bg-red-50 text-red-700 border-red-200';
    case 'show':   return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'block':  return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'cancel': return 'bg-pink-50 text-pink-700 border-pink-200';
    default:       return 'bg-secondary/5 text-secondary border-secondary/20';
  }
}
