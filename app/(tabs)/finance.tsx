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
import { Plus, TrendingUp, CircleCheck as CheckCircle, Clock, X, CreditCard, Banknote, Smartphone, FileText, Download, ChevronDown } from 'lucide-react-native';
import { useChurch } from '../../contexts/ChurchContext';
import { DatabaseService } from '../../lib/database';
import { ValidationService } from '../../utils/validation';
import { FinancialSummary } from '../../components/FinancialSummary';
import { BillCalculator } from '../../components/BillCalculator';
import { ReportExporter } from '../../components/ReportExporter';
import { getThemeColors } from '../../lib/theme';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import type { DailyReport, Expense, FinancialSummary as FinancialSummaryType, PaymentMethod, BillBreakdown } from '../../types/database';

// ✅ Composant local pour la flèche vers le bas (évite le conflit de nom avec l'import)
const TrendingDownIcon = ({ size, color }: { size: number; color: string }) => (
  <TrendingUp size={size} color={color} style={{ transform: [{ rotate: '180deg' }] }} />
);

export default function FinanceScreen() {
  const { church, user, permissions, refreshChurch } = useChurch();
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // État pour le filtre de devise
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'FC' | 'USD' | 'EURO'>('all');
  
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
    currency: 'FC' as 'FC' | 'USD' | 'EURO',
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
    currency: 'FC' as 'FC' | 'USD' | 'EURO',
    source: 'cash' as 'cash' | 'bank',
    requires_approval: false,
    date: new Date().toISOString().split('T')[0],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const theme = church?.theme || 'blue';
  const colors = getThemeColors(theme);

  // MONTANT LIMITE D'APPROBATION FIXE - NE PEUT PAS ÊTRE MODIFIÉ
  const APPROVAL_LIMIT = 10000000000;

  const paymentMethods: { value: PaymentMethod; label: string; icon: any; description: string }[] = [
    { value: 'cash', label: 'Caisse', icon: Banknote, description: 'Argent liquide' },
    { value: 'bank', label: 'Banque', icon: CreditCard, description: 'Compte bancaire' },
    { value: 'mpesa', label: 'M-Pesa', icon: Smartphone, description: 'Paiement mobile' },
    { value: 'orange_money', label: 'Orange Money', icon: Smartphone, description: 'Paiement mobile' },
    { value: 'airtel_money', label: 'Airtel Money', icon: Smartphone, description: 'Paiement mobile' },
    { value: 'afrimoney', label: 'Afrimoney', icon: Smartphone, description: 'Paiement mobile' },
  ];

  const currencies = [
    { value: 'FC', label: 'Francs Congolais (FC)', symbol: 'FC' },
    { value: 'USD', label: 'Dollars US (USD)', symbol: '$' },
    { value: 'EURO', label: 'Euros (EURO)', symbol: '€' },
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
      console.log('📊 Chargement données financières...');
      
      const reportsData = await DatabaseService.getDailyReports(church.id);
      const expensesData = await DatabaseService.getExpenses(church.id);
      const summaryData = await DatabaseService.getFinancialSummary(church.id);
      
      const safeReports = Array.isArray(reportsData) ? reportsData : [];
      const safeExpenses = Array.isArray(expensesData) ? expensesData : [];
      
      console.log(`📋 ${safeReports.length} rapports chargés`);
      console.log(`💸 ${safeExpenses.length} dépenses chargées`);

      setDailyReports(safeReports);
      setExpenses(safeExpenses);
      setFinancialSummary(summaryData || null);
      
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
    
    const amount = parseFloat(newExpense.amount.replace(',', '.')) || 0;
    
    if (amount <= 0) {
      errors.amount = 'Le montant doit être positif';
    }
    
    const descriptionValidation = ValidationService.validateDescription(newExpense.description);
    if (!descriptionValidation.isValid) {
      errors.description = descriptionValidation.error!;
    }
    
    if (!newExpense.recorded_by.trim()) {
      errors.recorded_by = 'Le nom de l\'enregistreur est obligatoire';
    }

    // Validation du solde disponible pour la devise spécifique
    let availableBalance = 0;
    
    if (newExpense.source === 'bank') {
      switch (newExpense.currency) {
        case 'FC': availableBalance = church?.bank_balance_fc || 0; break;
        case 'USD': availableBalance = church?.bank_balance_usd || 0; break;
        case 'EURO': availableBalance = church?.bank_balance_euro || 0; break;
      }
    } else {
      switch (newExpense.currency) {
        case 'FC': availableBalance = church?.current_balance_fc || 0; break;
        case 'USD': availableBalance = church?.current_balance_usd || 0; break;
        case 'EURO': availableBalance = church?.current_balance_euro || 0; break;
      }
    }
    
    if (amount > availableBalance) {
      errors.amount = `Solde ${newExpense.currency} insuffisant. Disponible: ${formatCurrency(availableBalance, newExpense.currency)}`;
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
      
      // 1️⃣ CRÉER LE COMPTE RENDU D'ABORD
      const reportData = {
        church_id: church.id,
        amount: finalAmount,
        description: newReport.description.trim(),
        category: newReport.category,
        recorded_by: newReport.recorded_by.trim(),
        payment_method: newReport.payment_method,
        currency: newReport.currency,
        date: newReport.date,
        bills_breakdown: newReport.bills_breakdown,
        total_calculated: newReport.total_calculated,
      };

      console.log(`📝 Création du compte rendu: +${finalAmount} ${newReport.currency} vers ${newReport.payment_method === 'bank' ? 'banque' : 'caisse'}`);
      
      const createdReport = await DatabaseService.createDailyReport(reportData);
      
      // 2️⃣ METTRE À JOUR LE SOLDE DE L'ÉGLISE
      let updateData: any = {};
      
      if (newReport.payment_method === 'bank') {
        // Ajout au solde banque
        switch (newReport.currency) {
          case 'FC':
            updateData.bank_balance_fc = (church.bank_balance_fc || 0) + finalAmount;
            break;
          case 'USD':
            updateData.bank_balance_usd = (church.bank_balance_usd || 0) + finalAmount;
            break;
          case 'EURO':
            updateData.bank_balance_euro = (church.bank_balance_euro || 0) + finalAmount;
            break;
        }
      } else {
        // Ajout au solde caisse
        switch (newReport.currency) {
          case 'FC':
            updateData.current_balance_fc = (church.current_balance_fc || 0) + finalAmount;
            break;
          case 'USD':
            updateData.current_balance_usd = (church.current_balance_usd || 0) + finalAmount;
            break;
          case 'EURO':
            updateData.current_balance_euro = (church.current_balance_euro || 0) + finalAmount;
            break;
        }
      }

      await DatabaseService.updateChurch(church.id, updateData);

      // 3️⃣ AUDIT LOG
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'CREATE_REPORT',
        resource_type: 'DailyReport',
        resource_id: createdReport.id,
        details: {
          amount: finalAmount,
          description: reportData.description,
          category: reportData.category,
          currency: reportData.currency,
          destination: newReport.payment_method,
          calculated_with_bills: newReport.total_calculated > 0
        }
      });

      // 4️⃣ METTRE À JOUR LE CONTEXTE ET LES DONNÉES LOCALES
      await refreshChurch();
      await loadFinancialData(); // Recharger pour avoir la nouvelle liste

      // 5️⃣ RÉINITIALISER LE FORMULAIRE
      setNewReport({
        amount: '',
        description: '',
        category: 'Offrandes',
        recorded_by: '',
        payment_method: 'cash',
        currency: church.currency as 'FC' | 'USD' | 'EURO',
        date: new Date().toISOString().split('T')[0],
        bills_breakdown: [],
        total_calculated: 0,
      });
      setFormErrors({});
      setShowReportModal(false);

      const destination = newReport.payment_method === 'bank' ? 'banque' : 'caisse';
      Alert.alert(
        '✅ Compte rendu ajouté',
        `+${formatCurrency(finalAmount, newReport.currency)} ajouté à la ${destination} en ${newReport.currency}`
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
      
      // Vérification automatique de l'approbation
      const requiresApproval = amount > APPROVAL_LIMIT || newExpense.requires_approval;
      
      if (amount > APPROVAL_LIMIT) {
        Alert.alert(
          '⚠️ Approbation requise',
          `Cette dépense de ${formatCurrency(amount, newExpense.currency)} dépasse la limite d'approbation.`
        );
      }

      // 1️⃣ CRÉER LA DÉPENSE
      const expenseData = {
        church_id: church.id,
        amount,
        description: newExpense.description.trim(),
        category: newExpense.category,
        recorded_by: newExpense.recorded_by.trim(),
        payment_method: newExpense.source === 'bank' ? 'bank' as PaymentMethod : 'cash' as PaymentMethod,
        currency: newExpense.currency,
        requires_approval: requiresApproval,
        date: newExpense.date,
      };

      console.log(`💸 Création de la dépense: -${amount} ${newExpense.currency} depuis ${newExpense.source}`);
      
      const createdExpense = await DatabaseService.createExpense(expenseData);
      
      // 2️⃣ METTRE À JOUR LE SOLDE SEULEMENT SI APPROBATION NON REQUISE
      if (!requiresApproval) {
        let updateData: any = {};
        
        if (newExpense.source === 'bank') {
          switch (newExpense.currency) {
            case 'FC':
              updateData.bank_balance_fc = Math.max(0, (church.bank_balance_fc || 0) - amount);
              break;
            case 'USD':
              updateData.bank_balance_usd = Math.max(0, (church.bank_balance_usd || 0) - amount);
              break;
            case 'EURO':
              updateData.bank_balance_euro = Math.max(0, (church.bank_balance_euro || 0) - amount);
              break;
          }
        } else {
          switch (newExpense.currency) {
            case 'FC':
              updateData.current_balance_fc = Math.max(0, (church.current_balance_fc || 0) - amount);
              break;
            case 'USD':
              updateData.current_balance_usd = Math.max(0, (church.current_balance_usd || 0) - amount);
              break;
            case 'EURO':
              updateData.current_balance_euro = Math.max(0, (church.current_balance_euro || 0) - amount);
              break;
          }
        }

        await DatabaseService.updateChurch(church.id, updateData);
      }

      // 3️⃣ AUDIT LOG
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'CREATE_EXPENSE',
        resource_type: 'Expense',
        resource_id: createdExpense.id,
        details: {
          amount,
          description: expenseData.description,
          category: expenseData.category,
          currency: expenseData.currency,
          source: newExpense.source,
          requires_approval
        }
      });

      // 4️⃣ METTRE À JOUR LE CONTEXTE ET LES DONNÉES LOCALES
      if (!requiresApproval) {
        await refreshChurch();
      }
      await loadFinancialData(); // Recharger pour avoir la nouvelle liste

      // 5️⃣ RÉINITIALISER LE FORMULAIRE
      setNewExpense({
        amount: '',
        description: '',
        category: 'Général',
        recorded_by: '',
        payment_method: 'cash',
        currency: church.currency as 'FC' | 'USD' | 'EURO',
        source: 'cash',
        requires_approval: false,
        date: new Date().toISOString().split('T')[0],
      });
      setFormErrors({});
      setShowExpenseModal(false);

      const message = requiresApproval 
        ? `Dépense en attente d'approbation`
        : `-${formatCurrency(amount, newExpense.currency)} déduit de la ${newExpense.source === 'bank' ? 'banque' : 'caisse'}`;
      
      Alert.alert(
        requiresApproval ? '⏳ En attente' : '✅ Dépense enregistrée',
        message
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
      // 1️⃣ VÉRIFIER LE SOLDE DISPONIBLE
      let availableBalance = 0;
      if (expense.payment_method === 'bank') {
        switch (expense.currency) {
          case 'FC': availableBalance = church.bank_balance_fc || 0; break;
          case 'USD': availableBalance = church.bank_balance_usd || 0; break;
          case 'EURO': availableBalance = church.bank_balance_euro || 0; break;
        }
      } else {
        switch (expense.currency) {
          case 'FC': availableBalance = church.current_balance_fc || 0; break;
          case 'USD': availableBalance = church.current_balance_usd || 0; break;
          case 'EURO': availableBalance = church.current_balance_euro || 0; break;
        }
      }

      if (expense.amount > availableBalance) {
        Alert.alert(
          '❌ Solde insuffisant',
          `Solde ${expense.currency} disponible: ${formatCurrency(availableBalance, expense.currency)}`
        );
        return;
      }

      // 2️⃣ CONFIRMATION SI DÉPASSE LA LIMITE
      if (expense.amount > APPROVAL_LIMIT) {
        Alert.alert(
          '⚠️ Confirmation',
          `Cette dépense de ${formatCurrency(expense.amount, expense.currency)} dépasse la limite d'approbation.\n\nConfirmer l'approbation ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Approuver', onPress: () => approveExpense(expense) }
          ]
        );
      } else {
        await approveExpense(expense);
      }
    } catch (error: any) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const approveExpense = async (expense: Expense) => {
    try {
      // 1️⃣ METTRE À JOUR LE SOLDE
      let updateData: any = {};
      
      if (expense.payment_method === 'bank') {
        switch (expense.currency) {
          case 'FC':
            updateData.bank_balance_fc = Math.max(0, (church!.bank_balance_fc || 0) - expense.amount);
            break;
          case 'USD':
            updateData.bank_balance_usd = Math.max(0, (church!.bank_balance_usd || 0) - expense.amount);
            break;
          case 'EURO':
            updateData.bank_balance_euro = Math.max(0, (church!.bank_balance_euro || 0) - expense.amount);
            break;
        }
      } else {
        switch (expense.currency) {
          case 'FC':
            updateData.current_balance_fc = Math.max(0, (church!.current_balance_fc || 0) - expense.amount);
            break;
          case 'USD':
            updateData.current_balance_usd = Math.max(0, (church!.current_balance_usd || 0) - expense.amount);
            break;
          case 'EURO':
            updateData.current_balance_euro = Math.max(0, (church!.current_balance_euro || 0) - expense.amount);
            break;
        }
      }

      // 2️⃣ METTRE À JOUR L'ÉGLISE ET APPROUVER LA DÉPENSE
      await Promise.all([
        DatabaseService.updateChurch(church!.id, updateData),
        DatabaseService.approveExpense(expense.id, `${user!.first_name} ${user!.last_name}`)
      ]);

      // 3️⃣ AUDIT LOG
      await DatabaseService.createAuditLogEntry({
        church_id: church!.id,
        user_id: user!.id,
        action: 'APPROVE_EXPENSE',
        resource_type: 'Expense',
        resource_id: expense.id,
        details: { 
          amount: expense.amount,
          currency: expense.currency,
          description: expense.description
        }
      });

      // 4️⃣ METTRE À JOUR LES DONNÉES
      await refreshChurch();
      await loadFinancialData();
      
      Alert.alert(
        '✅ Dépense approuvée',
        `-${formatCurrency(expense.amount, expense.currency)} déduit`
      );

    } catch (error: any) {
      Alert.alert('❌ Erreur', error.message);
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

  // Filtrer les transactions par devise
  const filterTransactionsByCurrency = <T extends { currency?: string }>(transactions: T[]) => {
    if (!Array.isArray(transactions)) return [];
    if (currencyFilter === 'all') return transactions;
    return transactions.filter(t => t.currency === currencyFilter);
  };

  // Soldes par devise
  const cashBalances = [
    { currency: 'FC', amount: church?.current_balance_fc || 0, label: '💰 Caisse FC' },
    { currency: 'USD', amount: church?.current_balance_usd || 0, label: '💵 Caisse USD' },
    { currency: 'EURO', amount: church?.current_balance_euro || 0, label: '💶 Caisse EURO' }
  ];

  const bankBalances = [
    { currency: 'FC', amount: church?.bank_balance_fc || 0, label: '🏦 Banque FC' },
    { currency: 'USD', amount: church?.bank_balance_usd || 0, label: '🏦 Banque USD' },
    { currency: 'EURO', amount: church?.bank_balance_euro || 0, label: '🏦 Banque EURO' }
  ];

  // Transactions filtrées
  const filteredReports = filterTransactionsByCurrency(dailyReports);
  const filteredExpenses = filterTransactionsByCurrency(expenses);

  // Toutes les transactions pour les activités récentes
  const allTransactions = [
    ...filteredReports.map(report => ({
      id: `report-${report.id}`,
      type: 'report' as const,
      ...report,
      date: report.date ? new Date(report.date) : new Date(),
      amount: Number(report.amount) || 0,
    })),
    ...filteredExpenses.map(expense => ({
      id: `expense-${expense.id}`,
      type: 'expense' as const,
      ...expense,
      date: expense.date ? new Date(expense.date) : new Date(),
      amount: Number(expense.amount) || 0,
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

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
      {/* En-tête */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <View style={styles.headerTitleRow}>
              <CreditCard size={28} color="white" strokeWidth={2.5} />
              <Text style={styles.title}>Finance</Text>
            </View>
            
            {/* Filtre de devise */}
            <View style={styles.currencyFilterContainer}>
              <Text style={styles.filterLabel}>Filtrer par devise:</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    currencyFilter === 'all' && styles.filterButtonActive
                  ]}
                  onPress={() => setCurrencyFilter('all')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    currencyFilter === 'all' && styles.filterButtonTextActive
                  ]}>Toutes</Text>
                </TouchableOpacity>
                {currencies.map(currency => (
                  <TouchableOpacity
                    key={currency.value}
                    style={[
                      styles.filterButton,
                      currencyFilter === currency.value && styles.filterButtonActive
                    ]}
                    onPress={() => setCurrencyFilter(currency.value as any)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      currencyFilter === currency.value && styles.filterButtonTextActive
                    ]}>{currency.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
        {/* Soldes multi-devises */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📊 Soldes Multi-Devises
            </Text>
          </View>

          {/* Caisse */}
          <View style={styles.balanceSection}>
            <Text style={[styles.balanceSectionTitle, { color: colors.textSecondary }]}>
              💰 Caisse
            </Text>
            {cashBalances.map((balance) => (
              <View key={`cash-${balance.currency}`} style={styles.balanceItem}>
                <Text style={[styles.balanceLabel, { color: colors.text }]}>
                  {balance.label}
                  {balance.currency === church.currency && (
                    <Text style={styles.primaryCurrencyBadge}> ⭐ Principale</Text>
                  )}
                </Text>
                <Text style={[
                  styles.balanceAmount, 
                  { color: balance.amount > 0 ? colors.success : colors.textSecondary }
                ]}>
                  {formatCurrency(balance.amount, balance.currency as any)}
                </Text>
              </View>
            ))}
          </View>

          {/* Banque */}
          <View style={styles.balanceSection}>
            <Text style={[styles.balanceSectionTitle, { color: colors.textSecondary }]}>
              🏦 Banque
            </Text>
            {bankBalances.map((balance) => (
              <View key={`bank-${balance.currency}`} style={styles.balanceItem}>
                <Text style={[styles.balanceLabel, { color: colors.text }]}>
                  {balance.label}
                  {balance.currency === church.currency && (
                    <Text style={styles.primaryCurrencyBadge}> ⭐ Principale</Text>
                  )}
                </Text>
                <Text style={[
                  styles.balanceAmount, 
                  { color: balance.amount > 0 ? colors.success : colors.textSecondary }
                ]}>
                  {formatCurrency(balance.amount, balance.currency as any)}
                </Text>
              </View>
            ))}
          </View>
        </View>

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
                <TrendingDownIcon size={20} color="white" />
                <Text style={styles.actionButtonText}>💸 Ajouter dépense</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Activités récentes */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📊 Activités Récentes
              {currencyFilter !== 'all' && ` (${currencyFilter})`}
            </Text>
          </View>
          
          {allTransactions.map((transaction) => (
            <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={[
                styles.transactionIcon,
                transaction.type === 'report' ? { backgroundColor: '#e8f6ef' } : { backgroundColor: '#fdeaea' }
              ]}>
                {transaction.type === 'report' ? 
                  <TrendingUp size={16} color="#27ae60" /> : 
                  <TrendingDownIcon size={16} color="#e74c3c" />
                }
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionDescription, { color: colors.text }]}>
                  {transaction.description}
                </Text>
                <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                  {transaction.date.toLocaleDateString('fr-FR')} • 
                  {transaction.type === 'report' ? ' 📋 Compte rendu' : ' 💸 Dépense'} • 
                  <Text style={{ 
                    color: transaction.currency === 'FC' ? '#27ae60' : 
                           transaction.currency === 'USD' ? '#2980b9' : '#8e44ad',
                    fontWeight: 'bold'
                  }}>
                    {' '}{transaction.currency}
                  </Text> • Par {transaction.recorded_by}
                  {transaction.type === 'expense' && !transaction.is_approved && ' • ⏳ En attente'}
                </Text>
                {transaction.type === 'report' && transaction.bills_breakdown?.length > 0 && (
                  <Text style={[styles.billsBreakdown, { color: colors.textSecondary }]}>
                    💵 Détail: {transaction.bills_breakdown.filter(b => b?.quantity > 0).map(b => `${b.quantity}×${b.bill_label}`).join(', ')}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.transactionAmount,
                transaction.type === 'report' ? { color: colors.success } : { color: colors.error }
              ]}>
                {transaction.type === 'report' ? '+' : '-'}
                {formatCurrency(transaction.amount, transaction.currency as any)}
              </Text>
            </View>
          ))}
          
          {allTransactions.length === 0 && (
            <View style={styles.emptySection}>
              <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
                Aucune activité récente
              </Text>
            </View>
          )}
        </View>

        {/* Comptes rendus récents */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📋 Comptes rendus récents
              {currencyFilter !== 'all' && ` (${currencyFilter})`}
            </Text>
          </View>
          
          {filteredReports.slice(0, 5).map((report) => (
            <View key={report.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.transactionIcon, { backgroundColor: '#e8f6ef' }]}>
                <TrendingUp size={16} color="#27ae60" />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionDescription, { color: colors.text }]}>
                  {report.description}
                </Text>
                <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                  {new Date(report.date).toLocaleDateString('fr-FR')} • {report.category} • 
                  <Text style={{ 
                    color: report.currency === 'FC' ? '#27ae60' : 
                           report.currency === 'USD' ? '#2980b9' : '#8e44ad',
                    fontWeight: 'bold'
                  }}> {report.currency}</Text> • Par {report.recorded_by}
                </Text>
                {report.bills_breakdown?.length > 0 && (
                  <Text style={[styles.billsBreakdown, { color: colors.textSecondary }]}>
                    💵 {report.bills_breakdown.filter(b => b?.quantity > 0).map(b => `${b.quantity}×${b.bill_label}`).join(', ')}
                  </Text>
                )}
              </View>
              <Text style={[styles.transactionAmount, { color: colors.success }]}>
                +{formatCurrency(report.amount, report.currency as any)}
              </Text>
            </View>
          ))}
          
          {filteredReports.length === 0 && (
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
            <TrendingDownIcon size={20} color={colors.error} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              💸 Dépenses récentes
              {currencyFilter !== 'all' && ` (${currencyFilter})`}
            </Text>
          </View>
          
          {filteredExpenses.slice(0, 5).map((expense) => (
            <View key={expense.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.transactionIcon, { backgroundColor: '#fdeaea' }]}>
                <TrendingDownIcon size={16} color="#e74c3c" />
              </View>
              <View style={styles.transactionInfo}>
                <View style={styles.expenseHeader}>
                  <Text style={[styles.transactionDescription, { color: colors.text, flex: 1 }]}>
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
                  {new Date(expense.date).toLocaleDateString('fr-FR')} • {expense.category} • 
                  <Text style={{ 
                    color: expense.currency === 'FC' ? '#27ae60' : 
                           expense.currency === 'USD' ? '#2980b9' : '#8e44ad',
                    fontWeight: 'bold'
                  }}> {expense.currency}</Text> • Par {expense.recorded_by}
                  {!expense.is_approved && ' • ⏳ En attente'}
                </Text>
              </View>
              <View style={styles.expenseAmount}>
                <Text style={[styles.transactionAmount, { color: colors.error }]}>
                  -{formatCurrency(expense.amount, expense.currency as any)}
                </Text>
                {!expense.is_approved && (
                  <Clock size={12} color={colors.warning} />
                )}
              </View>
            </View>
          ))}
          
          {filteredExpenses.length === 0 && (
            <View style={styles.emptySection}>
              <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
                Aucune dépense enregistrée
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL COMPTE RENDU */}
      {permissions.canEditFinances && (
        <Modal visible={showReportModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>📋 Nouveau compte rendu</Text>
              <TouchableOpacity onPress={handleAddReport} disabled={submitting}>
                <Text style={[styles.modalSave, { color: colors.primary }]}>
                  {submitting ? 'Ajout...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                {/* Devise */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>💱 Devise *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryButtons}>
                      {currencies.map((currency) => (
                        <TouchableOpacity
                          key={currency.value}
                          style={[
                            styles.categoryButton,
                            { borderColor: colors.border },
                            newReport.currency === currency.value && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary
                            }
                          ]}
                          onPress={() => setNewReport(prev => ({ ...prev, currency: currency.value as any }))}
                        >
                          <Text style={[
                            styles.categoryButtonText,
                            { color: colors.text },
                            newReport.currency === currency.value && { color: 'white' }
                          ]}>
                            {currency.value === church.currency ? '⭐ ' : ''}{currency.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Calculateur de billets */}
                <BillCalculator
                  currency={newReport.currency}
                  onCalculationChange={handleBillCalculation}
                  initialBreakdown={newReport.bills_breakdown}
                />

                {/* Montant manuel */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    💵 Montant ({newReport.currency}) *
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

                {/* Description */}
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

                {/* Catégorie */}
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

                {/* Destination */}
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

                {/* Enregistré par */}
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

      {/* MODAL DÉPENSE */}
      {permissions.canEditFinances && (
        <Modal visible={showExpenseModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>💸 Nouvelle dépense</Text>
              <TouchableOpacity onPress={handleAddExpense} disabled={submitting}>
                <Text style={[styles.modalSave, { color: colors.primary }]}>
                  {submitting ? 'Ajout...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                {/* Limite d'approbation */}
                <View style={styles.approvalLimitContainer}>
                  <View style={styles.approvalLimitBadge}>
                    <Text style={styles.approvalLimitIcon}>⚠️</Text>
                    <View style={styles.approvalLimitText}>
                      <Text style={[styles.approvalLimitTitle, { color: colors.warning }]}>
                        LIMITE D'APPROBATION
                      </Text>
                      <Text style={[styles.approvalLimitAmount, { color: colors.text }]}>
                        {formatCurrency(APPROVAL_LIMIT, church.currency as any)}
                      </Text>
                      <Text style={[styles.approvalLimitNote, { color: colors.textSecondary }]}>
                        Les dépenses supérieures nécessitent une approbation
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Devise */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>💱 Devise *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryButtons}>
                      {currencies.map((currency) => (
                        <TouchableOpacity
                          key={currency.value}
                          style={[
                            styles.categoryButton,
                            { borderColor: colors.border },
                            newExpense.currency === currency.value && {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary
                            }
                          ]}
                          onPress={() => setNewExpense(prev => ({ ...prev, currency: currency.value as any }))}
                        >
                          <Text style={[
                            styles.categoryButtonText,
                            { color: colors.text },
                            newExpense.currency === currency.value && { color: 'white' }
                          ]}>
                            {currency.value === church.currency ? '⭐ ' : ''}{currency.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Montant */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    💵 Montant ({newExpense.currency}) *
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
                    onChangeText={(text) => {
                      const amount = parseFloat(text.replace(',', '.')) || 0;
                      setNewExpense(prev => ({ 
                        ...prev, 
                        amount: text,
                        requires_approval: amount > APPROVAL_LIMIT || prev.requires_approval
                      }));
                    }}
                    keyboardType="numeric"
                  />
                  {formErrors.amount && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {formErrors.amount}
                    </Text>
                  )}
                  
                  {parseFloat(newExpense.amount) > APPROVAL_LIMIT && (
                    <View style={styles.limitWarning}>
                      <Text style={[styles.limitWarningText, { color: colors.warning }]}>
                        ⚠️ Dépasse la limite d'approbation
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description */}
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

                {/* Catégorie */}
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

                {/* Source */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>🏦 Source *</Text>
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
                          💰 Caisse
                        </Text>
                        <Text style={[
                          styles.sourceBalance,
                          { color: colors.textSecondary },
                          newExpense.source === 'cash' && { color: 'rgba(255,255,255,0.8)' }
                        ]}>
                          {formatCurrency(
                            newExpense.currency === 'FC' ? (church?.current_balance_fc || 0) :
                            newExpense.currency === 'USD' ? (church?.current_balance_usd || 0) :
                            (church?.current_balance_euro || 0),
                            newExpense.currency
                          )}
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
                          🏦 Banque
                        </Text>
                        <Text style={[
                          styles.sourceBalance,
                          { color: colors.textSecondary },
                          newExpense.source === 'bank' && { color: 'rgba(255,255,255,0.8)' }
                        ]}>
                          {formatCurrency(
                            newExpense.currency === 'FC' ? (church?.bank_balance_fc || 0) :
                            newExpense.currency === 'USD' ? (church?.bank_balance_usd || 0) :
                            (church?.bank_balance_euro || 0),
                            newExpense.currency
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Enregistré par */}
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

                {/* Date */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>📅 Date</Text>
                  <TextInput
                    style={[styles.fieldInput, { borderColor: colors.border, color: colors.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    value={newExpense.date}
                    onChangeText={(text) => setNewExpense(prev => ({ ...prev, date: text }))}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Export */}
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
  currencyFilterContainer: {
    marginTop: 12,
  },
  filterLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'white',
  },
  filterButtonText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
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
  balanceSection: {
    marginBottom: 16,
  },
  balanceSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  primaryCurrencyBadge: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  balanceLabel: {
    fontSize: 14,
    flex: 1,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
    marginTop: 20,
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
  approvalLimitContainer: {
    marginBottom: 20,
  },
  approvalLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbf0',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0c419',
  },
  approvalLimitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  approvalLimitText: {
    flex: 1,
  },
  approvalLimitTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  approvalLimitAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  approvalLimitNote: {
    fontSize: 11,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
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
  limitWarning: {
    backgroundColor: '#fffbf0',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f0c419',
  },
  limitWarningText: {
    fontSize: 12,
    fontWeight: '500',
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
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  destinationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sourceButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12, 
    gap: 12,
    borderWidth: 1,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sourceBalance: {
    fontSize: 12,
    marginTop: 4,
  },
});