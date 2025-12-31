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
import { Users, DollarSign, TrendingUp, Calendar, Bell, X } from 'lucide-react-native';
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
import { formatCurrency } from '../../utils/currency';
import type { ChurchStats } from '../../types/database';

export default function HomeScreen() {
  const { church, user } = useChurch();
  const [stats, setStats] = useState<ChurchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(false);

  // Chargement optimisé avec useCallback
  const loadDashboard = useCallback(async () => {
    if (!church) return;

    try {
      const churchStats = await DatabaseService.getChurchStats(church.id);
      setStats(churchStats ?? { financial: {}, members: {}, events: {} });
    } catch (error) {
      console.error('Error loading dashboard:', error);
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
      const balance = stats?.financial?.balance ?? 0;
      const totalMembers = stats?.members?.totalMembers ?? 0;
      const upcomingEvents = stats?.events?.upcomingEvents ?? 0;

      return (
        <View style={styles.container}>
          {/* HEADER */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                {church.logo_url ? (
                  <Image source={{ uri: church.logo_url }} style={styles.headerLogo} />
                ) : (
                  <LogoComponent size={48} showText={false} />
                )}

                <View>
                  <Text style={styles.greeting}>Bienvenue,</Text>
                  <Text style={styles.userName}>{user.first_name || 'Admin'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setShowEventsModal(true)}
              >
                <Bell size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* CONTENU */}
          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* STATS GRID */}
            <View style={styles.statsGrid}>
              <StatCard
                icon={<Users size={24} color={colors.primary} />}
                title="Membres"
                value={String(totalMembers)}
                onPress={() => router.push('/members')}
              />

              <StatCard
                icon={<DollarSign size={24} color={colors.success} />}
                title="Solde"
                value={formatCurrency(balance, church?.currency || 'USD')}
                onPress={() => router.push('/finance')}
              />
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                icon={<TrendingUp size={24} color={colors.info} />}
                title="Rapport du jour"
                value="Créer"
                onPress={() => router.push('/finance')}
              />

              <StatCard
                icon={<Calendar size={24} color={colors.warning} />}
                title="Événements"
                value={String(upcomingEvents)}
                onPress={() => router.push('/settings')}
              />
            </View>

            {/* ÉVÉNEMENTS */}
            <Section title="📅 Événements à venir">
              <EventsViewer churchId={church.id} />
            </Section>

            {/* ACTIONS RAPIDES */}
            <Section title="Actions Rapides">
              <View style={styles.quickActions}>
                <QuickAction
                  label="Ajouter Membre"
                  icon={Users}
                  color={colors.primary}
                  onPress={() => router.push('/members')}
                />
                <QuickAction
                  label="Nouveau Compte Rendu"
                  icon={DollarSign}
                  color={colors.success}
                  onPress={() => router.push('/finance')}
                />
                <QuickAction
                  label="Voir Rapports"
                  icon={TrendingUp}
                  color={colors.info}
                  onPress={() => router.push('/reports')}
                />
                <QuickAction
                  label="Événements"
                  icon={Calendar}
                  color={colors.warning}
                  onPress={() => router.push('/settings')}
                />
              </View>
            </Section>

            {/* ACTIVITÉ RÉCENTE */}
            <Section title="Activité Récente">
              <View style={styles.activityList}>
                <Text style={styles.emptyText}>Aucune activité récente</Text>
              </View>
            </Section>
          </ScrollView>

          {/* MODAL EVENEMENTS */}
          <Modal
            visible={showEventsModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowEventsModal(false)}
          >
            <View style={{ flex: 1 }}>
              <EventsManagerAdmin churchId={church.id} userId={user.id} />

              <TouchableOpacity style={styles.closeModal} onPress={() => setShowEventsModal(false)}>
                <X size={24} color="#7f8c8d" />
              </TouchableOpacity>
            </View>
          </Modal>
        </View>
      );
    }
  }
}

/* -------- QUICK ACTION COMPONENT -------- */

const QuickAction = ({ label, icon: Icon, color, onPress }) => (
  <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
    <Icon size={20} color="#ffffff" />
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

/* -------- STYLES -------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    ...shadows.md,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },

  userName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#ffffff',
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    flex: 1,
  },

  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },

  actionText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  activityList: {
    padding: spacing.md,
  },

  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
  },

  closeModal: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    ...shadows.md,
  },
});
  