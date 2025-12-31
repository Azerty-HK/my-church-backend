export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'FC', name: 'Franc Congolais', symbol: 'FC', locale: 'fr-CD' },
  { code: 'USD', name: 'Dollar Américain', symbol: '$', locale: 'en-US' },
  { code: 'EURO', name: 'Euro', symbol: '€', locale: 'fr-FR' },
];

export function getCurrencySymbol(currency: string): string {
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency.toUpperCase());
  return currencyInfo?.symbol || currency;
}

export function getCurrencyName(currency: string): string {
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency.toUpperCase());
  return currencyInfo?.name || currency;
}

export function getCurrencyLocale(currency: string): string {
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency.toUpperCase());
  return currencyInfo?.locale || 'fr-FR';
}

export function formatAmount(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const locale = getCurrencyLocale(currency);
  
  try {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    
    const sign = amount < 0 ? '-' : '';
    return `${sign}${formatted} ${symbol}`;
  } catch (error) {
    // Fallback si la locale n'est pas supportée
    const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} ${symbol}`;
  }
}

export function parseAmount(amountString: string): number {
  if (!amountString) return 0;
  
  // Supprimer tous les caractères non numériques sauf le point et la virgule
  const cleaned = amountString.replace(/[^\d.,-]/g, '');
  
  // Remplacer la virgule par un point pour la conversion
  const normalized = cleaned.replace(',', '.');
  
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export function validateAmount(amount: string | number): { isValid: boolean; error?: string } {
  const numAmount = typeof amount === 'string' ? parseAmount(amount) : amount;
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Montant invalide' };
  }
  
  if (numAmount < 0) {
    return { isValid: false, error: 'Le montant ne peut pas être négatif' };
  }
  
  if (numAmount > 999999999) {
    return { isValid: false, error: 'Montant trop élevé' };
  }
  
  return { isValid: true };
}

export function formatCurrency(amount: number, currency: string, options?: {
  showSign?: boolean;
  compact?: boolean;
}): string {
  const { showSign = false, compact = false } = options || {};
  
  if (compact && Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000;
    return `${millions.toFixed(1)}M ${getCurrencySymbol(currency)}`;
  }
  
  if (compact && Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    return `${thousands.toFixed(1)}K ${getCurrencySymbol(currency)}`;
  }
  
  const formatted = formatAmount(amount, currency);
  
  if (showSign && amount > 0) {
    return `+${formatted}`;
  }
  
  return formatted;
}

// ==================== NOUVELLES FONCTIONS POUR DOSSIER ====================

export function formatDossierAmount(amount: number, currency: string): string {
  // Format spécial pour les montants dans les dossiers
  const symbol = getCurrencySymbol(currency);
  
  if (amount === 0) {
    return `0 ${symbol}`;
  }
  
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  
  const sign = amount < 0 ? '−' : '+';
  return `${sign} ${formatted} ${symbol}`;
}

export function formatDossierPayment(method: string, amount: number, currency: string): string {
  const methodIcons: Record<string, string> = {
    'cash': '💵',
    'bank': '🏦',
    'mpesa': '📱',
    'orange_money': '🟠',
    'airtel_money': '🔴',
    'afrimoney': '🌍',
    'mobile': '📱',
    'card': '💳',
    'digital_wallet': '📲'
  };
  
  const icon = methodIcons[method] || '💳';
  return `${icon} ${formatAmount(amount, currency)}`;
}

export function calculateDossierStats(transactions: Array<{amount: number; currency: string}>): {
  total: number;
  average: number;
  count: number;
} {
  if (transactions.length === 0) {
    return { total: 0, average: 0, count: 0 };
  }
  
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const average = total / transactions.length;
  const count = transactions.length;
  
  return { total, average, count };
}

export function generateDossierSummary(
  amounts: number[],
  currency: string
): string {
  if (amounts.length === 0) {
    return `Aucune transaction enregistrée`;
  }
  
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const average = total / amounts.length;
  
  return `Total: ${formatAmount(total, currency)} | Min: ${formatAmount(min, currency)} | Max: ${formatAmount(max, currency)} | Moyenne: ${formatAmount(average, currency)}`;
}