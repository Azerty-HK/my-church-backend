import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, Clock, CreditCard, Banknote, Star } from 'lucide-react-native';
import { formatCurrency } from '../utils/currency';

interface FinancialSummaryProps {
  balances: {
    cash: {
      FC: number;
      USD: number;
      EURO: number;
    };
    bank: {
      FC: number;
      USD: number;
      EURO: number;
    };
  };
  totalExpenses: {
    FC: number;
    USD: number;
    EURO: number;
  };
  pendingExpenses?: number;
  onBalancePress?: () => void;
  onBankPress?: () => void;
  onExpensePress?: () => void;
}

export function FinancialSummary({ 
  balances = {
    cash: { FC: 0, USD: 0, EURO: 0 },
    bank: { FC: 0, USD: 0, EURO: 0 }
  },
  totalExpenses = { FC: 0, USD: 0, EURO: 0 },
  pendingExpenses = 0,
  onBalancePress,
  onBankPress,
  onExpensePress
}: FinancialSummaryProps) {
  
  const getBalanceColor = (amount: number) => {
    if (amount > 0) return '#27ae60';
    if (amount === 0) return '#f39c12';
    return '#e74c3c';
  };

  const getTotalBalance = (type: 'cash' | 'bank', currency: 'FC' | 'USD' | 'EURO') => {
    return balances[type][currency] || 0;
  };

  const getTotalExpenses = (currency: 'FC' | 'USD' | 'EURO') => {
    return totalExpenses[currency] || 0;
  };

  return (
    <View style={styles.container}>
      {/* Solde caisse multi-devises */}
      <TouchableOpacity 
        style={[styles.card, styles.balanceCard]}
        onPress={onBalancePress}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Banknote size={24} color="#3498db" />
          <Text style={styles.cardTitle}>💰 Caisse Multi-Devises</Text>
        </View>
        
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>FC:</Text>
          <Text style={[styles.currencyAmount, { color: getBalanceColor(getTotalBalance('cash', 'FC')) }]}>
            {formatCurrency(balances.cash.FC || 0, 'FC')}
          </Text>
        </View>
        
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>USD:</Text>
          <Text style={[styles.currencyAmount, { color: getBalanceColor(getTotalBalance('cash', 'USD')) }]}>
            {formatCurrency(balances.cash.USD || 0, 'USD')}
          </Text>
        </View>
        
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>EURO:</Text>
          <Text style={[styles.currencyAmount, { color: getBalanceColor(getTotalBalance('cash', 'EURO')) }]}>
            {formatCurrency(balances.cash.EURO || 0, 'EURO')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Solde banque multi-devises */}
      <TouchableOpacity 
        style={[styles.card, styles.bankCard]}
        onPress={onBankPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <CreditCard size={24} color="#9b59b6" />
          <Text style={styles.cardTitle}>🏦 Banque Multi-Devises</Text>
        </View>
        
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>FC:</Text>
          <Text style={[styles.currencyAmount, { color: getBalanceColor(getTotalBalance('bank', 'FC')) }]}>
            {formatCurrency(balances.bank.FC || 0, 'FC')}
          </Text>
        </View>
        
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>USD:</Text>
          <Text style={[styles.currencyAmount, { color: getBalanceColor(getTotalBalance('bank', 'USD')) }]}>
            {formatCurrency(balances.bank.USD || 0, 'USD')}
          </Text>
        </View>
        
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>EURO:</Text>
          <Text style={[styles.currencyAmount, { color: getBalanceColor(getTotalBalance('bank', 'EURO')) }]}>
            {formatCurrency(balances.bank.EURO || 0, 'EURO')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Dépenses par devise */}
      <TouchableOpacity 
        style={[styles.card, styles.expenseCard]}
        onPress={onExpensePress}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <TrendingDown size={24} color="#e74c3c" />
          <Text style={styles.cardTitle}>📉 Dépenses totales</Text>
        </View>
        
        <View style={styles.currencyRow}>
          <View style={styles.expenseRow}>
            <Text style={styles.currencyLabel}>FC:</Text>
            <Text style={[styles.currencyAmount, styles.expenseValue]}>
              {formatCurrency(getTotalExpenses('FC'), 'FC')}
            </Text>
          </View>
          <Text style={styles.expenseDevise}>Devise FC</Text>
        </View>
        
        <View style={styles.currencyRow}>
          <View style={styles.expenseRow}>
            <Text style={styles.currencyLabel}>USD:</Text>
            <Text style={[styles.currencyAmount, styles.expenseValue]}>
              {formatCurrency(getTotalExpenses('USD'), 'USD')}
            </Text>
          </View>
          <Text style={styles.expenseDevise}>Devise USD</Text>
        </View>
        
        <View style={styles.currencyRow}>
          <View style={styles.expenseRow}>
            <Text style={styles.currencyLabel}>EURO:</Text>
            <Text style={[styles.currencyAmount, styles.expenseValue]}>
              {formatCurrency(getTotalExpenses('EURO'), 'EURO')}
            </Text>
          </View>
          <Text style={styles.expenseDevise}>Devise EURO</Text>
        </View>
      </TouchableOpacity>

      {/* Dépenses en attente */}
      {pendingExpenses > 0 && (
        <View style={[styles.card, styles.pendingCard]}>
          <View style={styles.cardHeader}>
            <Clock size={24} color="#f39c12" />
            <Text style={styles.cardTitle}>⏳ En attente</Text>
          </View>
          <Text style={[styles.pendingCount, styles.pendingValue]}>
            {pendingExpenses}
          </Text>
          <Text style={styles.cardSubtext}>
            Dépenses à approuver
          </Text>
        </View>
      )}

      {/* Signature */}
      <View style={styles.signature}>
        <Star size={12} color="#f39c12" />
        <Text style={styles.signatureText}>My Church - Created by Henock Aduma</Text>
        <Star size={12} color="#f39c12" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  balanceCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  bankCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    alignItems: 'center',
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    minWidth: 40,
  },
  currencyAmount: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  expenseDevise: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
  expenseValue: {
    color: '#e74c3c',
  },
  pendingCount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  pendingValue: {
    color: '#f39c12',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 4,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  signatureText: {
    fontSize: 10,
    color: '#f39c12',
    fontWeight: '600',
    fontStyle: 'italic',
  },
}); 