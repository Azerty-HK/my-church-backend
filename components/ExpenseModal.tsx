import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import {
  X,
  Banknote,
  CreditCard,
  AlertCircle,
  DollarSign,
} from 'lucide-react-native';

interface ExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    description: string;
    category: string;
    recorded_by: string;
    source: 'cash' | 'bank';
    date: string;
    requires_approval: boolean;
  }) => Promise<void>;
  currency: string;
  categories: string[];
  currentBalance: number;
  bankBalance: number;
  expenseLimit: number;
}

export function ExpenseModal({
  visible,
  onClose,
  onSubmit,
  currency,
  categories,
  currentBalance,
  bankBalance,
  expenseLimit,
}: ExpenseModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: categories[0] || 'Général',
    recorded_by: '',
    source: 'cash' as 'cash' | 'bank',
    date: new Date().toISOString().split('T')[0],
    requires_approval: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const amount = parseFloat(formData.amount.replace(',', '.')) || 0;

    if (amount <= 0) {
      newErrors.amount = 'Le montant doit être supérieur à 0';
    }

    const availableBalance = formData.source === 'bank' ? bankBalance : currentBalance;
    if (amount > availableBalance) {
      newErrors.amount = `Solde insuffisant. Disponible: ${availableBalance.toLocaleString('fr-FR')} ${currency}`;
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est obligatoire';
    }

    if (!formData.recorded_by.trim()) {
      newErrors.recorded_by = 'Le nom est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const amount = parseFloat(formData.amount.replace(',', '.'));

      const needsApproval = amount > expenseLimit;

      await onSubmit({
        ...formData,
        amount,
        description: formData.description.trim(),
        recorded_by: formData.recorded_by.trim(),
        requires_approval: needsApproval || formData.requires_approval,
      });

      setFormData({
        amount: '',
        description: '',
        category: categories[0] || 'Général',
        recorded_by: '',
        source: 'cash',
        date: new Date().toISOString().split('T')[0],
        requires_approval: false,
      });
      setErrors({});
      onClose();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const amount = parseFloat(formData.amount.replace(',', '.')) || 0;
  const needsApproval = amount > expenseLimit;
  const availableBalance = formData.source === 'bank' ? bankBalance : currentBalance;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#7f8c8d" />
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle dépense</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          <View style={styles.balanceInfo}>
            <View style={styles.balanceItem}>
              <Banknote size={20} color="#27ae60" />
              <Text style={styles.balanceLabel}>Caisse</Text>
              <Text style={styles.balanceAmount}>
                {currentBalance.toLocaleString('fr-FR')} {currency}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <CreditCard size={20} color="#3498db" />
              <Text style={styles.balanceLabel}>Banque</Text>
              <Text style={styles.balanceAmount}>
                {bankBalance.toLocaleString('fr-FR')} {currency}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Source du paiement *</Text>
            <View style={styles.sourceButtons}>
              <TouchableOpacity
                style={[
                  styles.sourceButton,
                  formData.source === 'cash' && styles.sourceButtonActive,
                ]}
                onPress={() => setFormData((prev) => ({ ...prev, source: 'cash' }))}
              >
                <Banknote
                  size={20}
                  color={formData.source === 'cash' ? 'white' : '#27ae60'}
                />
                <Text
                  style={[
                    styles.sourceButtonText,
                    formData.source === 'cash' && styles.sourceButtonTextActive,
                  ]}
                >
                  Caisse
                </Text>
                <Text
                  style={[
                    styles.sourceButtonBalance,
                    formData.source === 'cash' && styles.sourceButtonBalanceActive,
                  ]}
                >
                  {currentBalance.toLocaleString('fr-FR')} {currency}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sourceButton,
                  formData.source === 'bank' && styles.sourceButtonActive,
                ]}
                onPress={() => setFormData((prev) => ({ ...prev, source: 'bank' }))}
              >
                <CreditCard
                  size={20}
                  color={formData.source === 'bank' ? 'white' : '#3498db'}
                />
                <Text
                  style={[
                    styles.sourceButtonText,
                    formData.source === 'bank' && styles.sourceButtonTextActive,
                  ]}
                >
                  Banque
                </Text>
                <Text
                  style={[
                    styles.sourceButtonBalance,
                    formData.source === 'bank' && styles.sourceButtonBalanceActive,
                  ]}
                >
                  {bankBalance.toLocaleString('fr-FR')} {currency}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Montant ({currency}) *</Text>
            <TextInput
              style={[styles.fieldInput, errors.amount && styles.fieldInputError]}
              placeholder={`Montant en ${currency}`}
              value={formData.amount}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, amount: text }));
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
              }}
              keyboardType="decimal-pad"
            />
            {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
            {amount > 0 && (
              <Text style={styles.amountPreview}>
                {amount.toLocaleString('fr-FR')} {currency}
              </Text>
            )}
          </View>

          {needsApproval && (
            <View style={styles.approvalWarning}>
              <AlertCircle size={20} color="#f39c12" />
              <Text style={styles.approvalWarningText}>
                Cette dépense dépasse le seuil de {expenseLimit.toLocaleString('fr-FR')}{' '}
                {currency} et nécessitera l'approbation de l'administrateur.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[
                styles.fieldInput,
                styles.fieldInputMultiline,
                errors.description && styles.fieldInputError,
              ]}
              placeholder="Description de la dépense"
              value={formData.description}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, description: text }));
                if (errors.description)
                  setErrors((prev) => ({ ...prev, description: '' }));
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

          <View style={styles.summaryCard}>
            <DollarSign size={24} color="#e74c3c" />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Sera déduit de</Text>
              <Text style={styles.summarySource}>
                {formData.source === 'cash' ? 'Caisse' : 'Banque'}
              </Text>
              <Text style={styles.summaryBalance}>
                Nouveau solde: {(availableBalance - amount).toLocaleString('fr-FR')}{' '}
                {currency}
              </Text>
            </View>
          </View>
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
              <Text style={styles.submitButtonText}>Enregistrer la dépense</Text>
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
  balanceInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  balanceItem: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  balanceLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 4,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  section: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sourceButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  sourceButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    gap: 4,
  },
  sourceButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  sourceButtonTextActive: {
    color: 'white',
  },
  sourceButtonBalance: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  sourceButtonBalanceActive: {
    color: 'rgba(255, 255, 255, 0.9)',
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
  amountPreview: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '600',
    marginTop: 6,
  },
  approvalWarning: {
    flexDirection: 'row',
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  approvalWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#9c6500',
    lineHeight: 18,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
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
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3f3',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e74c3c',
    alignItems: 'center',
    gap: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#e74c3c',
    marginBottom: 2,
  },
  summarySource: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 4,
  },
  summaryBalance: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  submitButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e74c3c',
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
