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
} from 'react-native';
import { Users, DollarSign, TrendingUp, Bell, Plus, ChartBar as BarChart3, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import { useChurch } from '../../contexts/ChurchContext';
import { DatabaseService } from '../../lib/database';
import { SubscriptionService } from '../../lib/subscription';
import { FinancialSummary } from '../../components/FinancialSummary';
import { getThemeColors } from '../../lib/theme';
import { formatAmount, formatCurrency } from '../../utils/currency';
import type { ChurchStats } from '../../types/database';

export default function HomeScreen() {
  const { church, user, permissions } = useChurch();
  const [stats, setStats] = useState<ChurchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  const theme = church?.theme || 'blue';
  const colors = getThemeColors(theme);

  useEffect(() => {
    if (church) {
      loadDashboardData();
      loadSubscriptionStatus();
    }
  }, [church]);

  const loadDashboardData = async () => {
    if (!church) return;

    try {
      console.log('📊 Chargement données tableau de bord My Church...');
      const churchStats = await DatabaseService.getChurchStats(church.id);
      setStats(churchStats);
      console.log('✅ Données My Church chargées');
    } catch (error) {
      console.error('❌ Erreur chargement données My Church:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    if (!church) return;
    
    try {
      const status = SubscriptionService.getSubscriptionStatus(church);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('❌ Erreur statut abonnement My Church:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadSubscriptionStatus()
    ]);
    setRefreshing(false);
  };

  const getSubscriptionAlert = () => {
    if (!subscriptionStatus) return null;
    
    if (subscriptionStatus.type === 'trial' && subscriptionStatus.daysRemaining <= 7) {
      return {
        type: 'warning',
        icon: <Clock size={20} color="#f39c12" />,
        message: `Essai gratuit: ${subscriptionStatus.daysRemaining} jour${subscriptionStatus.daysRemaining > 1 ? 's' : ''} restant${subscriptionStatus.daysRemaining > 1 ? 's' : ''}`,
        action: 'Mettre à niveau'
      };
    }
    
    if (!subscriptionStatus.isActive) {
      return {
        type: 'error',
        icon: <AlertTriangle size={20} color="#e74c3c" />,
        message: 'Abonnement expiré',
        action: 'Renouveler'
      };
    }
    
    return null;
  };

  const subscriptionAlert = getSubscriptionAlert();

  if (!church) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Aucune église My Church trouvée</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement du tableau de bord My Church...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
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
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Bienvenue dans My Church
          </Text>
          <Text style={[styles.churchName, { color: colors.primary }]}>
            {church.name}
          </Text>
          {user && (
            <Text style={[styles.userInfo, { color: colors.textSecondary }]}>
              Connecté en tant que {user.role} • {user.first_name} {user.last_name}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Alerte abonnement */}
      {subscriptionAlert && (
        <View style={[
          styles.subscriptionAlert,
          { 
            backgroundColor: subscriptionAlert.type === 'error' ? colors.errorLight : colors.warningLight,
            borderColor: subscriptionAlert.type === 'error' ? colors.error : colors.warning
          }
        ]}>
          {subscriptionAlert.icon}
          <Text style={[
            styles.subscriptionAlertText,
            { color: subscriptionAlert.type === 'error' ? colors.error : colors.warning }
          ]}>
            {subscriptionAlert.message}
          </Text>
          <TouchableOpacity style={[
            styles.subscriptionAlertButton,
            { backgroundColor: subscriptionAlert.type === 'error' ? colors.error : colors.warning }
          ]}>
            <Text style={styles.subscriptionAlertButtonText}>
              {subscriptionAlert.action}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Résumé financier */}
      {stats && (
        <FinancialSummary
          balance={church.current_balance}
          totalIncome={stats.financial.totalIncome}
          totalExpenses={stats.financial.totalExpenses}
          pendingExpenses={stats.financial.pendingExpenses}
          currency={church.currency}
        />
      )}

      {/* Actions rapides */}
      <View style={styles.quickActions}>
        {permissions.canEditMembers && (
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/(tabs)/members')}
          >
            <Plus size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Nouveau membre
            </Text>
          </TouchableOpacity>
        )}

        {permissions.canEditFinances && (
          <>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/finance')}
            >
              <TrendingUp size={24} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Compte rendu
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/finance')}
            >
              <DollarSign size={24} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Nouvelle dépense
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Users size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.members.totalMembers || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Membres
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <BarChart3 size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.financial.transactionCount || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Transactions
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <CheckCircle size={20} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.financial.pendingExpenses || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            En attente
          </Text>
        </View>
      </View>

      {/* Activité récente */}
      {permissions.canViewFinances && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Activité récente
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/finance')}>
              <Text style={[styles.sectionAction, { color: colors.primary }]}>
                Voir tout
              </Text>
            </TouchableOpacity>
          </View>
        
          {stats?.recentActivity.reports.slice(0, 3).map((report) => (
            <View key={report.id} style={[styles.activityItem, { borderBottomColor: colors.border }]}>
              <View style={styles.activityIcon}>
                <TrendingUp size={16} color={colors.success} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityDescription, { color: colors.text }]}>
                  {report.description}
                </Text>
                <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                  {new Date(report.date).toLocaleDateString('fr-FR')} • Par {report.recorded_by}
                </Text>
              </View>
              <Text style={[styles.activityAmount, { color: colors.success }]}>
                +{formatCurrency(Number(report.amount), church.currency, { compact: true })}
              </Text>
            </View>
          ))}
          
          {(!stats?.recentActivity.reports || stats.recentActivity.reports.length === 0) && (
            <View style={styles.emptySection}>
              <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
                Aucune activité récente
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Informations utilisateur et rôle */}
      {user && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Votre accès My Church
            </Text>
          </View>
          
          <View style={styles.userRoleInfo}>
            <Text style={[styles.userRoleText, { color: colors.text }]}>
              👤 {user.first_name} {user.last_name}
            </Text>
            <Text style={[styles.userRoleType, { color: colors.primary }]}>
              🔐 Rôle: {user.role}
            </Text>
            <Text style={[styles.userPermissions, { color: colors.textSecondary }]}>
              📋 Permissions: {Object.keys(permissions).filter(k => permissions[k]).length} autorisations
            </Text>
          </View>
        </View>
      )}

      {/* Informations abonnement */}
      {subscriptionStatus && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Abonnement My Church
            </Text>
          </View>
          
          <View style={styles.subscriptionInfo}>
            <Text style={[styles.subscriptionType, { color: colors.text }]}>
              {subscriptionStatus.message}
            </Text>
            {subscriptionStatus.daysRemaining > 0 && (
              <Text style={[styles.subscriptionDays, { color: colors.textSecondary }]}>
                {subscriptionStatus.daysRemaining} jour{subscriptionStatus.daysRemaining > 1 ? 's' : ''} restant{subscriptionStatus.daysRemaining > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    marginBottom: 4,
  },
  churchName: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  notificationButton: {
    padding: 8,
  },
  subscriptionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  subscriptionAlertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  subscriptionAlertButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  subscriptionAlertButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
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
    flex: 1,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptySectionText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  subscriptionInfo: {
    alignItems: 'center',
  },
  subscriptionType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subscriptionDays: {
    fontSize: 14,
  },
  userInfo: {
    fontSize: 14,
    marginTop: 4,
  },
  userRoleInfo: {
    alignItems: 'center',
    gap: 4,
  },
  userRoleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userRoleType: {
    fontSize: 14,
    fontWeight: '500',
  },
  userPermissions: {
    fontSize: 12,
  },
});