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
  ActivityIndicator,
  Share,
} from 'react-native';
import { Archive, ChartBar as BarChart3, ChartBar as BarChart, Download, Calendar, FolderArchive, FileText } from 'lucide-react-native';
import { useChurch } from '../../contexts/ChurchContext';
import { DatabaseService } from '../../lib/database';
import { getThemeColors } from '../../lib/theme';
import { formatCurrency } from '../../utils/currency';
import { AdvancedReports } from '../../components/AdvancedReports';
import { ArchivesManagement } from '../../components/ArchivesManagement';
import { ArchiveManager } from '../../utils/archiveManager';
import { ArchiveScheduler } from '../../services/archiveScheduler';
import type { DailyReport, Expense, Archive as ArchiveType, Member } from '../../types/database';

export default function ReportsScreen() {
  const { church, user, permissions } = useChurch();
  const [archives, setArchives] = useState<ArchiveType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showAdvancedReports, setShowAdvancedReports] = useState(false);
  const [showArchivesManagement, setShowArchivesManagement] = useState(false);

  const theme = church?.theme || 'blue';
  const colors = getThemeColors(theme);

  useEffect(() => {
    if (church) {
      loadReportsData();
      checkAutoArchive();
    }
  }, [church]);

  const loadReportsData = async () => {
    if (!church) return;

    try {
      console.log('📊 Chargement données rapports...');
      
      // ✅ CORRECTION: Utiliser les services directs, PAS fetch
      const archivesData = await DatabaseService.getArchives(church.id);
      const membersData = await DatabaseService.getMembers(church.id);
      const reportsData = await DatabaseService.getDailyReports(church.id);
      const expensesData = await DatabaseService.getExpenses(church.id);
      
      // ✅ Sécuriser les données avec Array.isArray
      setArchives(Array.isArray(archivesData) ? archivesData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setDailyReports(Array.isArray(reportsData) ? reportsData : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      
      console.log('✅ Données rapports chargées');
    } catch (error) {
      console.error('❌ Erreur chargement rapports:', error);
      Alert.alert('Erreur', 'Impossible de charger les données des rapports');
    } finally {
      setLoading(false);
    }
  };

  const checkAutoArchive = async () => {
    if (!church || !user) return;

    try {
      // Vérifier si on doit créer des archives automatiques (rétroactif)
      await ArchiveScheduler.checkAndCreateArchives(church.id);
    } catch (error) {
      console.error('❌ Erreur auto-archive:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportsData();
    setRefreshing(false);
  };

  const createManualArchive = async (type: 'monthly' | 'yearly') => {
    if (!church || !user) return;

    if (!permissions.canCreateReports) {
      Alert.alert('Erreur', 'Vous n\'avez pas les permissions pour créer des archives');
      return;
    }

    setGeneratingReport(true);
    try {
      const today = new Date();
      
      if (type === 'monthly') {
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        await ArchiveManager.createMonthlyArchive(church.id, year, month);
        Alert.alert('✅ Succès', `Archive mensuelle créée pour ${month}/${year}`);
      } else {
        const year = today.getFullYear();
        await ArchiveManager.createYearlyArchive(church.id, year);
        Alert.alert('✅ Succès', `Archive annuelle créée pour ${year}`);
      }

      await loadReportsData();
    } catch (error: any) {
      Alert.alert('❌ Erreur', error.message || 'Impossible de créer l\'archive');
    } finally {
      setGeneratingReport(false);
    }
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
          Chargement des rapports...
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
              <BarChart3 size={28} color="white" strokeWidth={2.5} />
              <Text style={styles.title}>Rapports</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{archives.length}</Text>
                <Text style={styles.statLabel}>Archives</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{archives.filter(a => a.archive_type === 'monthly').length}</Text>
                <Text style={styles.statLabel}>Mensuels</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{archives.filter(a => a.archive_type === 'yearly').length}</Text>
                <Text style={styles.statLabel}>Annuels</Text>
              </View>
            </View>
          </View>
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
        {/* Actions de génération */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📄 Générer des rapports (PDF/DOCX)
            </Text>
          </View>
          
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Ce rapport a été généré par : <Text style={[styles.churchNameHighlight, { color: colors.primary }]}>{church.name}</Text>
          </Text>
          
          <View style={styles.reportActions}>
            {permissions.canCreateReports ? (
              <>
                <TouchableOpacity
                  style={[styles.reportButtonLarge, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAdvancedReports(true)}
                  disabled={generatingReport}
                >
                  <View style={styles.reportButtonLargeIcon}>
                    <BarChart size={32} color="white" />
                  </View>
                  <View style={styles.reportButtonLargeContent}>
                    <Text style={styles.reportButtonLargeTitle}>📈 Rapport Avancé Complet</Text>
                    <Text style={styles.reportButtonLargeSubtitle}>
                      Tous les détails : finances, membres, statistiques, adresses, exports PDF
                    </Text>
                  </View>
                  <Download size={20} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noPermissionContainer}>
                <Text style={[styles.noPermissionText, { color: colors.textSecondary }]}>
                  Vous n'avez pas les permissions pour générer des rapports
                </Text>
              </View>
            )}
          </View>

          {generatingReport && (
            <View style={styles.generatingStatus}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.generatingText, { color: colors.primary }]}>
                Génération du rapport en cours...
              </Text>
            </View>
          )}
        </View>

        {/* Gestion des archives */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <FolderArchive size={20} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🗄️ Archives automatiques
            </Text>
          </View>

          <Text style={[styles.archiveDescription, { color: colors.textSecondary }]}>
            📅 <Text style={{ fontWeight: '700' }}>Archives mensuelles:</Text> Créées automatiquement chaque 1er du mois (00:00)
            {'\n'}
            📆 <Text style={{ fontWeight: '700' }}>Archives annuelles:</Text> Créées automatiquement chaque 1er janvier (00:00)
          </Text>

          <TouchableOpacity
            style={[styles.manageArchivesButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowArchivesManagement(true)}
          >
            <FolderArchive size={20} color="white" />
            <Text style={styles.manageArchivesButtonText}>
              Gérer les archives ({archives.length})
            </Text>
          </TouchableOpacity>

          {/* Liste des archives */}
          <View style={styles.archivesList}>
            <Text style={[styles.archivesTitle, { color: colors.text }]}>
              📂 Archives existantes ({archives.length})
            </Text>
            
            {archives.slice(0, 5).map((archive) => (
              <View key={archive.id} style={[styles.archiveItem, { borderBottomColor: colors.border }]}>
                <View style={styles.archiveInfo}>
                  <Text style={[styles.archiveTitle, { color: colors.text }]}>
                    {archive.archive_type === 'monthly' ? '📅' : '📆'} {ArchiveManager.getArchivePeriodName(archive)}
                  </Text>
                  <Text style={[styles.archiveBalance, { color: colors.success }]}>
                    💰 Solde: {formatCurrency(archive.balance || 0, church.currency)}
                  </Text>
                  <Text style={[styles.archiveDate, { color: colors.textSecondary }]}>
                    Créée le {new Date(archive.created_at || '').toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
            ))}
            
            {archives.length === 0 && (
              <View style={styles.emptyArchives}>
                <Text style={[styles.emptyArchivesText, { color: colors.textSecondary }]}>
                  Aucune archive créée
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Statistiques rapides */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={20} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📈 Statistiques rapides
            </Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {dailyReports.length}
              </Text>
              <Text style={[styles.statGridLabel, { color: colors.textSecondary }]}>
                Comptes rendus
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {expenses.length}
              </Text>
              <Text style={[styles.statGridLabel, { color: colors.textSecondary }]}>
                Dépenses totales
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {members.length}
              </Text>
              <Text style={[styles.statGridLabel, { color: colors.textSecondary }]}>
                Membres actifs
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {archives.length}
              </Text>
              <Text style={[styles.statGridLabel, { color: colors.textSecondary }]}>
                Archives créées
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal rapport avancé complet */}
      <AdvancedReports
        visible={showAdvancedReports}
        onClose={() => setShowAdvancedReports(false)}
      />

      {/* Modal gestion des archives */}
      <ArchivesManagement
        visible={showArchivesManagement}
        onClose={() => setShowArchivesManagement(false)}
        churchId={church.id}
        currency={church.currency}
        theme={theme}
        isAdmin={user?.role === 'Admin'}
      />
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
    minWidth: 70,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
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
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  churchNameHighlight: {
    fontWeight: 'bold',
  },
  reportActions: {
    gap: 12,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  reportButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  reportButtonLargeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButtonLargeContent: {
    flex: 1,
  },
  reportButtonLargeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  reportButtonLargeSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  generatingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  generatingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  archiveDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  manageArchivesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  manageArchivesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  archiveActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  archiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  archiveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  archivesList: {
    marginTop: 8,
  },
  archivesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  archiveItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  archiveInfo: {
    gap: 4,
  },
  archiveTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  archiveBalance: {
    fontSize: 14,
    fontWeight: '500',
  },
  archiveDate: {
    fontSize: 12,
  },
  emptyArchives: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyArchivesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  noYearlyArchive: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    marginBottom: 12,
  },
  noYearlyArchiveText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  noYearlyArchiveSubtext: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statGridLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  noPermissionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noPermissionText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});