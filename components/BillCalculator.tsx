import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Calculator, Plus, Minus, RotateCcw } from 'lucide-react-native';
import { formatAmount } from '../utils/currency';
import type { CurrencyBill, BillBreakdown } from '../types/database';

// Billets par devise
const CURRENCY_BILLS: Record<string, CurrencyBill[]> = {
  FC: [
    { value: 50, label: '50 FC' },
    { value: 100, label: '100 FC' },
    { value: 200, label: '200 FC' },
    { value: 500, label: '500 FC' },
    { value: 1000, label: '1000 FC' },
    { value: 5000, label: '5000 FC' },
    { value: 10000, label: '10000 FC' },
    { value: 20000, label: '20000 FC' },
  ],
  USD: [
    { value: 1, label: '1 USD' },
    { value: 5, label: '5 USD' },
    { value: 10, label: '10 USD' },
    { value: 20, label: '20 USD' },
    { value: 50, label: '50 USD' },
    { value: 100, label: '100 USD' },
  ],
  EURO: [
    { value: 5, label: '5 EUR' },
    { value: 10, label: '10 EUR' },
    { value: 20, label: '20 EUR' },
    { value: 50, label: '50 EUR' },
    { value: 100, label: '100 EUR' },
    { value: 200, label: '200 EUR' },
    { value: 500, label: '500 EUR' },
  ],
};

interface BillCalculatorProps {
  currency: string;
  onCalculationChange: (breakdown: BillBreakdown[], total: number) => void;
  initialBreakdown?: BillBreakdown[];
}

export function BillCalculator({ currency, onCalculationChange, initialBreakdown = [] }: BillCalculatorProps) {
  const [bills, setBills] = useState<CurrencyBill[]>([]);
  const [breakdown, setBreakdown] = useState<BillBreakdown[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const currencyBills = CURRENCY_BILLS[currency] || CURRENCY_BILLS.FC;
    setBills(currencyBills);
    
    if (initialBreakdown.length > 0) {
      setBreakdown(initialBreakdown);
      calculateTotal(initialBreakdown);
    } else {
      // Initialiser avec des quantités à 0
      const initialBreakdown = currencyBills.map(bill => ({
        bill_value: bill.value,
        bill_label: bill.label,
        quantity: 0,
        total: 0,
      }));
      setBreakdown(initialBreakdown);
    }
  }, [currency]);

  const calculateTotal = (currentBreakdown: BillBreakdown[]) => {
    const newTotal = currentBreakdown.reduce((sum, item) => sum + item.total, 0);
    setTotal(newTotal);
    onCalculationChange(currentBreakdown, newTotal);
  };

  const updateQuantity = (billValue: number, change: number) => {
    const newBreakdown = breakdown.map(item => {
      if (item.bill_value === billValue) {
        const newQuantity = Math.max(0, item.quantity + change);
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * item.bill_value,
        };
      }
      return item;
    });
    
    setBreakdown(newBreakdown);
    calculateTotal(newBreakdown);
  };

  const setQuantityDirectly = (billValue: number, quantity: string) => {
    const numQuantity = parseInt(quantity) || 0;
    const newBreakdown = breakdown.map(item => {
      if (item.bill_value === billValue) {
        return {
          ...item,
          quantity: Math.max(0, numQuantity),
          total: Math.max(0, numQuantity) * item.bill_value,
        };
      }
      return item;
    });
    
    setBreakdown(newBreakdown);
    calculateTotal(newBreakdown);
  };

  const resetCalculator = () => {
    const resetBreakdown = breakdown.map(item => ({
      ...item,
      quantity: 0,
      total: 0,
    }));
    setBreakdown(resetBreakdown);
    setTotal(0);
    onCalculationChange(resetBreakdown, 0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Calculator size={20} color="#3498db" />
        <Text style={styles.title}>💰 Calculateur de billets ({currency})</Text>
        <TouchableOpacity onPress={resetCalculator} style={styles.resetButton}>
          <RotateCcw size={16} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.billsList} showsVerticalScrollIndicator={false}>
        {breakdown.map((item) => (
          <View key={item.bill_value} style={styles.billRow}>
            <View style={styles.billInfo}>
              <Text style={styles.billLabel}>{item.bill_label}</Text>
              <Text style={styles.billValue}>
                {formatAmount(item.bill_value, currency)}
              </Text>
            </View>

            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.bill_value, -1)}
              >
                <Minus size={16} color="#e74c3c" />
              </TouchableOpacity>

              <TextInput
                style={styles.quantityInput}
                value={item.quantity.toString()}
                onChangeText={(text) => setQuantityDirectly(item.bill_value, text)}
                keyboardType="numeric"
                textAlign="center"
              />

              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.bill_value, 1)}
              >
                <Plus size={16} color="#27ae60" />
              </TouchableOpacity>
            </View>

            <View style={styles.billTotal}>
              <Text style={styles.billTotalText}>
                {formatAmount(item.total, currency)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>💵 Total calculé :</Text>
        <Text style={styles.totalValue}>
          {formatAmount(total, currency)}
        </Text>
      </View>

      {/* Détail du calcul */}
      <View style={styles.calculationDetails}>
        <Text style={styles.calculationTitle}>📋 Détail du calcul :</Text>
        <ScrollView style={styles.calculationList} showsVerticalScrollIndicator={false}>
          {breakdown.filter(item => item.quantity > 0).map((item) => (
            <Text key={item.bill_value} style={styles.calculationItem}>
              {item.quantity} × {item.bill_label} = {formatAmount(item.total, currency)}
            </Text>
          ))}
          {breakdown.filter(item => item.quantity > 0).length === 0 && (
            <Text style={styles.noCalculation}>Aucun billet sélectionné</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginLeft: 8,
  },
  resetButton: {
    padding: 4,
  },
  billsList: {
    maxHeight: 200,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  billInfo: {
    flex: 1,
  },
  billLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  billValue: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  quantityInput: {
    width: 50,
    height: 32,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    backgroundColor: 'white',
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  billTotal: {
    width: 80,
    alignItems: 'flex-end',
  },
  billTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  calculationDetails: {
    marginTop: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  calculationList: {
    maxHeight: 80,
  },
  calculationItem: {
    fontSize: 12,
    color: '#34495e',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  noCalculation: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});