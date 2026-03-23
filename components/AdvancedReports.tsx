import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Dimensions,
  Modal,
} from 'react-native';
import { FileText, Download, ChartPie as PieChartIcon, ChartBar as BarChart3, Share2, TrendingUp as TrendingUpIcon } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import { ReportGenerator } from '../utils/reportGenerator';
import { formatCurrency } from '../utils/currency';
import { useChurch } from '../contexts/ChurchContext';
import type { DailyReport, Expense, Member, ChartData } from '../types/database';

interface AdvancedReportsProps {
  visible: boolean;
  onClose: () => void;
}

export function AdvancedReports({ visible, onClose }: AdvancedReportsProps) {
  const { church, user, permissions } = useChurch();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportType, setReportType] = useState<'comprehensive' | 'financial' | 'members' | null>(null);

  useEffect(() => {
    if (visible && church) {
      loadReportData();
    }
  }, [visible, church, selectedPeriod]);

  const loadReportData = async () => {
    if (!church) return;
    
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const [reportsData, expensesData, membersData] = await Promise.all([
        DatabaseService.getDailyReports(
          church.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        DatabaseService.getExpenses(
          church.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        DatabaseService.getMembers(church.id)
      ]);

      setReports(reportsData);
      setExpenses(expensesData);
      setMembers(membersData);
    } catch (error) {
      console.error('❌ Erreur chargement données rapports:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const generateComprehensiveReport = async () => {
    if (!church || !user) return;
    
    setGeneratingReport(true);
    setReportType('comprehensive');
    
    try {
      // Calculer les dates pour la période sélectionnée
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
      
      const period = `${selectedPeriod === 'week' ? 'Semaine' : selectedPeriod === 'month' ? 'Mois' : 'Année'} courante`;
      
      // Calculer les statistiques nécessaires
      const totalIncome = reports.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalExpenses = expenses.filter(e => e.is_approved).reduce((sum, e) => sum + Number(e.amount), 0);
      const netBalance = totalIncome - totalExpenses;
      
      // Préparer les données pour le rapport
      const reportData = {
        church,
        members,
        reports,
        expenses,
        totalIncome,
        totalExpenses,
        netBalance,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        period,
        reportDate: new Date().toLocaleDateString(),
        generatedBy: user.name || user.email
      };
      
      // Générer le rapport
      const report = ReportGenerator.generateComprehensiveReport(reportData);

      // Partager le rapport
      await Share.share({
        message: report,
        title: `Rapport complet - ${church.name} - ${period}`,
      });

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'GENERATE_REPORT',
        resource_type: 'Church',
        resource_id: church.id,
        details: { type: 'comprehensive', period }
      });

    } catch (error) {
      console.error('❌ Erreur génération rapport complet:', error);
      Alert.alert('Erreur', 'Impossible de générer le rapport complet');
    } finally {
      setGeneratingReport(false);
      setReportType(null);
    }
  };

  const generateFinancialReport = async () => {
    if (!church || !user) return;
    
    setGeneratingReport(true);
    setReportType('financial');
    
    try {
      // Calculer les dates pour la période sélectionnée
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
      
      const period = `${selectedPeriod === 'week' ? 'Semaine' : selectedPeriod === 'month' ? 'Mois' : 'Année'} courante`;
      
      // Calculer les statistiques financières
      const totalIncome = reports.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalExpenses = expenses.filter(e => e.is_approved).reduce((sum, e) => sum + Number(e.amount), 0);
      const netBalance = totalIncome - totalExpenses;
      
      const report = ReportGenerator.generateFinancialReport(
        church,
        reports,
        expenses,
        period,
        { 
          includeDetails: true,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalIncome,
          totalExpenses,
          netBalance
        }
      );

      await Share.share({
        message: report,
        title: `Rapport financier - ${church.name} - ${period}`,
      });

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'GENERATE_REPORT',
        resource_type: 'Church',
        resource_id: church.id,
        details: { type: 'financial', period }
      });

    } catch (error) {
      console.error('❌ Erreur génération rapport financier:', error);
      Alert.alert('Erreur', 'Impossible de générer le rapport financier');
    } finally {
      setGeneratingReport(false);
      setReportType(null);
    }
  };

  const generateMembersReport = async () => {
    if (!church || !user) return;
    
    setGeneratingReport(true);
    setReportType('members');
    
    try {
      const period = `${selectedPeriod === 'week' ? 'Semaine' : selectedPeriod === 'month' ? 'Mois' : 'Année'} courante`;
      
      const report = ReportGenerator.generateMembersReport(
        church,
        members,
        period,
        { 
          includeDetails: true,
          totalMembers: members.length,
          staffCount: members.filter(m => m.member_type === 'Personnel').length,
          activeDepartments: [...new Set(members.flatMap(m => m.departments || []))].length
        }
      );

      await Share.share({
        message: report,
        title: `Rapport membres - ${church.name} - ${period}`,
      });

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'GENERATE_REPORT',
        resource_type: 'Church',
        resource_id: church.id,
        details: { type: 'members', period }
      });

    } catch (error) {
      console.error('❌ Erreur génération rapport membres:', error);
      Alert.alert('Erreur', 'Impossible de générer le rapport des membres');
    } finally {
      setGeneratingReport(false);
      setReportType(null);
    }
  };

  if (!permissions.canViewReports) {
    return null;
  }

  const totalIncome = reports.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpenses = expenses.filter(e => e.is_approved).reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Fermer</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📊 Rapports avancés</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {/* Sélecteur de période */}
            <View style={styles.periodSelector}>
              {(['week', 'month', 'year'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive
                  ]}>
                    {period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Année'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Résumé */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>📈 Résumé financier</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(totalIncome, church?.currency || 'FC')}
                  </Text>
                  <Text style={styles.summaryLabel}>comptes rendus totaux</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={[styles.summaryValue, { color: '#e74c3c' }]}>
                    {formatCurrency(totalExpenses, church?.currency || 'FC')}
                  </Text>
                  <Text style={styles.summaryLabel}>Dépenses totales</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={[styles.summaryValue, { color: totalIncome - totalExpenses >= 0 ? '#27ae60' : '#e74c3c' }]}>
                    {formatCurrency(totalIncome - totalExpenses, church?.currency || 'FC')}
                  </Text>
                  <Text style={styles.summaryLabel}>Solde net</Text>
                </View>
              </View>
            </View>

            {/* Actions de génération */}
            {permissions.canCreateReports && (
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>📄 Générer des rapports</Text>
                
                <TouchableOpacity 
                  style={styles.reportButton}
                  onPress={generateFinancialReport}
                  disabled={generatingReport}
                >
                  <TrendingUpIcon size={20} color="#27ae60" />
                  <Text style={styles.reportButtonText}>Rapport financier détaillé</Text>
                  {generatingReport && reportType === 'financial' && (
                    <ActivityIndicator size="small" color="#27ae60" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.reportButton}
                  onPress={generateMembersReport}
                  disabled={generatingReport}
                >
                  <FileText size={20} color="#3498db" />
                  <Text style={styles.reportButtonText}>Rapport des membres</Text>
                  {generatingReport && reportType === 'members' && (
                    <ActivityIndicator size="small" color="#3498db" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.reportButton}
                  onPress={generateComprehensiveReport}
                  disabled={generatingReport}
                >
                  <BarChart3 size={20} color="#9b59b6" />
                  <Text style={styles.reportButtonText}>Rapport complet</Text>
                  {generatingReport && reportType === 'comprehensive' && (
                    <ActivityIndicator size="small" color="#9b59b6" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Statistiques détaillées */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>📊 Statistiques détaillées</Text>
              
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>💰 Analyse financière</Text>
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{reports.length}</Text>
                    <Text style={styles.statLabel}>Transactions comptes rendus</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{expenses.length}</Text>
                    <Text style={styles.statLabel}>Transactions dépenses</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0}%
                    </Text>
                    <Text style={styles.statLabel}>Ratio dépenses/comptes rendus</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statTitle}>👥 Analyse des membres</Text>
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{members.length}</Text>
                    <Text style={styles.statLabel}>Total membres</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {members.filter(m => m.member_type === 'Personnel').length}
                    </Text>
                    <Text style={styles.statLabel}>Personnel</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {[...new Set(members.flatMap(m => m.departments || []))].length}
                    </Text>
                    <Text style={styles.statLabel}>Départements actifs</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// Les styles restent exactement les mêmes...
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
  closeButton: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#3498db',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  summarySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  actionsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginLeft: 12,
  },
  statsSection: {
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
}); 