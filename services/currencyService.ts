import { DatabaseService } from '../lib/database';
import type { Church, CurrencyBalances, ExchangeRates } from '../types/database';

export class CurrencyService {
  static defaultExchangeRates: ExchangeRates = {
    USD_FC: 2250,
    EURO_FC: 2700,
  };

  // Vérifier si une transaction multi-devise est valide
  static validateMultiCurrencyTransaction(
    amounts: CurrencyBalances,
    balances: CurrencyBalances,
    churchId: string
  ): { isValid: boolean; error?: string; insufficientCurrencies?: string[] } {
    const insufficientCurrencies: string[] = [];

    // Vérifier chaque devise
    (Object.keys(amounts) as Array<keyof CurrencyBalances>).forEach(currency => {
      if (amounts[currency] > balances[currency]) {
        insufficientCurrencies.push(currency);
      }
    });

    if (insufficientCurrencies.length > 0) {
      return {
        isValid: false,
        error: `Sols insuffisants pour les devises: ${insufficientCurrencies.join(', ')}`,
        insufficientCurrencies,
      };
    }

    return { isValid: true };
  }

  // Convertir un montant d'une devise à une autre
  static convertAmount(
    amount: number,
    fromCurrency: 'FC' | 'USD' | 'EURO',
    toCurrency: 'FC' | 'USD' | 'EURO',
    exchangeRates: ExchangeRates
  ): number {
    if (fromCurrency === toCurrency) return amount;

    // Convertir vers FC si nécessaire
    let amountInFC = amount;
    if (fromCurrency === 'USD') {
      amountInFC = amount * exchangeRates.USD_FC;
    } else if (fromCurrency === 'EURO') {
      amountInFC = amount * exchangeRates.EURO_FC;
    }

    // Convertir de FC vers devise cible
    if (toCurrency === 'FC') {
      return amountInFC;
    } else if (toCurrency === 'USD') {
      return amountInFC / exchangeRates.USD_FC;
    } else if (toCurrency === 'EURO') {
      return amountInFC / exchangeRates.EURO_FC;
    }

    return 0;
  }

  // Calculer le total équivalent en FC
  static calculateTotalInFC(
    amounts: CurrencyBalances,
    exchangeRates: ExchangeRates
  ): number {
    let totalFC = 0;
    
    totalFC += amounts.FC; // FC reste FC
    totalFC += amounts.USD * exchangeRates.USD_FC;
    totalFC += amounts.EURO * exchangeRates.EURO_FC;

    return totalFC;
  }

  // Mettre à jour les soldes après une transaction
  static updateBalances(
    currentBalances: CurrencyBalances,
    changes: CurrencyBalances,
    operation: 'add' | 'subtract'
  ): CurrencyBalances {
    const newBalances = { ...currentBalances };
    
    (Object.keys(changes) as Array<keyof CurrencyBalances>).forEach(currency => {
      if (operation === 'add') {
        newBalances[currency] = (currentBalances[currency] || 0) + changes[currency];
      } else {
        newBalances[currency] = (currentBalances[currency] || 0) - changes[currency];
      }
      
      // S'assurer que le solde ne devient pas négatif (devrait être vérifié avant)
      newBalances[currency] = Math.max(0, newBalances[currency]);
    });

    return newBalances;
  }

  // Formater les soldes pour l'affichage
  static formatBalances(balances: CurrencyBalances): string {
    const parts: string[] = [];
    
    if (balances.FC > 0) parts.push(`${balances.FC} FC`);
    if (balances.USD > 0) parts.push(`${balances.USD} USD`);
    if (balances.EURO > 0) parts.push(`${balances.EURO} EURO`);
    
    return parts.length > 0 ? parts.join(' | ') : '0 FC';
  }

  // Vérifier si une conversion est possible
  static canConvert(
    fromCurrency: keyof CurrencyBalances,
    amount: number,
    balances: CurrencyBalances
  ): { canConvert: boolean; error?: string } {
    if (amount <= 0) {
      return { canConvert: false, error: 'Le montant doit être positif' };
    }

    if (amount > balances[fromCurrency]) {
      return { 
        canConvert: false, 
        error: `Solde ${fromCurrency} insuffisant. Disponible: ${balances[fromCurrency]}` 
      };
    }

    return { canConvert: true };
  }

  // Effectuer une conversion
  static performConversion(
    fromCurrency: keyof CurrencyBalances,
    toCurrency: keyof CurrencyBalances,
    amount: number,
    exchangeRates: ExchangeRates,
    balances: CurrencyBalances
  ): { 
    success: boolean; 
    error?: string; 
    newBalances?: CurrencyBalances;
    convertedAmount?: number;
  } {
    const validation = this.canConvert(fromCurrency, amount, balances);
    if (!validation.canConvert) {
      return { success: false, error: validation.error };
    }

    // Calculer le montant converti
    const convertedAmount = this.convertAmount(amount, fromCurrency, toCurrency, exchangeRates);
    
    // Mettre à jour les soldes
    const changes: CurrencyBalances = { FC: 0, USD: 0, EURO: 0 };
    changes[fromCurrency] = -amount;
    changes[toCurrency] = convertedAmount;

    const newBalances = this.updateBalances(balances, changes, 'add');

    return {
      success: true,
      newBalances,
      convertedAmount,
    };
  }
} gvv 