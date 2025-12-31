import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Plus, TrendingUp, TrendingDown, CircleCheck as CheckCircle, Clock, X, CreditCard, Banknote, Smartphone, FileText, Download } from 'lucide-react-native';
import { useChurch } from '../../contexts/ChurchContext';
import { DatabaseService } from '../../lib/database';
import { ValidationService } from '../../utils/validation';
import { FinancialService } from '../../services/financialService';
import { FinancialSummary } from '../../components/FinancialSummary';
import { BillCalculator } from '../../components/BillCalculator';
import { ReportExporter } from '../../components/ReportExporter';
import { getThemeColors } from '../../lib/theme';
import { formatCurrency } from '../../utils/currency';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import type { DailyReport, Expense, FinancialSummary as FinancialSummaryType, PaymentMethod, BillBreakdown } from '../../types/database';

export default function FinanceScreen() {
  const { church, user, permissions, refreshChurch } = useChurch();
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showReportExporter, setShowReportExporter] = useState(false);
  
  // Formulaires
  const [newReport, setNewReport] = useState({
    amount: '',
    description: '',
    category: 'Offrandes' as 'Offrandes' | 'Dîmes' | 'Dons' | 'Contributions' | 'Divers',
    recorded_by: '',
    payment_method: 'cash' as PaymentMethod,
    date: new Date().toISOString().split('T')[0],
    bills_breakdown: [] as BillBreakdown[],
    total_calculated: 0,
  });
  
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: 'Général',
    recorded_by: '',
    payment_method: 'cash' as PaymentMethod,
    source: 'cash' as 'cash' | 'bank',
    requires_approval: false,
    date: new Date().toISOString().split('T')[0],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const theme = church?.theme || 'blue';
  const colors = getThemeColors(theme);

  const paymentMethods: { value: PaymentMethod; label: string; icon: any; description: string }[] = [
    { value: 'cash', label: 'Caisse', icon: Banknote, description: 'Argent liquide' },
    { value: 'bank', label: 'Banque', icon: CreditCard, description: 'Compte bancaire' },
    { value: 'mpesa', label: 'M-Pesa', icon: Smartphone, description: 'Paiement mobile' },
    { value: 'orange_money', label: 'Orange Money', icon: Smartphone, description: 'Paiement mobile' },
    { value: 'airtel_money', label: 'Airtel Money', icon: Smartphone, description: 'Paiement mobile' },
    { value: 'afrimoney', label: 'Afrimoney', icon: Smartphone, description: 'Paiement mobile' },
  ];

  const reportCategories = ['Offrandes', 'Dîmes', 'Dons', 'Contributions', 'Divers'];

  useEffect(() => {
    if (church) {
      loadFinancialData();
    }
  }, [church]);

  const loadFinancialData = async () => {
    if (!church) return;

    try {
      console.log('💰 Chargement données financières...');
      
      const [reportsData, expensesData, summaryData] = await Promise.all([
        DatabaseService.getDailyReports(church.id),
        DatabaseService.getExpenses(church.id),
        DatabaseService.getFinancialSummary(church.id)
      ]);

      setDailyReports(reportsData);
      setExpenses(expensesData);
      setFinancialSummary(summaryData);
      
      console.log('✅ Données financières chargées');
    } catch (error) {
      console.error('❌ Erreur chargement finance:', error);
      Alert.alert('Erreur', 'Impossible de charger les données financières');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  const validateReportForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    const finalAmount = newReport.total_calculated > 0 ? newReport.total_calculated : parseFloat(newReport.amount.replace(',', '.')) || 0;
    
    if (finalAmount <= 0) {
      errors.amount = 'Le montant doit être positif';
    }
    
    const descriptionValidation = ValidationService.validateDescription(newReport.description);
    if (!descriptionValidation.isValid) {
      errors.description = descriptionValidation.error!;
    }
    
    if (!newReport.recorded_by.trim()) {
      errors.recorded_by = 'Le nom de l\'enregistreur est obligatoire';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateExpenseForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    const amountValidation = ValidationService.validateAmount(newExpense.amount);
    if (!amountValidation.isValid) {
      errors.amount = amountValidation.error!;
    }
    
    const descriptionValidation = ValidationService.validateDescription(newExpense.description);
    if (!descriptionValidation.isValid) {
      errors.description = descriptionValidation.error!;
    }
    
    if (!newExpense.recorded_by.trim()) {
      errors.recorded_by = 'Le nom de l\'enregistreur est obligatoire';
    }

    // Validation du solde disponible
    const amount = parseFloat(newExpense.amount.replace(',', '.')) || 0;
    const availableBalance = newExpense.source === 'bank' ? church?.bank_balance || 0 : church?.current_balance || 0;
    
    if (amount > availableBalance) {
      errors.amount = `Solde insuffisant. Disponible: ${availableBalance} ${church?.currency}`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBillCalculation = (breakdown: BillBreakdown[], total: number) => {
    setNewReport(prev => ({
      ...prev,
      bills_breakdown: breakdown,
      total_calculated: total,
      amount: total.toString(),
    }));
  };

  const handleAddReport = async () => {
    if (!church || !user || !validateReportForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (!permissions.canEditFinances) {
      Alert.alert('Erreur', 'Vous n\'avez pas les permissions pour ajouter des comptes rendus');
      return;
    }

    setSubmitting(true);
    try {
      const finalAmount = newReport.total_calculated > 0 ? newReport.total_calculated : parseFloat(newReport.amount.replace(',', '.'));
      
      const reportData = {
        church_id: church.id,
        amount: finalAmount,
        description: newReport.description.trim(),
        category: newReport.category,
        recorded_by: newReport.recorded_by.trim(),
        payment_method: newReport.payment_method,
        date: newReport.date,
        bills_breakdown: newReport.bills_breakdown,
        total_calculated: newReport.total_calculated,
      };

      console.log('💰 Création du compte rendu...');
      await DatabaseService.createDailyReport(reportData);

      console.log('✅ Compte rendu créé, rafraîchissement des données...');
      
      // Actualiser le contexte église
      await refreshChurch();

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'CREATE_REPORT',
        resource_type: 'DailyReport',
        details: {
          amount: reportData.amount,
          description: reportData.description,
          category: reportData.category,
          payment_method: reportData.payment_method,
          calculated_with_bills: newReport.total_calculated > 0
        }
      });

      setNewReport({
        amount: '',
        description: '',
        category: 'Offrandes',
        recorded_by: '',
        payment_method: 'cash',
        date: new Date().toISOString().split('T')[0],
        bills_breakdown: [],
        total_calculated: 0,
      });
      setFormErrors({});
      setShowReportModal(false);

      // Recharger les données financières
      await loadFinancialData();

      const balanceType = newReport.payment_method === 'bank' ? 'banque' : 'caisse';
      Alert.alert(
        '✅ Compte rendu ajouté!',
        `Montant: ${finalAmount} ${church.currency}\nCatégorie: ${newReport.category}\nAjouté au solde ${balanceType}`
      );
    } catch (error: any) {
      console.error('❌ Erreur ajout compte rendu:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter le compte rendu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async () => {
    if (!church || !user || !validateExpenseForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (!permissions.canEditFinances) {
      Alert.alert('Erreur', 'Vous n\'avez pas les permissions pour ajouter des dépenses');
      return;
    }

    setSubmitting(true);
    try {
      const amount = parseFloat(newExpense.amount.replace(',', '.'));
      const expenseData = {
        church_id: church.id,
        amount,
        description: newExpense.description.trim(),
        category: newExpense.category,
        recorded_by: newExpense.recorded_by.trim(),
        payment_method: newExpense.source === 'bank' ? 'bank' as PaymentMethod : 'cash' as PaymentMethod,
        requires_approval: newExpense.requires_approval || amount > (church.expense_limit || 1000),
        date: newExpense.date,
      };

      console.log('💸 Création de la dépense...');
      await DatabaseService.createExpense(expenseData);

      console.log('✅ Dépense créée, rafraîchissement des données...');
      
      // Actualiser le contexte église
      await refreshChurch();

      // Audit log avec détails de la source
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'CREATE_EXPENSE',
        resource_type: 'Expense',
        details: {
          amount: expenseData.amount,
          description: expenseData.description,
          category: expenseData.category,
          source: newExpense.source,
          requires_approval: expenseData.requires_approval
        }
      });

      setNewExpense({
        amount: '',
        description: '',
        category: 'Général',
        recorded_by: '',
        payment_method: 'cash',
        source: 'cash',
        requires_approval: false,
        date: new Date().toISOString().split('T')[0],
      });
      setFormErrors({});
      setShowExpenseModal(false);

      // Recharger les données financières
      await loadFinancialData();

      const balanceType = newExpense.source === 'bank' ? 'banque' : 'caisse';
      Alert.alert(
        '💸 Dépense enregistrée',
        `Déduit du solde ${balanceType}`
      );
    } catch (error: any) {
      console.error('❌ Erreur ajout dépense:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible d\'ajouter la dépense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveExpense = async (expense: Expense) => {
    if (!church || !user) return;

    if (!permissions.canApproveExpenses) {
      Alert.alert('Erreur', 'Vous n\'avez pas les permissions pour approuver les dépenses');
      return;
    }

    try {
      const result = await DatabaseService.approveExpense(expense.id, `${user.first_name} ${user.last_name}`);
      await loadFinancialData();
      
      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'APPROVE_EXPENSE',
        resource_type: 'Expense',
        resource_id: expense.id,
        details: { 
          amount: expense.amount,
          description: expense.description
        }
      });
      
      Alert.alert('✅ Dépense approuvée', result.message);
    } catch (error: any) {
      Alert.alert('❌ Erreur d\'approbation', error.message || 'Impossible d\'approuver la dépense');
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const methodInfo = paymentMethods.find(m => m.value === method);
    const IconComponent = methodInfo?.icon || Banknote;
    return <IconComponent size={16} color="#7f8c8d" />;
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const methodInfo = paymentMethods.find(m => m.value === method);
    return methodInfo?.label || method;
  };

  if (!church) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Aucune église trouvée</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement des données financières...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête moderne */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <View style={styles.headerTitleRow}>
              <CreditCard size={28} color="white" strokeWidth={2.5} />
              <Text style={styles.title}>Finance</Text>
            </View>
            {financialSummary && (
              <View style={styles.statsRow}>
                <View style={styles.statBadge}>
                  <Text style={styles.statNumber}>{formatCurrency(church.current_balance, church.currency)}</Text>
                  <Text style={styles.statLabel}>Caisse</Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statNumber}>{formatCurrency(church.bank_balance, church.currency)}</Text>
                  <Text style={styles.statLabel}>Banque</Text>
                </View>
              </View>
            )}
          </View>
          {permissions.canCreateReports && (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => setShowReportExporter(true)}
            >
              <Download size={24} color={colors.primary} strokeWidth={3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Résumé financier */}
        {financialSummary && (
          <FinancialSummary
            balance={church.current_balance}
            bankBalance={church.bank_balance}
            totalIncome={financialSummary.totalIncome}
            totalExpenses={financialSummary.totalExpenses}
            pendingExpenses={financialSummary.pendingExpenses}
            currency={church.currency}
          />
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {permissions.canEditFinances && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={() => setShowReportModal(true)}
              >
                <TrendingUp size={20} color="white" />
                <Text style={styles.actionButtonText}>📋 Compte rendu</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={() => setShowExpenseModal(true)}
              >
                <TrendingDown size={20} color="white" />
                <Text style={styles.actionButtonText}>💸 Ajouter dépense</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Comptes rendus récents */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📋 Comptes rendus récents
            </Text>
          </View>
          
          {dailyReports.slice(0, 5).map((report) => (
            <View key={report.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={styles.transactionIcon}>
                {getPaymentMethodIcon(report.payment_method)}
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionDescription, { color: colors.text }]}>
                  {report.description}
                </Text>
                <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                  {new Date(report.date).toLocaleDateString('fr-FR')} •
                  {report.category} • {getPaymentMethodLabel(report.payment_method)} • Par {report.recorded_by}
                  {report.total_calculated && report.total_calculated > 0 && ' • 🧮 Calculé avec billets'}
                </Text>
                {report.bills_breakdown && report.bills_breakdown.length > 0 && (
                  <Text style={[styles.billsBreakdown, { color: colors.textSecondary }]}>
                    💵 Détail: {report.bills_breakdown.filter(b => b.quantity > 0).map(b => `${b.quantity}×${b.bill_label}`).join(', ')}
                  </Text>
                )}
              </View>
              <Text style={[styles.transactionAmount, { color: colors.success }]}>
                +{formatCurrency(Number(report.amount), church.currency)}
              </Text>
            </View>
          ))}
          
          {dailyReports.length === 0 && (
            <View style={styles.emptySection}>
              <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
                Aucun compte rendu enregistré
              </Text>
            </View>
          )}
        </View>

        {/* Dépenses récentes */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <TrendingDown size={20} color={colors.error} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              💸 Dépenses récentes
            </Text>
          </View>
          
          {expenses.slice(0, 5).map((expense) => (
            <View key={expense.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={styles.transactionIcon}>
                {getPaymentMethodIcon(expense.payment_method)}
              </View>
              <View style={styles.transactionInfo}>
                <View style={styles.expenseHeader}>
                  <Text style={[styles.transactionDescription, { color: colors.text }]}>
                    {expense.description}
                  </Text>
                  {!expense.is_approved && permissions.canApproveExpenses && (
                    <TouchableOpacity
                      style={[styles.approveButton, { backgroundColor: colors.success }]}
                      onPress={() => handleApproveExpense(expense)}
                    >
                      <CheckCircle size={12} color="white" />
                      <Text style={styles.approveButtonText}>Approuver</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                  {new Date(expense.date).toLocaleDateString('fr-FR')} • 
                  {expense.category} • {getPaymentMethodLabel(expense.payment_method)} • Par {expense.recorded_by}
                  {!expense.is_approved && ' • ⏳ En attente d\'approbation'}
                </Text>
              </View>
              <View style={styles.expenseAmount}>
                <Text style={[styles.transactionAmount, { color: colors.error }]}>
                  -{formatCurrency(Number(expense.amount), church.currency)}
                </Text>
                {!expense.is_approved && (
                  <Clock size={12} color={colors.warning} />
                )}
              </View>
            </View>
          ))}
          
          {expenses.length === 0 && (
            <View style={styles.emptySection}>
              <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
                Aucune dépense enregistrée
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal ajout compte rendu */}
      {permissions.canEditFinances && (
        <Modal visible={showReportModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>📋 Nouveau compte rendu</Text>
              <TouchableOpacity 
                onPress={handleAddReport}
                disabled={submitting}
              >
                <Text style={[styles.modalSave, { color: colors.primary }]}>
                  {submitting ? 'Ajout...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                {/* Calculateur de billets */}
                <BillCalculator
                  currency={church.currency}
                  onCalculationChange={handleBillCalculation}
                  initialBreakdown={newReport.bills_breakdown}
                />

                {/* Saisie manuelle alternative */}
                <View style={styles.manualEntry}>
                  <Text style={[styles.manualEntryTitle, { color: colors.text }]}>
                    ✏️ Ou saisie manuelle :
                  </Text>
                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      💵 Montant ({church.currency}) *
                    </Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        { borderColor: colors.border, color: colors.text },
                        formErrors.amount && { borderColor: colors.error }
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={newReport.amount}
                      onChangeText={(text) => setNewReport(prev => ({ 
                        ...prev, 
                        amount: text,
                        total_calculated: 0,
                        bills_breakdown: []
                      }))}
                      keyboardType="numeric"
                    />
                    {formErrors.amount && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>
                        {formErrors.amount}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>📝 Description *</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      formErrors.description && { borderColor: colors.error }
                    ]}
                    placeholder="Description du compte rendu"
                    placeholderTextColor={colors.textSecondary}
                    value={newReport.description}
                    onChangeText={(text) => setNewReport(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={3}
                  />
                  {formErrors.description && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {formErrors.description}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>🏷️ Catégorie *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryButtons}>
                      {reportCategories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryButton,
                            { borderColor: colors.border },
                            newReport.category === category && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary
                            }
                          ]}
                          onPress={() => setNewReport(prev => ({ ...prev, category: category as any }))}
                        >
                          <Text style={[
                            styles.categoryButtonText,
                            { color: colors.text },
                            newReport.category === category && { color: 'white' }
                          ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>💳 Destination *</Text>
                  <View style={styles.destinationButtons}>
                    <TouchableOpacity
                      style={[
                        styles.destinationButton,
                        { borderColor: colors.border },
                        newReport.payment_method === 'cash' && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary
                        }
                      ]}
                      onPress={() => setNewReport(prev => ({ ...prev, payment_method: 'cash' }))}
                    >
                      <Banknote size={16} color={newReport.payment_method === 'cash' ? 'white' : colors.textSecondary} />
                      <Text style={[
                        styles.destinationButtonText,
                        { color: colors.text },
                        newReport.payment_method === 'cash' && { color: 'white' }
                      ]}>
                        💰 Caisse
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.destinationButton,
                        { borderColor: colors.border },
                        newReport.payment_method === 'bank' && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary
                        }
                      ]}
                      onPress={() => setNewReport(prev => ({ ...prev, payment_method: 'bank' }))}
                    >
                      <CreditCard size={16} color={newReport.payment_method === 'bank' ? 'white' : colors.textSecondary} />
                      <Text style={[
                        styles.destinationButtonText,
                        { color: colors.text },
                        newReport.payment_method === 'bank' && { color: 'white' }
                      ]}>
                        🏦 Banque
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>👤 Enregistré par *</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      formErrors.recorded_by && { borderColor: colors.error }
                    ]}
                    placeholder="Nom de la personne"
                    placeholderTextColor={colors.textSecondary}
                    value={newReport.recorded_by}
                    onChangeText={(text) => setNewReport(prev => ({ ...prev, recorded_by: text }))}
                  />
                  {formErrors.recorded_by && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {formErrors.recorded_by}
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Modal ajout dépense */}
      {permissions.canEditFinances && (
        <Modal visible={showExpenseModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>💸 Nouvelle dépense</Text>
              <TouchableOpacity 
                onPress={handleAddExpense}
                disabled={submitting}
              >
                <Text style={[styles.modalSave, { color: colors.primary }]}>
                  {submitting ? 'Ajout...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    💵 Montant ({church.currency}) *
                  </Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      formErrors.amount && { borderColor: colors.error }
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={newExpense.amount}
                    onChangeText={(text) => setNewExpense(prev => ({ ...prev, amount: text }))}
                    keyboardType="numeric"
                  />
                  {formErrors.amount && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {formErrors.amount}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>📝 Description *</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      formErrors.description && { borderColor: colors.error }
                    ]}
                    placeholder="Description de la dépense"
                    placeholderTextColor={colors.textSecondary}
                    value={newExpense.description}
                    onChangeText={(text) => setNewExpense(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={3}
                  />
                  {formErrors.description && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {formErrors.description}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>🏷️ Catégorie</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryButtons}>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryButton,
                            { borderColor: colors.border },
                            newExpense.category === category && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary
                            }
                          ]}
                          onPress={() => setNewExpense(prev => ({ ...prev, category }))}
                        >
                          <Text style={[
                            styles.categoryButtonText,
                            { color: colors.text },
                            newExpense.category === category && { color: 'white' }
                          ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>🏦 Source de la dépense *</Text>
                  <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    Choisissez d'où sera prélevé le montant
                  </Text>
                  <View style={styles.sourceButtons}>
                    <TouchableOpacity
                      style={[
                        styles.sourceButton,
                        { borderColor: colors.border },
                        newExpense.source === 'cash' && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary
                        }
                      ]}
                      onPress={() => setNewExpense(prev => ({ ...prev, source: 'cash', payment_method: 'cash' }))}
                    >
                      <Banknote size={16} color={newExpense.source === 'cash' ? 'white' : colors.textSecondary} />
                      <View style={styles.sourceInfo}>
                        <Text style={[
                          styles.sourceButtonText,
                          { color: colors.text },
                          newExpense.source === 'cash' && { color: 'white' }
                        ]}>
                          💰 Caisse principale
                        </Text>
                        <Text style={[
                          styles.sourceBalance,
                          { color: colors.textSecondary },
                          newExpense.source === 'cash' && { color: 'rgba(255,255,255,0.8)' }
                        ]}>
                          Disponible: {formatCurrency(church.current_balance, church.currency)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.sourceButton,
                        { borderColor: colors.border },
                        newExpense.source === 'bank' && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary
                        }
                      ]}
                      onPress={() => setNewExpense(prev => ({ ...prev, source: 'bank', payment_method: 'bank' }))}
                    >
                      <CreditCard size={16} color={newExpense.source === 'bank' ? 'white' : colors.textSecondary} />
                      <View style={styles.sourceInfo}>
                        <Text style={[
                          styles.sourceButtonText,
                          { color: colors.text },
                          newExpense.source === 'bank' && { color: 'white' }
                        ]}>
                          🏦 Compte banque
                        </Text>
                        <Text style={[
                          styles.sourceBalance,
                          { color: colors.textSecondary },
                          newExpense.source === 'bank' && { color: 'rgba(255,255,255,0.8)' }
                        ]}>
                          Disponible: {formatCurrency(church.bank_balance, church.currency)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>👤 Enregistré par *</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      formErrors.recorded_by && { borderColor: colors.error }
                    ]}
                    placeholder="Nom de la personne"
                    placeholderTextColor={colors.textSecondary}
                    value={newExpense.recorded_by}
                    onChangeText={(text) => setNewExpense(prev => ({ ...prev, recorded_by: text }))}
                  />
                  {formErrors.recorded_by && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {formErrors.recorded_by}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>📅 Date *</Text>
                  <TextInput
                    style={[styles.fieldInput, { borderColor: colors.border, color: colors.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    value={newExpense.date}
                    onChangeText={(text) => setNewExpense(prev => ({ ...prev, date: text }))}
                  />
                </View>

                <View style={styles.approvalContainer}>
                  <View style={styles.approvalToggle}>
                    <Switch
                      value={newExpense.requires_approval}
                      onValueChange={(value) => setNewExpense(prev => ({ 
                        ...prev, 
                        requires_approval: value 
                      }))}
                      trackColor={{ false: '#f4f3f4', true: colors.primary }}
                      thumbColor={newExpense.requires_approval ? '#f5dd4b' : '#f4f3f4'}
                    />
                    <Text style={[styles.approvalText, { color: colors.text }]}>
                      ⏳ Nécessite une approbation
                    </Text>
                  </View>
                  <Text style={[styles.approvalHelp, { color: colors.textSecondary }]}>
                    💡 Les dépenses supérieures à {church.expense_limit} {church.currency} nécessitent automatiquement une approbation
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Modal d'export de rapports */}
      {permissions.canCreateReports && (
        <ReportExporter
          visible={showReportExporter}
          onClose={() => setShowReportExporter(false)}
          church={church}
          reports={dailyReports}
          expenses={expenses}
          members={[]}
          archives={[]}
          period="Période actuelle"
          reportType="financial"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  exportButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  transactionDate: {
    fontSize: 12,
  },
  billsBreakdown: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptySectionText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  manualEntry: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  manualEntryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  fieldHelp: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  destinationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  destinationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  destinationButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sourceButtons: {
    gap: 12,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  sourceBalance: {
    fontSize: 12,
  },
  approvalContainer: {
    marginTop: 8,
  },
  approvalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  approvalText: {
    fontSize: 14,
    fontWeight: '500',
  },
  approvalHelp: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
}); 