import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Calendar,
  Search,
  Download,
  Filter,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
} from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import { formatCurrency } from '../utils/currency';
import { ReportGeneratorService } from '../utils/reportGeneratorNew';
import type { Church, DailyReport, Expense, Member } from '../types/database';

interface AdvancedReportsNewProps {
  church: Church;
}

type PeriodType = 'week' | 'month' | 'year';
type ReportType = 'all' | 'financial' | 'members';

export function AdvancedReportsNew({ church }: AdvancedReportsNewProps) {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [reportType, setReportType] = useState<ReportType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    loadData();
  }, [church.id, period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const [reportsData, expensesData, membersData] = await Promise.all([
        DatabaseService.getDailyReports(church.id),
        DatabaseService.getExpenses(church.id),
        DatabaseService.getMembers(church.id),
      ]);

      setDailyReports(
        reportsData.filter((r) => new Date(r.date) >= startDate)
      );
      setExpenses(expensesData.filter((e) => new Date(e.date) >= startDate));
      setMembers(membersData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalRevenue = dailyReports.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalRevenue - totalExpenses;

    const byBank = dailyReports.reduce(
      (acc, r) => {
        acc[r.payment_type] = (acc[r.payment_type] || 0) + r.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalRevenue,
      totalExpenses,
      balance,
      byBank,
      totalMembers: members.length,
      activeMembers: members.filter((m) => m.is_active).length,
    };
  };

  const filteredReports = dailyReports.filter((r) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.category.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.collected_by.toLowerCase().includes(query)
    );
  });

  const filteredExpenses = expenses.filter((e) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      e.category.toLowerCase().includes(query) ||
      e.description?.toLowerCase().includes(query) ||
      e.paid_to?.toLowerCase().includes(query)
    );
  });

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const stats = calculateStats();

      await ReportGeneratorService.generateAdvancedReport({
        church,
        period,
        reportType,
        stats,
        dailyReports: filteredReports,
        expenses: filteredExpenses,
        members,
      });

      Alert.alert('✅ Succès', 'Rapport exporté en PDF avec succès!');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      Alert.alert('❌ Erreur', 'Impossible d\'exporter le rapport');
    } finally {
      setExporting(false);
    }
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement des rapports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Rapports Avancés</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        {/* Filtres de période */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Période</Text>
          <View style={styles.periodButtons}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                period === 'week' && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod('week')}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === 'week' && styles.periodButtonTextActive,
                ]}
              >
                Semaine
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.periodButton,
                period === 'month' && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod('month')}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === 'month' && styles.periodButtonTextActive,
                ]}
              >
                Mois
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.periodButton,
                period === 'year' && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod('year')}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === 'year' && styles.periodButtonTextActive,
                ]}
              >
                Année
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Type de rapport */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Type de rapport</Text>
          <View style={styles.reportTypeButtons}>
            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                reportType === 'all' && styles.reportTypeButtonActive,
              ]}
              onPress={() => setReportType('all')}
            >
              <FileText size={20} color={reportType === 'all' ? 'white' : '#7f8c8d'} />
              <Text
                style={[
                  styles.reportTypeButtonText,
                  reportType === 'all' && styles.reportTypeButtonTextActive,
                ]}
              >
                Tout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                reportType === 'financial' && styles.reportTypeButtonActive,
              ]}
              onPress={() => setReportType('financial')}
            >
              <DollarSign size={20} color={reportType === 'financial' ? 'white' : '#7f8c8d'} />
              <Text
                style={[
                  styles.reportTypeButtonText,
                  reportType === 'financial' && styles.reportTypeButtonTextActive,
                ]}
              >
                Financier
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                reportType === 'members' && styles.reportTypeButtonActive,
              ]}
              onPress={() => setReportType('members')}
            >
              <Users size={20} color={reportType === 'members' ? 'white' : '#7f8c8d'} />
              <Text
                style={[
                  styles.reportTypeButtonText,
                  reportType === 'members' && styles.reportTypeButtonTextActive,
                ]}
              >
                Membres
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche */}
        <View style={styles.section}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#7f8c8d" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher dans les rapports..."
              placeholderTextColor="#95a5a6"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Statistiques globales */}
        {(reportType === 'all' || reportType === 'financial') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Résumé Financier</Text>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: '#27ae60' }]}>
                <TrendingUp size={24} color="#27ae60" />
                <Text style={styles.statLabel}>Compte Rendus</Text>
                <Text style={[styles.statValue, { color: '#27ae60' }]}>
                  {formatCurrency(stats.totalRevenue, church.currency)}
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#e74c3c' }]}>
                <TrendingDown size={24} color="#e74c3c" />
                <Text style={styles.statLabel}>Dépenses</Text>
                <Text style={[styles.statValue, { color: '#e74c3c' }]}>
                  {formatCurrency(stats.totalExpenses, church.currency)}
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#3498db' }]}>
                <DollarSign size={24} color="#3498db" />
                <Text style={styles.statLabel}>Solde</Text>
                <Text style={[styles.statValue, { color: stats.balance >= 0 ? '#27ae60' : '#e74c3c' }]}>
                  {formatCurrency(stats.balance, church.currency)}
                </Text>
              </View>
            </View>

            <View style={styles.bankBreakdown}>
              <Text style={styles.bankTitle}>Par compte:</Text>
              {Object.entries(stats.byBank).map(([bank, amount]) => (
                <View key={bank} style={styles.bankRow}>
                  <Text style={styles.bankName}>{bank}</Text>
                  <Text style={styles.bankAmount}>
                    {formatCurrency(amount, church.currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Statistiques membres */}
        {(reportType === 'all' || reportType === 'members') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Membres</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: '#9b59b6' }]}>
                <Users size={24} color="#9b59b6" />
                <Text style={styles.statLabel}>Total</Text>
                <Text style={[styles.statValue, { color: '#9b59b6' }]}>
                  {stats.totalMembers}
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#27ae60' }]}>
                <Users size={24} color="#27ae60" />
                <Text style={styles.statLabel}>Actifs</Text>
                <Text style={[styles.statValue, { color: '#27ae60' }]}>
                  {stats.activeMembers}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Détail des comptes rendus */}
        {(reportType === 'all' || reportType === 'financial') && filteredReports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Comptes Rendus ({filteredReports.length})</Text>
            {filteredReports.map((report) => (
              <View key={report.id} style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailCategory}>{report.category}</Text>
                  <Text style={[styles.detailAmount, { color: '#27ae60' }]}>
                    +{formatCurrency(report.amount, church.currency)}
                  </Text>
                </View>
                <Text style={styles.detailDescription}>{report.description}</Text>
                <View style={styles.detailFooter}>
                  <Text style={styles.detailInfo}>
                    📅 {new Date(report.date).toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={styles.detailInfo}>
                    👤 {report.collected_by}
                  </Text>
                  <Text style={styles.detailInfo}>
                    🏦 {report.payment_type}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Détail des dépenses */}
        {(reportType === 'all' || reportType === 'financial') && filteredExpenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💸 Dépenses ({filteredExpenses.length})</Text>
            {filteredExpenses.map((expense) => (
              <View key={expense.id} style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailCategory}>{expense.category}</Text>
                  <Text style={[styles.detailAmount, { color: '#e74c3c' }]}>
                    -{formatCurrency(expense.amount, church.currency)}
                  </Text>
                </View>
                {expense.description && (
                  <Text style={styles.detailDescription}>{expense.description}</Text>
                )}
                <View style={styles.detailFooter}>
                  <Text style={styles.detailInfo}>
                    📅 {new Date(expense.date).toLocaleDateString('fr-FR')}
                  </Text>
                  {expense.paid_to && (
                    <Text style={styles.detailInfo}>
                      🏢 {expense.paid_to}
                    </Text>
                  )}
                  <Text style={styles.detailInfo}>
                    🏦 {expense.payment_method}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bouton export */}
        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
          onPress={handleExportPDF}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Download size={20} color="white" />
              <Text style={styles.exportButtonText}>Exporter en PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ecf0f1',
  },
  periodButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  reportTypeButtons: {
    flexDirection: 'row',
  },
  reportTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#ecf0f1',
  },
  reportTypeButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  reportTypeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7f8c8d',
    marginLeft: 6,
  },
  reportTypeButtonTextActive: {
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  statsGrid: {
    marginBottom: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 12,
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bankBreakdown: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  bankTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  bankName: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  bankAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  detailAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  detailFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailInfo: {
    fontSize: 12,
    color: '#95a5a6',
    marginRight: 16,
    marginTop: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
});
