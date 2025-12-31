import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, CircleAlert as AlertCircle, Clock, CreditCard, Banknote, Star } from 'lucide-react-native';
import { formatAmount, formatCurrency } from '../utils/currency';

interface FinancialSummaryProps {
  balance: number;
  bankBalance?: number;
  totalIncome: number;
  totalExpenses: number;
  pendingExpenses?: number;
  currency: string;
  onBalancePress?: () => void;
  onBankPress?: () => void;
  onIncomePress?: () => void;
  onExpensePress?: () => void;
}

export function FinancialSummary({ 
  balance, 
  bankBalance = 0,
  totalIncome, 
  totalExpenses, 
  pendingExpenses = 0,
  currency,
  onBalancePress,
  onBankPress,
  onIncomePress,
  onExpensePress
}: FinancialSummaryProps) {
  
  const getBalanceColor = (amount: number) => {
    if (amount > 0) return '#27ae60';
    if (amount === 0) return '#f39c12';
    return '#e74c3c';
  };

  const getBalanceIcon = (amount: number) => {
    if (amount > 0) return <TrendingUp size={24} color="#27ae60" />;
    if (amount === 0) return <AlertCircle size={24} color="#f39c12" />;
    return <TrendingDown size={24} color="#e74c3c" />;
  };

  const calculateExpenseRatio = () => {
    if (totalIncome === 0) return 0;
    return (totalExpenses / totalIncome) * 100;
  };

  const expenseRatio = calculateExpenseRatio();

  return (
    <View style={styles.container}>
      {/* Solde caisse */}
      <TouchableOpacity 
        style={[styles.card, styles.balanceCard, { borderLeftColor: getBalanceColor(balance) }]}
        onPress={onBalancePress}
        activeOpacity={0.7}
      >
        <Banknote size={24} color={getBalanceColor(balance)} />
        <Text style={styles.cardLabel}>💰 Caisse</Text>
        <Text style={[styles.cardValue, { color: getBalanceColor(balance) }]}>
          {formatAmount(balance, currency)}
        </Text>
        <Text style={styles.cardSubtext}>
          {balance > 0 ? 'Disponible' : balance === 0 ? 'Vide' : 'Déficit'}
        </Text>
      </TouchableOpacity>

      {/* Solde banque */}
      {bankBalance !== undefined && (
        <TouchableOpacity 
          style={[styles.card, styles.bankCard, { borderLeftColor: getBalanceColor(bankBalance) }]}
          onPress={onBankPress}
          activeOpacity={0.7}
        >
          <CreditCard size={24} color={getBalanceColor(bankBalance)} />
          <Text style={styles.cardLabel}>🏦 Banque</Text>
          <Text style={[styles.cardValue, { color: getBalanceColor(bankBalance) }]}>
            {formatAmount(bankBalance, currency)}
          </Text>
          <Text style={styles.cardSubtext}>
            {bankBalance > 0 ? 'Créditeur' : bankBalance === 0 ? 'Neutre' : 'Débiteur'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Revenus */}
      <TouchableOpacity 
        style={[styles.card, styles.incomeCard]}
        onPress={onIncomePress}
        activeOpacity={0.7}
      >
        <TrendingUp size={24} color="#27ae60" />
        <Text style={styles.cardLabel}>📈 Comptes rendus totaux</Text>
        <Text style={[styles.cardValue, styles.incomeValue]}>
          {formatAmount(totalIncome, currency)}
        </Text>
        <Text style={styles.cardSubtext}>
          {formatCurrency(totalIncome, currency, { compact: true })}
        </Text>
      </TouchableOpacity>

      {/* Dépenses */}
      <TouchableOpacity 
        style={[styles.card, styles.expenseCard]}
        onPress={onExpensePress}
        activeOpacity={0.7}
      >
        <TrendingDown size={24} color="#e74c3c" />
        <Text style={styles.cardLabel}>📉 Dépenses totales</Text>
        <Text style={[styles.cardValue, styles.expenseValue]}>
          {formatAmount(totalExpenses, currency)}
        </Text>
        <Text style={styles.cardSubtext}>
          {expenseRatio.toFixed(1)}% des comptes rendus
        </Text>
      </TouchableOpacity>

      {/* Dépenses en attente */}
      {pendingExpenses > 0 && (
        <View style={[styles.card, styles.pendingCard]}>
          <Clock size={24} color="#f39c12" />
          <Text style={styles.cardLabel}>⏳ En attente</Text>
          <Text style={[styles.cardValue, styles.pendingValue]}>
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  balanceCard: {
    borderLeftColor: '#3498db',
  },
  bankCard: {
    borderLeftColor: '#9b59b6',
  },
  incomeCard: {
    borderLeftColor: '#27ae60',
  },
  expenseCard: {
    borderLeftColor: '#e74c3c',
  },
  pendingCard: {
    borderLeftColor: '#f39c12',
  },
  cardLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 10,
    color: '#adb5bd',
    textAlign: 'center',
  },
  incomeValue: {
    color: '#27ae60',
  },
  expenseValue: {
    color: '#e74c3c',
  },
  pendingValue: {
    color: '#f39c12',
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