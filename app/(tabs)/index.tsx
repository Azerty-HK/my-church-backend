import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, DollarSign, TrendingUp, Calendar, Bell, X, Plus, FileText, BarChart3, ChevronRight, CreditCard, Banknote } from 'lucide-react-native';
import { router } from 'expo-router';
import { useChurch } from '../../contexts/ChurchContext';
import { DatabaseService } from '../../lib/database';
import { StatCard } from '../../components/StatCard';
import { Section } from '../../components/Section';
import { TreasurerDashboard } from '../../components/TreasurerDashboard';
import { ReaderDashboard } from '../../components/ReaderDashboard';
import { SecretaryDashboard } from '../../components/SecretaryDashboard';
import { LogoComponent } from '../../components/LogoComponent';
import { EventsViewer } from '../../components/EventsViewer';
import { EventsManagerAdmin } from '../../components/EventsManagerAdmin';
import { colors, spacing, fontSize, shadows, borderRadius } from '../../lib/designSystem';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import type { ChurchStats, DailyReport, Expense } from '../../types/database';

export default function HomeScreen() {
  const { church, user } = useChurch();
  const [stats, setStats] = useState<ChurchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Chargement optimisé avec useCallback
  const loadDashboard = useCallback(async () => {
    if (!church) return;

    try {
      // Appels directs aux services - PAS DE .json()
      console.log('📊 Chargement des statistiques...');
      const churchStats = await DatabaseService.getChurchStats(church.id);
      
      if (!churchStats) {
        throw new Error('Stats invalides');
      }
      
      setStats(churchStats);
      
      console.log('📋 Chargement des rapports...');
      const reports = await DatabaseService.getDailyReports(church.id);
      const safeReports = Array.isArray(reports) ? reports : [];
      
      console.log('💸 Chargement des dépenses...');
      const expenses = await DatabaseService.getExpenses(church.id);
      const safeExpenses = Array.isArray(expenses) ? expenses : [];
      
      // Combiner et trier les activités récentes
      const allActivities = [
        ...safeReports.map((report: DailyReport) => ({
          ...report,
          type: 'report' as const,
          date: report.date ? new Date(report.date) : new Date(),
          icon: 'plus' as const,
          color: '#27AE60',
          isNegative: false,
        })),
        ...safeExpenses.map((expense: Expense) => ({
          ...expense,
          type: 'expense' as const,
          date: expense.date ? new Date(expense.date) : new Date(),
          icon: 'minus' as const,
          color: '#E74C3C',
          isNegative: true,
        }))
      ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5); // 5 activités max
      
      setRecentActivities(allActivities);
      console.log('✅ Dashboard chargé avec succès');
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [church]);

  useEffect(() => {
    if (church) loadDashboard();
  }, [church, loadDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  // États de chargement / absence de données
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!church || !user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erreur: Aucune église ou utilisateur trouvé</Text>
      </View>
    );
  }

  // ROLE SWITCH
  switch (user.role) {
    case 'Trésorier':
      return <TreasurerDashboard church={church} onRefresh={onRefresh} />;

    case 'Lecteur':
      return <ReaderDashboard church={church} onRefresh={onRefresh} />;

    case 'Secrétaire':
      return <SecretaryDashboard church={church} onRefresh={onRefresh} />;

    case 'Admin':
    default: {
      // Données sécurisées
      const totalMembers = stats?.members?.totalMembers ?? 0;
      const upcomingEvents = stats?.events?.upcomingEvents ?? 0;
      
      // Soldes multi-devises depuis l'église
      const mainCurrency = church.currency || 'USD';
      const otherCurrencies = ['FC', 'USD', 'EURO'].filter(c => c !== mainCurrency);
      
      // Soldes caisse et banque combinés par devise
      const getTotalByCurrency = (currency: string) => {
        const cash = currency === 'FC' ? (church.current_balance_fc || 0) :
                    currency === 'USD' ? (church.current_balance_usd || 0) :
                    (church.current_balance_euro || 0);
        
        const bank = currency === 'FC' ? (church.bank_balance_fc || 0) :
                    currency === 'USD' ? (church.bank_balance_usd || 0) :
                    (church.bank_balance_euro || 0);
        
        return cash + bank;
      };

      // Total pour la devise principale
      const mainCurrencyTotal = getTotalByCurrency(mainCurrency);
      
      // Deux autres devises (sans la devise principale)
      const otherCurrencyBalances = otherCurrencies
        .map(currency => ({
          currency,
          amount: getTotalByCurrency(currency),
          label: currency
        }))
        .filter(item => item.amount > 0) // Filtrer seulement celles avec un montant
        .slice(0, 2); // Maximum 2 autres devises

      return (
        <View style={styles.container}>
          {/* HEADER MODERNE */}
          <LinearGradient
            colors={['#4A6FA5', '#2C3E50']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerTop}>
              <View style={styles.userInfo}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {user.first_name?.[0] || user.username?.[0] || 'A'}
                    </Text>
                  </View>
                )}
                <View style={styles.userTextContainer}>
                  <Text style={styles.welcomeText}>Bon retour,</Text>
                  <Text style={styles.userName}>
                    {user.first_name || user.username || 'Admin'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setShowEventsModal(true)}
              >
                <Bell size={24} color="#FFFFFF" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>

            {/* SOLDE MULTI-DEVISES */}
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceTitle}>Solde Total ({mainCurrency})</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(mainCurrencyTotal, mainCurrency)}
              </Text>
              
              {/* Afficher les deux autres devises s'il y en a */}
              {otherCurrencyBalances.length > 0 && (
                <View style={styles.otherCurrencies}>
                  <Text style={styles.otherCurrenciesTitle}>Autres devises :</Text>
                  <View style={styles.currencyChips}>
                    {otherCurrencyBalances.map((item) => (
                      <View key={item.currency} style={styles.currencyChip}>
                        <Text style={styles.currencyChipText}>
                          {item.currency}: {formatCurrency(item.amount, item.currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* CONTENU PRINCIPAL */}
          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {/* STATISTIQUES PRINCIPALES */}
            <View style={styles.mainStats}>
              <StatCard
                icon={<Users size={28} color="#FFFFFF" />}
                title="Membres"
                value={String(totalMembers)}
                subtitle="Total inscrits"
                backgroundColor="#4A6FA5"
                onPress={() => router.push('/members')}
              />
              
              <StatCard
                icon={<Calendar size={28} color="#FFFFFF" />}
                title="Événements"
                value={String(upcomingEvents)}
                subtitle="À venir"
                backgroundColor="#E67E22"
                onPress={() => router.push('/settings')}
              />
            </View>

            {/* SOLDE DÉTAILLÉ PAR SOURCE */}
            <Section title="💵 Soldes détaillés" titleStyle={styles.sectionTitle}>
              <View style={styles.balanceDetails}>
                {/* Caisse */}
                <View style={styles.balanceDetailCard}>
                  <View style={styles.balanceDetailHeader}>
                    <Banknote size={20} color="#4A6FA5" />
                    <Text style={styles.balanceDetailTitle}>Caisse</Text>
                  </View>
                  {['FC', 'USD', 'EURO']
                    .filter(currency => {
                      const amount = currency === 'FC' ? church.current_balance_fc :
                                    currency === 'USD' ? church.current_balance_usd :
                                    church.current_balance_euro;
                      return amount && amount > 0;
                    })
                    .map(currency => (
                      <View key={`cash-${currency}`} style={styles.currencyRow}>
                        <Text style={styles.currencyLabel}>{currency}</Text>
                        <Text style={[
                          styles.currencyAmount,
                          { color: currency === mainCurrency ? '#27AE60' : '#7F8C8D' }
                        ]}>
                          {formatCurrency(
                            currency === 'FC' ? church.current_balance_fc :
                            currency === 'USD' ? church.current_balance_usd :
                            church.current_balance_euro,
                            currency
                          )}
                        </Text>
                      </View>
                    ))
                  }
                </View>

                {/* Banque */}
                <View style={styles.balanceDetailCard}>
                  <View style={styles.balanceDetailHeader}>
                    <CreditCard size={20} color="#4A6FA5" />
                    <Text style={styles.balanceDetailTitle}>Banque</Text>
                  </View>
                  {['FC', 'USD', 'EURO']
                    .filter(currency => {
                      const amount = currency === 'FC' ? church.bank_balance_fc :
                                    currency === 'USD' ? church.bank_balance_usd :
                                    church.bank_balance_euro;
                      return amount && amount > 0;
                    })
                    .map(currency => (
                      <View key={`bank-${currency}`} style={styles.currencyRow}>
                        <Text style={styles.currencyLabel}>{currency}</Text>
                        <Text style={[
                          styles.currencyAmount,
                          { color: currency === mainCurrency ? '#27AE60' : '#7F8C8D' }
                        ]}>
                          {formatCurrency(
                            currency === 'FC' ? church.bank_balance_fc :
                            currency === 'USD' ? church.bank_balance_usd :
                            church.bank_balance_euro,
                            currency
                          )}
                        </Text>
                      </View>
                    ))
                  }
                </View>
              </View>
            </Section>

            {/* ACTIONS RAPIDES - REDESIGN MODERNE */}
            <Section title="Actions Rapides" titleStyle={styles.sectionTitle}>
              <View style={styles.quickActionsGrid}>
                <QuickAction
                  label="Ajouter Membre"
                  icon={Users}
                  color="#4A6FA5"
                  onPress={() => router.push('/members')}
                />
                <QuickAction
                  label="Compte Rendu"
                  icon={FileText}
                  color="#27AE60"
                  onPress={() => router.push('/finance')}
                />
                <QuickAction
                  label="Finance"
                  icon={CreditCard}
                  color="#9B59B6"
                  onPress={() => router.push('/finance')}
                />
                <QuickAction
                  label="Événements"
                  icon={Calendar}
                  color="#E67E22"
                  onPress={() => router.push('/settings')}
                />
              </View>
            </Section>

            {/* ÉVÉNEMENTS À VENIR */}
            <Section title="Événements à venir" titleStyle={styles.sectionTitle}>
              <EventsViewer churchId={church.id} />
              {upcomingEvents === 0 && (
                <View style={styles.emptyState}>
                  <Calendar size={48} color="#BDC3C7" />
                  <Text style={styles.emptyStateText}>Aucun événement à venir</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => router.push('/settings')}>
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Créer un événement</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Section>

            {/* ACTIVITÉ RÉCENTE */}
            <Section title="Activité Récente" titleStyle={styles.sectionTitle}>
              <View style={styles.activityContainer}>
                {recentActivities.length > 0 ? (
                  <>
                    {recentActivities.map((activity, index) => (
                      <TouchableOpacity 
                        key={`${activity.type}-${activity.id}-${index}`}
                        style={styles.activityItem}
                        onPress={() => router.push('/finance')}
                      >
                        <View style={[
                          styles.activityIcon,
                          { backgroundColor: activity.type === 'report' ? '#E8F6EF' : '#FDEAEA' }
                        ]}>
                          {activity.type === 'report' ? (
                            <TrendingUp size={16} color="#27AE60" />
                          ) : (
                            <TrendingDown size={16} color="#E74C3C" />
                          )}
                        </View>
                        <View style={styles.activityContent}>
                          <Text style={styles.activityDescription}>
                            {activity.description}
                          </Text>
                          <View style={styles.activityMeta}>
                            <Text style={styles.activityDate}>
                              {activity.date.toLocaleDateString('fr-FR')}
                            </Text>
                            <Text style={[
                              styles.activityCurrency,
                              { 
                                color: activity.currency === 'FC' ? '#27AE60' :
                                       activity.currency === 'USD' ? '#2980B9' : '#8E44AD'
                              }
                            ]}>
                              {activity.currency}
                            </Text>
                            <Text style={styles.activityType}>
                              {activity.type === 'report' ? '📋 Compte rendu' : '💸 Dépense'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[
                          styles.activityAmount,
                          { color: activity.type === 'report' ? '#27AE60' : '#E74C3C' }
                        ]}>
                          {activity.type === 'report' ? '+' : '-'}
                          {formatCurrency(activity.amount, activity.currency)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity 
                      style={styles.viewAllButton} 
                      onPress={() => router.push('/finance')}
                    >
                      <Text style={styles.viewAllText}>Voir toute l'activité financière</Text>
                      <ChevronRight size={16} color="#4A6FA5" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.emptyActivity}>
                    <CreditCard size={48} color="#BDC3C7" />
                    <Text style={styles.emptyActivityText}>Aucune activité financière récente</Text>
                    <TouchableOpacity 
                      style={styles.addButton} 
                      onPress={() => router.push('/finance')}
                    >
                      <Plus size={20} color="#FFFFFF" />
                      <Text style={styles.addButtonText}>Voir la finance</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Section>
          </ScrollView>

          {/* MODAL ÉVÉNEMENTS */}
          <Modal
            visible={showEventsModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowEventsModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Gestion des Événements</Text>
                <TouchableOpacity onPress={() => setShowEventsModal(false)} style={styles.closeButton}>
                  <X size={24} color="#2C3E50" />
                </TouchableOpacity>
              </View>
              
              <EventsManagerAdmin churchId={church.id} userId={user.id} />
            </View>
          </Modal>
        </View>
      );
    }
  }
}

/* -------- COMPOSANTS INTERNES -------- */

const QuickAction = ({ label, icon: Icon, color, onPress }: any) => (
  <TouchableOpacity style={[styles.actionCard, { borderLeftColor: color }]} onPress={onPress}>
    <View style={[styles.actionIconContainer, { backgroundColor: color + '20' }]}>
      <Icon size={24} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
    <ChevronRight size={16} color="#7F8C8D" style={styles.actionArrow} />
  </TouchableOpacity>
);

const TrendingDown = ({ size, color }: { size: number; color: string }) => (
  <TrendingUp size={size} color={color} style={{ transform: [{ rotate: '180deg' }] }} />
);

/* -------- STYLES PRINCIPAUX -------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },

  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },

  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...shadows.lg,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  userTextContainer: {
    marginLeft: 12,
  },

  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },

  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
  },

  balanceContainer: {
    marginTop: 10,
  },

  balanceTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },

  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },

  otherCurrencies: {
    marginTop: 8,
  },

  otherCurrenciesTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },

  currencyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  currencyChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  currencyChipText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  content: {
    flex: 1,
  },

  mainStats: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  balanceDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  balanceDetailCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },

  balanceDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },

  balanceDetailTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#2C3E50',
  },

  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },

  currencyLabel: {
    fontSize: fontSize.sm,
    color: '#7F8C8D',
    fontWeight: '500',
  },

  currencyAmount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  quickActionsGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    ...shadows.sm,
  },

  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  actionLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#2C3E50',
  },

  actionArrow: {
    opacity: 0.6,
  },

  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },

  emptyStateText: {
    fontSize: fontSize.md,
    color: '#7F8C8D',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  activityContainer: {
    paddingHorizontal: spacing.lg,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },

  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  activityContent: {
    flex: 1,
  },

  activityDescription: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: spacing.xs,
  },

  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },

  activityDate: {
    fontSize: 11,
    color: '#7F8C8D',
  },

  activityCurrency: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  activityType: {
    fontSize: 11,
    color: '#7F8C8D',
  },

  activityAmount: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },

  emptyActivity: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },

  emptyActivityText: {
    fontSize: fontSize.md,
    color: '#7F8C8D',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },

  viewAllText: {
    fontSize: fontSize.md,
    color: '#4A6FA5',
    fontWeight: '600',
    marginRight: spacing.xs,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECF0F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});