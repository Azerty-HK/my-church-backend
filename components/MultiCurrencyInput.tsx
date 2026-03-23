import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DollarSign, Euro, CreditCard, ChevronDown, ChevronUp } from 'lucide-react-native';
import { CurrencyInput } from './CurrencyInput';
import { formatAmount } from '../utils/currency';

interface MultiCurrencyInputProps {
  values: {
    FC: number;
    USD: number;
    EURO: number;
  };
  onChange: (currency: 'FC' | 'USD' | 'EURO', value: number) => void;
  onCurrencyComplete: (currency: 'FC' | 'USD' | 'EURO') => void;
  completedCurrencies?: ('FC' | 'USD' | 'EURO')[];
  disabledCurrencies?: ('FC' | 'USD' | 'EURO')[];
  maxBalances?: {
    FC?: number;
    USD?: number;
    EURO?: number;
  };
}

export function MultiCurrencyInput({
  values,
  onChange,
  onCurrencyComplete,
  completedCurrencies = [],
  disabledCurrencies = [],
  maxBalances = {},
}: MultiCurrencyInputProps) {
  const [expandedCurrency, setExpandedCurrency] = useState<'FC' | 'USD' | 'EURO' | null>('FC');
  
  const currencies: Array<{
    key: 'FC' | 'USD' | 'EURO';
    label: string;
    icon: any;
    color: string;
  }> = [
    { key: 'FC', label: 'Franc Congolais', icon: CreditCard, color: '#e74c3c' },
    { key: 'USD', label: 'Dollar US', icon: DollarSign, color: '#27ae60' },
    { key: 'EURO', label: 'Euro', icon: Euro, color: '#3498db' },
  ];

  const getCurrencyTotals = () => {
    return currencies.map(curr => ({
      ...curr,
      value: values[curr.key],
      completed: completedCurrencies.includes(curr.key),
      disabled: disabledCurrencies.includes(curr.key),
    }));
  };

  const toggleCurrency = (currency: 'FC' | 'USD' | 'EURO') => {
    setExpandedCurrency(expandedCurrency === currency ? null : currency);
  };

  const handleCompleteCurrency = (currency: 'FC' | 'USD' | 'EURO') => {
    onCurrencyComplete(currency);
    // Passer à la devise suivante non complétée
    const nextCurrency = currencies.find(c => 
      c.key !== currency && 
      !completedCurrencies.includes(c.key) && 
      !disabledCurrencies.includes(c.key)
    );
    if (nextCurrency) {
      setExpandedCurrency(nextCurrency.key);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💱 Saisie Multi-Devises</Text>
      
      {/* Barre de navigation des devises */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyNav}>
        {getCurrencyTotals().map((currency) => (
          <TouchableOpacity
            key={currency.key}
            style={[
              styles.currencyTab,
              expandedCurrency === currency.key && styles.activeCurrencyTab,
              currency.disabled && styles.disabledCurrencyTab,
            ]}
            onPress={() => !currency.disabled && toggleCurrency(currency.key)}
            disabled={currency.disabled}
          >
            <currency.icon size={16} color={currency.disabled ? '#95a5a6' : currency.color} />
            <Text style={[
              styles.currencyTabText,
              { color: currency.disabled ? '#95a5a6' : currency.color },
              expandedCurrency === currency.key && { color: 'white' },
            ]}>
              {currency.key}
            </Text>
            {currency.value > 0 && (
              <View style={[styles.valueBadge, expandedCurrency === currency.key && styles.activeValueBadge]}>
                <Text style={[styles.valueBadgeText, expandedCurrency === currency.key && { color: currency.color }]}>
                  {formatAmount(currency.value, currency.key)}
                </Text>
              </View>
            )}
            {currency.completed && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Zone de saisie pour la devise sélectionnée */}
      {expandedCurrency && (
        <View style={styles.inputContainer}>
          <CurrencyInput
            currency={expandedCurrency}
            value={values[expandedCurrency]}
            onChange={(value) => onChange(expandedCurrency, value)}
            onComplete={() => handleCompleteCurrency(expandedCurrency)}
            disabled={completedCurrencies.includes(expandedCurrency) || disabledCurrencies.includes(expandedCurrency)}
            maxValue={maxBalances[expandedCurrency]}
          />
        </View>
      )}

      {/* Résumé des totaux */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>📊 Résumé des saisies :</Text>
        <View style={styles.summaryList}>
          {getCurrencyTotals()
            .filter(curr => curr.value > 0 || curr.completed)
            .map((currency) => (
              <View key={currency.key} style={styles.summaryItem}>
                <View style={styles.summaryCurrency}>
                  <currency.icon size={14} color={currency.color} />
                  <Text style={[styles.summaryCurrencyText, { color: currency.color }]}>
                    {currency.key}
                  </Text>
                </View>
                <Text style={[styles.summaryValue, { color: currency.color }]}>
                  {formatAmount(currency.value, currency.key)}
                </Text>
                {currency.completed && (
                  <View style={styles.summaryCompleted}>
                    <Text style={styles.summaryCompletedText}>Terminé</Text>
                  </View>
                )}
              </View>
            ))}
        </View>
        {getCurrencyTotals().filter(c => c.value > 0 || c.completed).length === 0 && (
          <Text style={styles.noDataText}>Aucune devise saisie</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  currencyNav: {
    marginBottom: 16,
  },
  currencyTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  activeCurrencyTab: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  disabledCurrencyTab: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  currencyTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueBadge: {
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  activeValueBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  valueBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  completedBadge: {
    backgroundColor: '#27ae60',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  completedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  summaryList: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  summaryCurrencyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  summaryCompleted: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  summaryCompletedText: {
    fontSize: 10,
    color: '#27ae60',
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
}); 