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
  Users,
  UserPlus,
  UserCheck,
  UserX,
  FileText,
  Download,
  MessageSquare,
  Calendar,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DatabaseService } from '../lib/database';
import { LineChart } from 'react-native-chart-kit';
import { EventsViewer } from './EventsViewer';
import type { Church, Member } from '../types/database';

interface SecretaryDashboardProps {
  church: Church;
  onRefresh?: () => void;
}

export function SecretaryDashboard({ church, onRefresh }: SecretaryDashboardProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Couleurs Secrétaire : Violet / Bleu profond
  const colors = {
    primary: '#8B5CF6',
    secondary: '#1E40AF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
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
      const membersData = await DatabaseService.getMembers(church.id);
      setMembers(membersData);
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

  // Calculs statistiques
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'Active').length;
  const inactiveMembers = members.filter((m) => m.status === 'Inactive').length;

  // Nouveaux inscrits du mois
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newMembersThisMonth = members.filter((m) => {
    if (!m.joining_date) return false;
    const joinDate = new Date(m.joining_date);
    return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
  }).length;

  // Données pour le graphique d'évolution (6 derniers mois)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return date;
  });

  const membersByMonth = last6Months.map((date) => {
    return members.filter((m) => {
      if (!m.joining_date) return false;
      const joinDate = new Date(m.joining_date);
      return joinDate <= date;
    }).length;
  });

  const chartData = {
    labels: last6Months.map((d) =>
      d.toLocaleDateString('fr-FR', { month: 'short' })
    ),
    datasets: [
      {
        data: membersByMonth.length > 0 ? membersByMonth : [0],
        color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        strokeWidth: 3,
      },
    ],
    legend: ['Évolution membres'],
  };

  // Derniers membres inscrits
  const recentMembers = [...members]
    .sort((a, b) => {
      const dateA = new Date(a.joining_date || 0).getTime();
      const dateB = new Date(b.joining_date || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

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
              <Users size={28} color="white" strokeWidth={2.5} />
              <Text style={styles.title}>Tableau de Bord</Text>
            </View>
            <Text style={styles.subtitle}>Interface Secrétaire</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Cartes statistiques membres */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
            <Users size={24} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total membres
            </Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {totalMembers}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
            <UserCheck size={24} color={colors.success} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Membres actifs
            </Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {activeMembers}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.warning + '20' }]}>
            <UserX size={24} color={colors.warning} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Membres inactifs
            </Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {inactiveMembers}
            </Text>
          </View>
        </View>

        {/* Nouveaux du mois */}
        <View style={[styles.highlightCard, { backgroundColor: colors.secondary }]}>
          <UserPlus size={32} color="white" />
          <View style={styles.highlightContent}>
            <Text style={styles.highlightLabel}>Nouveaux inscrits ce mois</Text>
            <Text style={styles.highlightValue}>{newMembersThisMonth}</Text>
          </View>
        </View>

        {/* Graphique évolution membres */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📈 Évolution du nombre de membres
          </Text>

          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 60}
            height={220}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
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

        {/* Raccourcis Actions rapides */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ⚡ Actions rapides
          </Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/members')}
            >
              <UserPlus size={24} color="white" />
              <Text style={styles.actionText}>Ajouter membre</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.secondary }]}
              onPress={() => router.push('/members')}
            >
              <Users size={24} color="white" />
              <Text style={styles.actionText}>Consulter fiche</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.success }]}
              onPress={() => router.push('/members')}
            >
              <Download size={24} color="white" />
              <Text style={styles.actionText}>Exporter liste</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.warning }]}
              onPress={() => router.push('/settings')}
            >
              <MessageSquare size={24} color="white" />
              <Text style={styles.actionText}>Communications</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Derniers membres inscrits */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            👥 Derniers membres inscrits
          </Text>

          {recentMembers.map((member, index) => (
            <View key={index} style={[styles.memberItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.memberIcon, { backgroundColor: colors.primary + '20' }]}>
                <Users size={20} color={colors.primary} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {member.first_name} {member.last_name}
                </Text>
                <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                  {member.role || 'Membre'}
                </Text>
              </View>
              <View>
                <Text style={[styles.memberDate, { color: colors.textSecondary }]}>
                  {member.joining_date
                    ? new Date(member.joining_date).toLocaleDateString('fr-FR')
                    : 'N/A'}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        member.status === 'Active'
                          ? colors.success + '20'
                          : colors.warning + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: member.status === 'Active' ? colors.success : colors.warning,
                      },
                    ]}
                  >
                    {member.status || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {recentMembers.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun membre inscrit récemment
            </Text>
          )}
        </View>

        {/* Documents & Archives */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📁 Documents & Archives administratives
          </Text>
          <Text style={[styles.archiveInfo, { color: colors.textSecondary }]}>
            📅 Archives mensuelles : générées automatiquement chaque 1er du mois
            {'\n'}
            📆 Archives annuelles : générées automatiquement chaque 1er janvier
          </Text>
          <View style={styles.documentActions}>
            <TouchableOpacity
              style={[styles.documentButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/settings')}
            >
              <FileText size={20} color="white" />
              <Text style={styles.documentButtonText}>Gérer documents</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.documentButton, { backgroundColor: colors.secondary }]}
              onPress={() => router.push('/reports')}
            >
              <Calendar size={20} color="white" />
              <Text style={styles.documentButtonText}>Voir archives</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightContent: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
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
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
  },
  memberDate: {
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  archiveInfo: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  documentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  documentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  documentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
