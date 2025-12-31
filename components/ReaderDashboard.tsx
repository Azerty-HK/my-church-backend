import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Download,
  Eye,
  AlertCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DatabaseService } from '../lib/database';
import { formatCurrency } from '../utils/currency';
import { LineChart } from 'react-native-chart-kit';
import { EventsViewer } from './EventsViewer';
import type { Church, DailyReport, Expense } from '../types/database';

interface ReaderDashboardProps {
  church: Church;
  onRefresh?: () => void;
}

export function ReaderDashboard({ church, onRefresh }: ReaderDashboardProps) {
  const router = useRouter();
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Couleurs Lecteur : Bleu clair (consultation)
  const colors = {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    success: '#10B981',
    error: '#EF4444',
    info: '#0EA5E9',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    border: '#ecf0f1',
  };

  useEffect(() => {
    loadData();
  }, [church]);

  const loadData = async () => {
    try {
      const [reports, expensesList] = await Promise.all([
        DatabaseService.getDailyReports(church.id),
        DatabaseService.getExpenses(church.id),
      ]);
      setDailyReports(reports);
      setExpenses(expensesList);
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (onRefresh) onRefresh();
    setRefreshing(false);
  };

  // Calculs statistiques du mois en cours
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyReports = dailyReports.filter((r) => {
    const date = new Date(r.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const monthlyExpenses = expenses.filter((e) => {
    const date = new Date(e.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalRevenue = monthlyReports.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = church.current_balance || 0;

  // Données pour le graphique des 7 derniers jours
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const revenueData = last7Days.map((date) => {
    const dayReports = dailyReports.filter(
      (r) => new Date(r.date).toDateString() === date.toDateString()
    );
    return dayReports.reduce((sum, r) => sum + r.amount, 0) / 1000;
  });

  const expenseData = last7Days.map((date) => {
    const dayExpenses = expenses.filter(
      (e) => new Date(e.date).toDateString() === date.toDateString()
    );
    return dayExpenses.reduce((sum, e) => sum + e.amount, 0) / 1000;
  });

  const chartData = {
    labels: last7Days.map((d) => d.toLocaleDateString('fr-FR', { weekday: 'short' })),
    datasets: [
      {
        data: revenueData.length > 0 ? revenueData : [0],
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 3,
      },
      {
        data: expenseData.length > 0 ? expenseData : [0],
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 3,
      },
    ],
    legend: ['Revenus (k)', 'Dépenses (k)'],
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* En-tête */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View>
            <View style={styles.headerTitleRow}>
              <Eye size={28} color="white" strokeWidth={2.5} />
              <Text style={styles.title}>Tableau de Bord</Text>
            </View>
            <Text style={styles.subtitle}>Interface Lecteur - Consultation</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Badge Mode Lecture */}
        <View style={[styles.readOnlyBadge, { backgroundColor: colors.info + '20', borderColor: colors.info }]}>
          <AlertCircle size={20} color={colors.info} />
          <Text style={[styles.readOnlyText, { color: colors.info }]}>
            Mode Lecture — Aucune modification autorisée
          </Text>
        </View>

        {/* Cartes statistiques (lecture seule) */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
            <TrendingUp size={24} color={colors.success} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Revenus du mois
            </Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(totalRevenue, church.currency)}
            </Text>
            <Text style={[styles.readOnlyLabel, { color: colors.textSecondary }]}>
              (Lecture seule)
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.error + '20' }]}>
            <TrendingDown size={24} color={colors.error} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Dépenses du mois
            </Text>
            <Text style={[styles.statValue, { color: colors.error }]}>
              {formatCurrency(totalExpenses, church.currency)}
            </Text>
            <Text style={[styles.readOnlyLabel, { color: colors.textSecondary }]}>
              (Lecture seule)
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
            <Wallet size={24} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Solde actuel
            </Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatCurrency(balance, church.currency)}
            </Text>
            <Text style={[styles.readOnlyLabel, { color: colors.textSecondary }]}>
              (Lecture seule)
            </Text>
          </View>
        </View>

        {/* Graphique (non modifiable) */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📊 Revenus / Dépenses (7 derniers jours)
            </Text>
            <View style={[styles.readOnlyPill, { backgroundColor: colors.info + '20' }]}>
              <Text style={[styles.readOnlyPillText, { color: colors.info }]}>
                Lecture seule
              </Text>
            </View>
          </View>

          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 60}
            height={220}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '4', strokeWidth: '2' },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Événements à venir */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📅 Événements à venir
          </Text>
          <EventsViewer churchId={church.id} />
        </View>

        {/* Actions autorisées (Export uniquement) */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ⚡ Actions disponibles
          </Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.info }]}
              onPress={() => router.push('/finance')}
            >
              <Eye size={24} color="white" />
              <Text style={styles.actionText}>Consulter revenus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.primaryLight }]}
              onPress={() => router.push('/finance')}
            >
              <Eye size={24} color="white" />
              <Text style={styles.actionText}>Consulter dépenses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/reports')}
            >
              <FileText size={24} color="white" />
              <Text style={styles.actionText}>Voir rapports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.success }]}
              onPress={() => router.push('/reports')}
            >
              <Download size={24} color="white" />
              <Text style={styles.actionText}>Exporter PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dernières transactions (lecture seule) */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📝 Dernières transactions
            </Text>
            <View style={[styles.readOnlyPill, { backgroundColor: colors.info + '20' }]}>
              <Text style={[styles.readOnlyPillText, { color: colors.info }]}>
                Consultation
              </Text>
            </View>
          </View>

          {monthlyReports.slice(0, 5).map((report, index) => (
            <View key={index} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.transactionIcon, { backgroundColor: colors.success + '20' }]}>
                <TrendingUp size={20} color={colors.success} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionLabel, { color: colors.text }]}>
                  {report.category}
                </Text>
                <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                  {new Date(report.date).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={[styles.transactionAmount, { color: colors.success }]}>
                +{formatCurrency(report.amount, church.currency)}
              </Text>
            </View>
          ))}

          {monthlyExpenses.slice(0, 3).map((expense, index) => (
            <View key={`exp-${index}`} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.transactionIcon, { backgroundColor: colors.error + '20' }]}>
                <TrendingDown size={20} color={colors.error} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionLabel, { color: colors.text }]}>
                  {expense.category}
                </Text>
                <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                  {new Date(expense.date).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={[styles.transactionAmount, { color: colors.error }]}>
                -{formatCurrency(expense.amount, church.currency)}
              </Text>
            </View>
          ))}

          {monthlyReports.length === 0 && monthlyExpenses.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune transaction ce mois-ci
            </Text>
          )}
        </View>

        {/* Info supplémentaire */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <AlertCircle size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            En tant que Lecteur, vous avez accès à toutes les données en consultation.
            Les exports (PDF/Excel) sont autorisés.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
  },
  content: {
    padding: 20,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
    gap: 8,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  readOnlyLabel: {
    fontSize: 9,
    fontStyle: 'italic',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  readOnlyPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readOnlyPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
