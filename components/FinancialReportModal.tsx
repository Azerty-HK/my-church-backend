import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Calculator,
  Banknote,
  CreditCard,
  Smartphone,
  DollarSign,
  Globe,
} from 'lucide-react-native';
import { BillCalculator } from './BillCalculator';
import type { PaymentMethod, BillBreakdown, Currency } from '../types/database';

interface FinancialReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    description: string;
    category: string;
    recorded_by: string;
    payment_method: PaymentMethod;
    currency: Currency;
    date: string;
    bills_breakdown?: BillBreakdown[];
    total_calculated?: number;
  }) => Promise<void>;
  title: string;
  currencies: { value: Currency; label: string; symbol: string }[];
  categories: string[];
  initialData?: any;
}

export function FinancialReportModal({
  visible,
  onClose,
  onSubmit,
  title,
  currencies,
  categories,
  initialData,
}: FinancialReportModalProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: initialData?.amount || '',
    description: initialData?.description || '',
    category: initialData?.category || categories[0],
    recorded_by: initialData?.recorded_by || '',
    payment_method: (initialData?.payment_method || 'cash') as PaymentMethod,
    currency: (initialData?.currency || currencies[0]?.value || 'FC') as Currency,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    bills_breakdown: [] as BillBreakdown[],
    total_calculated: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const paymentMethods: { value: PaymentMethod; label: string; icon: any }[] = [
    { value: 'cash', label: 'Caisse', icon: Banknote },
    { value: 'bank', label: 'Banque', icon: CreditCard },
    { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
    { value: 'orange_money', label: 'Orange Money', icon: Smartphone },
    { value: 'airtel_money', label: 'Airtel Money', icon: Smartphone },
    { value: 'afrimoney', label: 'Afrimoney', icon: Smartphone },
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount || '',
        description: initialData.description || '',
        category: initialData.category || categories[0],
        recorded_by: initialData.recorded_by || '',
        payment_method: initialData.payment_method || 'cash',
        currency: initialData.currency || currencies[0]?.value || 'FC',
        date: initialData.date || new Date().toISOString().split('T')[0],
        bills_breakdown: initialData.bills_breakdown || [],
        total_calculated: initialData.total_calculated || 0,
      });
    }
  }, [initialData]);

  const handleBillCalculation = (breakdown: BillBreakdown[], total: number) => {
    setFormData((prev) => ({
      ...prev,
      bills_breakdown: breakdown,
      total_calculated: total,
      amount: total.toString(),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const finalAmount = useManualEntry
      ? parseFloat(formData.amount.replace(',', '.')) || 0
      : formData.total_calculated;

    if (finalAmount <= 0) {
      newErrors.amount = 'Le montant doit être supérieur à 0';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est obligatoire';
    }

    if (!formData.recorded_by.trim()) {
      newErrors.recorded_by = 'Le nom est obligatoire';
    }

    if (!formData.currency) {
      newErrors.currency = 'La devise est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const finalAmount = useManualEntry
        ? parseFloat(formData.amount.replace(',', '.'))
        : formData.total_calculated;

      await onSubmit({
        ...formData,
        amount: finalAmount,
        description: formData.description.trim(),
        recorded_by: formData.recorded_by.trim(),
        bills_breakdown: useManualEntry ? undefined : formData.bills_breakdown,
        total_calculated: useManualEntry ? undefined : formData.total_calculated,
      });

      // Reset form
      setFormData({
        amount: '',
        description: '',
        category: categories[0],
        recorded_by: '',
        payment_method: 'cash',
        currency: currencies[0]?.value || 'FC',
        date: new Date().toISOString().split('T')[0],
        bills_breakdown: [],
        total_calculated: 0,
      });
      setErrors({});
      setShowCalculator(false);
      setUseManualEntry(true);
      onClose();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrencySymbol = () => {
    const currency = currencies.find(c => c.value === formData.currency);
    return currency?.symbol || formData.currency;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#7f8c8d" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          {/* Sélection de devise */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Devise *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryButtons}>
                {currencies.map((currency) => (
                  <TouchableOpacity
                    key={currency.value}
                    style={[
                      styles.currencyButton,
                      formData.currency === currency.value && styles.currencyButtonActive,
                    ]}
                    onPress={() => setFormData((prev) => ({ ...prev, currency: currency.value }))}
                  >
                    <Globe size={16} color={formData.currency === currency.value ? 'white' : '#3498db'} />
                    <Text
                      style={[
                        styles.currencyButtonText,
                        formData.currency === currency.value && styles.currencyButtonTextActive,
                      ]}
                    >
                      {currency.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {errors.currency && <Text style={styles.errorText}>{errors.currency}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Méthode de saisie</Text>
            <View style={styles.entryMethodButtons}>
              <TouchableOpacity
                style={[
                  styles.entryMethodButton,
                  useManualEntry && styles.entryMethodButtonActive,
                ]}
                onPress={() => {
                  setUseManualEntry(true);
                  setShowCalculator(false);
                }}
              >
                <DollarSign size={20} color={useManualEntry ? 'white' : '#3498db'} />
                <Text
                  style={[
                    styles.entryMethodText,
                    useManualEntry && styles.entryMethodTextActive,
                  ]}
                >
                  Saisie manuelle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.entryMethodButton,
                  !useManualEntry && styles.entryMethodButtonActive,
                ]}
                onPress={() => {
                  setUseManualEntry(false);
                  setShowCalculator(true);
                }}
              >
                <Calculator size={20} color={!useManualEntry ? 'white' : '#27ae60'} />
                <Text
                  style={[
                    styles.entryMethodText,
                    !useManualEntry && styles.entryMethodTextActive,
                  ]}
                >
                  Calculateur de billets
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {useManualEntry ? (
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>
                Montant ({getCurrencySymbol()}) *
              </Text>
              <TextInput
                style={[styles.fieldInput, errors.amount && styles.fieldInputError]}
                placeholder={`Montant en ${getCurrencySymbol()}`}
                value={formData.amount}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, amount: text }));
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                keyboardType="decimal-pad"
              />
              {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
            </View>
          ) : (
            showCalculator && (
              <BillCalculator
                currency={formData.currency}
                onCalculationChange={handleBillCalculation}
                initialBreakdown={formData.bills_breakdown}
              />
            )
          )}

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[
                styles.fieldInput,
                styles.fieldInputMultiline,
                errors.description && styles.fieldInputError,
              ]}
              placeholder="Description du compte rendu"
              value={formData.description}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, description: text }));
                if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
              }}
              multiline
              numberOfLines={3}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Catégorie *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryButtons}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      formData.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setFormData((prev) => ({ ...prev, category: cat }))}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        formData.category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Méthode de paiement *</Text>
            <View style={styles.paymentMethods}>
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.paymentMethodButton,
                      formData.payment_method === method.value &&
                        styles.paymentMethodButtonActive,
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, payment_method: method.value }))
                    }
                  >
                    <Icon
                      size={18}
                      color={
                        formData.payment_method === method.value ? '#3498db' : '#7f8c8d'
                      }
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        formData.payment_method === method.value &&
                          styles.paymentMethodTextActive,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Enregistré par *</Text>
            <TextInput
              style={[styles.fieldInput, errors.recorded_by && styles.fieldInputError]}
              placeholder="Nom de la personne"
              value={formData.recorded_by}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, recorded_by: text }));
                if (errors.recorded_by)
                  setErrors((prev) => ({ ...prev, recorded_by: '' }));
              }}
            />
            {errors.recorded_by && (
              <Text style={styles.errorText}>{errors.recorded_by}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.fieldInput}
              value={formData.date}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, date: text }))}
              placeholder="YYYY-MM-DD"
            />
          </View>

          {!useManualEntry && formData.total_calculated > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Montant total calculé</Text>
              <Text style={styles.summaryAmount}>
                {formData.total_calculated.toLocaleString('fr-FR')} {getCurrencySymbol()}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  entryMethodButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  entryMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    gap: 8,
  },
  entryMethodButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  entryMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  entryMethodTextActive: {
    color: 'white',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: 'white',
  },
  fieldInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  fieldInputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3498db',
    backgroundColor: 'white',
    gap: 8,
  },
  currencyButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3498db',
  },
  currencyButtonTextActive: {
    color: 'white',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
  },
  categoryButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    gap: 6,
  },
  paymentMethodButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3498db',
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  paymentMethodTextActive: {
    color: '#3498db',
  },
  summaryCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#27ae60',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#27ae60',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
}); 