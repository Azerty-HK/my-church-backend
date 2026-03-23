"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_CURRENCIES = void 0;
exports.getCurrencySymbol = getCurrencySymbol;
exports.getCurrencyName = getCurrencyName;
exports.getCurrencyLocale = getCurrencyLocale;
exports.getCurrencySeparators = getCurrencySeparators;
exports.formatAmount = formatAmount;
exports.parseAmount = parseAmount;
exports.validateAmount = validateAmount;
exports.formatCurrency = formatCurrency;
exports.formatDossierAmount = formatDossierAmount;
exports.formatDossierPayment = formatDossierPayment;
exports.calculateDossierStats = calculateDossierStats;
exports.generateDossierSummary = generateDossierSummary;
exports.isValidCurrency = isValidCurrency;
exports.getDefaultCurrency = getDefaultCurrency;
exports.normalizeCurrency = normalizeCurrency;
exports.safeFormatCurrency = safeFormatCurrency;
exports.convertAmount = convertAmount;
exports.formatWithConversion = formatWithConversion;
exports.formatAllBalances = formatAllBalances;
exports.getTotalInMainCurrency = getTotalInMainCurrency;
const react_native_1 = require("react-native");
exports.SUPPORTED_CURRENCIES = [
    {
        code: 'FC',
        name: 'Franc Congolais',
        symbol: 'FC',
        locale: 'fr-CD',
        decimalSeparator: ',',
        thousandSeparator: '.'
    },
    {
        code: 'USD',
        name: 'Dollar Américain',
        symbol: '$',
        locale: 'en-US',
        decimalSeparator: '.',
        thousandSeparator: ','
    },
    {
        code: 'EURO',
        name: 'Euro',
        symbol: '€',
        locale: 'fr-FR',
        decimalSeparator: ',',
        thousandSeparator: ' '
    },
];
// Valeur par défaut pour éviter les undefined
const DEFAULT_CURRENCY = {
    code: 'FC',
    name: 'Franc Congolais',
    symbol: 'FC',
    locale: 'fr-FR',
    decimalSeparator: ',',
    thousandSeparator: '.'
};
function getCurrencySymbol(currency) {
    if (!currency) {
        return DEFAULT_CURRENCY.symbol;
    }
    try {
        const currencyInfo = exports.SUPPORTED_CURRENCIES.find(c => c.code === currency.toUpperCase());
        return currencyInfo?.symbol || DEFAULT_CURRENCY.symbol;
    }
    catch (error) {
        console.warn('Erreur dans getCurrencySymbol:', error);
        return DEFAULT_CURRENCY.symbol;
    }
}
function getCurrencyName(currency) {
    if (!currency) {
        return DEFAULT_CURRENCY.name;
    }
    try {
        const currencyInfo = exports.SUPPORTED_CURRENCIES.find(c => c.code === currency.toUpperCase());
        return currencyInfo?.name || DEFAULT_CURRENCY.name;
    }
    catch (error) {
        console.warn('Erreur dans getCurrencyName:', error);
        return DEFAULT_CURRENCY.name;
    }
}
function getCurrencyLocale(currency) {
    if (!currency) {
        return DEFAULT_CURRENCY.locale;
    }
    try {
        const currencyInfo = exports.SUPPORTED_CURRENCIES.find(c => c.code === currency.toUpperCase());
        return currencyInfo?.locale || DEFAULT_CURRENCY.locale;
    }
    catch (error) {
        console.warn('Erreur dans getCurrencyLocale:', error);
        return DEFAULT_CURRENCY.locale;
    }
}
function getCurrencySeparators(currency) {
    if (!currency) {
        return {
            decimal: DEFAULT_CURRENCY.decimalSeparator,
            thousand: DEFAULT_CURRENCY.thousandSeparator
        };
    }
    try {
        const currencyInfo = exports.SUPPORTED_CURRENCIES.find(c => c.code === currency.toUpperCase());
        return {
            decimal: currencyInfo?.decimalSeparator || DEFAULT_CURRENCY.decimalSeparator,
            thousand: currencyInfo?.thousandSeparator || DEFAULT_CURRENCY.thousandSeparator
        };
    }
    catch (error) {
        console.warn('Erreur dans getCurrencySeparators:', error);
        return {
            decimal: DEFAULT_CURRENCY.decimalSeparator,
            thousand: DEFAULT_CURRENCY.thousandSeparator
        };
    }
}
function formatAmount(amount, currency) {
    // Convertir en nombre
    let numericAmount;
    if (typeof amount === 'string') {
        numericAmount = parseAmount(amount);
    }
    else {
        numericAmount = amount;
    }
    const symbol = getCurrencySymbol(currency);
    const locale = getCurrencyLocale(currency);
    try {
        // Vérifier si numericAmount est un nombre valide
        if (typeof numericAmount !== 'number' || isNaN(numericAmount)) {
            numericAmount = 0;
        }
        // Formater selon la locale
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(numericAmount));
        const sign = numericAmount < 0 ? '-' : '';
        return `${sign}${formatted} ${symbol}`;
    }
    catch (error) {
        console.warn('Erreur dans formatAmount, fallback:', error);
        // Fallback manuel basé sur les séparateurs de devise
        const separators = getCurrencySeparators(currency);
        const absAmount = Math.abs(numericAmount);
        const formatted = absAmount.toFixed(2)
            .replace('.', separators.decimal)
            .replace(/\B(?=(\d{3})+(?!\d))/g, separators.thousand);
        return `${numericAmount < 0 ? '-' : ''}${formatted} ${symbol}`;
    }
}
function parseAmount(amountString) {
    if (!amountString || typeof amountString !== 'string') {
        return 0;
    }
    try {
        // Récupérer la locale actuelle
        const locale = react_native_1.Platform.OS === 'ios' ?
            Intl.DateTimeFormat().resolvedOptions().locale :
            'fr-FR';
        // Détecter les séparateurs basés sur la locale
        const sample = 1000.5.toLocaleString(locale);
        const thousandSeparator = sample.charAt(1) === ',' ? '.' : ',';
        const decimalSeparator = thousandSeparator === ',' ? '.' : ',';
        // Nettoyer le montant
        let cleaned = amountString.trim();
        // Remplacer tous les séparateurs de milliers
        cleaned = cleaned.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '');
        // Remplacer le séparateur décimal par un point
        cleaned = cleaned.replace(decimalSeparator, '.');
        // Supprimer tous les caractères non numériques sauf le point, moins et parenthèses
        cleaned = cleaned.replace(/[^\d.-]/g, '');
        // Gérer les montants entre parenthèses (négatifs)
        if (amountString.includes('(') && amountString.includes(')')) {
            cleaned = '-' + cleaned.replace(/[()]/g, '');
        }
        if (!cleaned || cleaned === '-' || cleaned === '.') {
            return 0;
        }
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    catch (error) {
        console.warn('Erreur dans parseAmount:', error);
        return 0;
    }
}
function validateAmount(amount) {
    if (amount === null || amount === undefined || amount === '') {
        return {
            isValid: false,
            error: 'Montant requis'
        };
    }
    const numAmount = typeof amount === 'string' ? parseAmount(amount) : amount;
    if (typeof numAmount !== 'number' || isNaN(numAmount)) {
        return {
            isValid: false,
            error: 'Montant invalide'
        };
    }
    if (numAmount < 0) {
        return {
            isValid: false,
            error: 'Le montant ne peut pas être négatif'
        };
    }
    if (numAmount > 999999999) {
        return {
            isValid: false,
            error: 'Montant trop élevé'
        };
    }
    return { isValid: true };
}
function formatCurrency(amount, currency, options) {
    const { showSign = false, compact = false, noSymbol = false, customSymbol } = options || {};
    // Valeurs par défaut pour éviter les erreurs
    const safeAmount = amount || 0;
    const safeCurrency = currency || 'FC';
    if (compact) {
        const absAmount = Math.abs(safeAmount);
        if (absAmount >= 1000000) {
            const millions = safeAmount / 1000000;
            const symbol = noSymbol ? '' : (customSymbol || getCurrencySymbol(safeCurrency));
            const sign = showSign && safeAmount > 0 ? '+' : (safeAmount < 0 ? '-' : '');
            return `${sign}${millions.toFixed(1)}M${symbol ? ` ${symbol}` : ''}`;
        }
        if (absAmount >= 1000) {
            const thousands = safeAmount / 1000;
            const symbol = noSymbol ? '' : (customSymbol || getCurrencySymbol(safeCurrency));
            const sign = showSign && safeAmount > 0 ? '+' : (safeAmount < 0 ? '-' : '');
            return `${sign}${thousands.toFixed(1)}K${symbol ? ` ${symbol}` : ''}`;
        }
    }
    const symbol = noSymbol ? '' : (customSymbol || getCurrencySymbol(safeCurrency));
    const formatted = formatAmount(safeAmount, safeCurrency);
    if (noSymbol && customSymbol) {
        // Remplacer le symbole par défaut par le custom
        return formatted.replace(getCurrencySymbol(safeCurrency), customSymbol);
    }
    if (noSymbol) {
        // Retirer le symbole
        return formatted.replace(` ${getCurrencySymbol(safeCurrency)}`, '');
    }
    if (showSign && safeAmount > 0) {
        return `+${formatted}`;
    }
    return formatted;
}
// ==================== FONCTIONS POUR DOSSIER ====================
function formatDossierAmount(amount, currency) {
    // Valeurs par défaut
    const safeAmount = amount || 0;
    const safeCurrency = currency || 'FC';
    const symbol = getCurrencySymbol(safeCurrency);
    if (safeAmount === 0) {
        return `0 ${symbol}`;
    }
    try {
        // Formater sans décimales pour les dossiers
        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Math.abs(safeAmount));
        const sign = safeAmount < 0 ? '−' : '+';
        return `${sign} ${formatted} ${symbol}`;
    }
    catch (error) {
        console.warn('Erreur dans formatDossierAmount:', error);
        return `${safeAmount < 0 ? '−' : '+'} ${Math.abs(safeAmount)} ${symbol}`;
    }
}
function formatDossierPayment(method, amount, currency) {
    const methodIcons = {
        'cash': '💵 Caisse',
        'bank': '🏦 Banque',
        'mpesa': '📱 M-Pesa',
        'orange_money': '🟠 Orange Money',
        'airtel_money': '🔴 Airtel Money',
        'afrimoney': '🌍 Afrimoney',
        'mobile': '📱 Mobile',
        'card': '💳 Carte',
        'digital_wallet': '📲 Portefeuille'
    };
    const safeMethod = method || 'cash';
    const safeAmount = amount || 0;
    const safeCurrency = currency || 'FC';
    const iconLabel = methodIcons[safeMethod] || '💳 Autre';
    return `${iconLabel} • ${formatAmount(safeAmount, safeCurrency)}`;
}
function calculateDossierStats(transactions) {
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return { total: 0, average: 0, count: 0, byCurrency: {} };
    }
    try {
        // Filtrer les transactions valides
        const validTransactions = transactions.filter(t => t && typeof t.amount === 'number' && !isNaN(t.amount));
        if (validTransactions.length === 0) {
            return { total: 0, average: 0, count: 0, byCurrency: {} };
        }
        const total = validTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const average = total / validTransactions.length;
        const count = validTransactions.length;
        // Calcul par devise
        const byCurrency = {};
        validTransactions.forEach(t => {
            const currency = t.currency || 'FC';
            byCurrency[currency] = (byCurrency[currency] || 0) + (t.amount || 0);
        });
        return { total, average, count, byCurrency };
    }
    catch (error) {
        console.warn('Erreur dans calculateDossierStats:', error);
        return { total: 0, average: 0, count: 0, byCurrency: {} };
    }
}
function generateDossierSummary(amounts, currency) {
    if (!amounts || !Array.isArray(amounts) || amounts.length === 0) {
        return `Aucune transaction enregistrée`;
    }
    try {
        // Filtrer les montants valides
        const validAmounts = amounts.filter(amount => typeof amount === 'number' && !isNaN(amount));
        if (validAmounts.length === 0) {
            return `Aucune transaction valide`;
        }
        const total = validAmounts.reduce((sum, amount) => sum + (amount || 0), 0);
        const min = Math.min(...validAmounts);
        const max = Math.max(...validAmounts);
        const average = total / validAmounts.length;
        const safeCurrency = currency || 'FC';
        return `Total: ${formatAmount(total, safeCurrency)} | Min: ${formatAmount(min, safeCurrency)} | Max: ${formatAmount(max, safeCurrency)} | Moyenne: ${formatAmount(average, safeCurrency)}`;
    }
    catch (error) {
        console.warn('Erreur dans generateDossierSummary:', error);
        return `Erreur de calcul des statistiques`;
    }
}
// Fonction utilitaire pour valider une devise
function isValidCurrency(currency) {
    if (!currency || typeof currency !== 'string') {
        return false;
    }
    try {
        return exports.SUPPORTED_CURRENCIES.some(c => c.code === currency.toUpperCase());
    }
    catch (error) {
        console.warn('Erreur dans isValidCurrency:', error);
        return false;
    }
}
// Fonction pour obtenir une devise par défaut si null/undefined
function getDefaultCurrency() {
    return DEFAULT_CURRENCY.code;
}
// Fonction pour normaliser une devise (majuscules, validation)
function normalizeCurrency(currency) {
    if (!currency || typeof currency !== 'string') {
        return DEFAULT_CURRENCY.code;
    }
    try {
        const upperCurrency = currency.toUpperCase();
        return exports.SUPPORTED_CURRENCIES.some(c => c.code === upperCurrency)
            ? upperCurrency
            : DEFAULT_CURRENCY.code;
    }
    catch (error) {
        console.warn('Erreur dans normalizeCurrency:', error);
        return DEFAULT_CURRENCY.code;
    }
}
// Fonction pour formater un montant avec une devise sécurisée
function safeFormatCurrency(amount, currency, options) {
    // Convertir en nombre sécurisé
    let safeAmount = 0;
    if (typeof amount === 'number' && !isNaN(amount)) {
        safeAmount = amount;
    }
    else if (typeof amount === 'string') {
        safeAmount = parseAmount(amount);
    }
    // Normaliser la devise
    const safeCurrency = normalizeCurrency(currency);
    return formatCurrency(safeAmount, safeCurrency, options);
}
// Fonction pour comparer deux montants dans différentes devises
function convertAmount(amount, fromCurrency, toCurrency, exchangeRates = {
    'FC': 1,
    'USD': 2300, // 1 USD = 2300 FC (exemple)
    'EURO': 2500 // 1 EURO = 2500 FC (exemple)
}) {
    if (fromCurrency === toCurrency) {
        return amount;
    }
    const rateFrom = exchangeRates[fromCurrency] || 1;
    const rateTo = exchangeRates[toCurrency] || 1;
    // Convertir à FC d'abord, puis à la devise cible
    const amountInFC = amount * rateFrom;
    return amountInFC / rateTo;
}
// Fonction pour afficher un montant avec sa conversion
function formatWithConversion(amount, currency, targetCurrency, exchangeRates) {
    const mainAmount = formatAmount(amount, currency);
    if (currency === targetCurrency) {
        return mainAmount;
    }
    try {
        const converted = convertAmount(amount, currency, targetCurrency, exchangeRates);
        return `${mainAmount} (≈ ${formatAmount(converted, targetCurrency)})`;
    }
    catch (error) {
        console.warn('Erreur conversion:', error);
        return mainAmount;
    }
}
// Fonction pour formater un solde avec toutes les devises
function formatAllBalances(balances, showEmpty = false) {
    const formatted = [];
    exports.SUPPORTED_CURRENCIES.forEach(currency => {
        const balance = balances[currency.code] || 0;
        if (showEmpty || balance !== 0) {
            formatted.push(`${formatAmount(balance, currency.code)}`);
        }
    });
    return formatted;
}
// Fonction pour obtenir le total en devise principale
function getTotalInMainCurrency(balances, mainCurrency = 'FC', exchangeRates) {
    let total = 0;
    Object.entries(balances).forEach(([currency, amount]) => {
        if (amount && amount !== 0) {
            if (currency === mainCurrency) {
                total += amount;
            }
            else {
                total += convertAmount(amount, currency, mainCurrency, exchangeRates);
            }
        }
    });
    return total;
}
