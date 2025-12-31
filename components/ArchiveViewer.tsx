import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Users, TrendingUp, TrendingDown, FileText, Download } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import { getThemeColors } from '../lib/theme';
import { formatCurrency } from '../utils/currency';
import type { Archive } from '../types/database';

interface ArchiveViewerProps {
  visible: boolean;
  archive: Archive | null;
  onClose: () => void;
  theme?: 'blue' | 'white' | 'black';
  currency: string;
}

export function ArchiveViewer({ visible, archive, onClose, theme = 'blue', currency }: ArchiveViewerProps) {
  const [loading, setLoading] = useState(true);
  const [archiveData, setArchiveData] = useState<any>(null);
  const colors = getThemeColors(theme);

  useEffect(() => {
    if (visible && archive) {
      loadArchiveData();
    }
  }, [visible, archive]);

  const loadArchiveData = async () => {
    if (!archive) return;

    try {
      setLoading(true);
      // Parser les données JSON de l'archive
      const data = typeof archive.data === 'string'
        ? JSON.parse(archive.data)
        : archive.data;
      setArchiveData(data);
    } catch (error) {
      console.error('❌ Erreur chargement données archive:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de l\'archive');
    } finally {
      setLoading(false);
    }
  };

  const formatPeriod = (archive: Archive) => {
    const start = new Date(archive.period_start);
    const end = new Date(archive.period_end);

    if (archive.period_type === 'monthly') {
      const month = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return month.charAt(0).toUpperCase() + month.slice(1);
    } else {
      return `Année ${start.getFullYear()}`;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!archive) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* En-tête */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>{formatPeriod(archive)}</Text>
              <Text style={styles.headerSubtitle}>
                {archive.period_type === 'monthly' ? '📅 Archive mensuelle' : '📆 Archive annuelle'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement de l'archive...
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Informations générales */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📋 Informations générales
              </Text>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Période</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formatPeriod(archive)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date de création</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {new Date(archive.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Taille</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatSize(archive.data_size)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Créée par</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {archive.created_by || 'Système (automatique)'}
                </Text>
              </View>
            </View>

            {archiveData && (
              <>
                {/* Résumé financier */}
                {archiveData.financial_summary && (
                  <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      💰 Résumé financier
                    </Text>

                    <View style={styles.statsGrid}>
                      <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
                        <TrendingUp size={24} color={colors.success} />
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Revenus</Text>
                        <Text style={[styles.statValue, { color: colors.success }]}>
                          {formatCurrency(archiveData.financial_summary.total_income || 0, currency)}
                        </Text>
                      </View>

                      <View style={[styles.statCard, { backgroundColor: colors.error + '20' }]}>
                        <TrendingDown size={24} color={colors.error} />
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dépenses</Text>
                        <Text style={[styles.statValue, { color: colors.error }]}>
                          {formatCurrency(archiveData.financial_summary.total_expenses || 0, currency)}
                        </Text>
                      </View>

                      <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
                        <FileText size={24} color={colors.primary} />
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Solde final</Text>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                          {formatCurrency(archiveData.financial_summary.final_balance || 0, currency)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Statistiques membres */}
                {archiveData.members_summary && (
                  <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      👥 Membres
                    </Text>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Users size={20} color={colors.primary} />
                        <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>
                          Total membres
                        </Text>
                        <Text style={[styles.statItemValue, { color: colors.text }]}>
                          {archiveData.members_summary.total_members || 0}
                        </Text>
                      </View>

                      <View style={styles.statItem}>
                        <Users size={20} color={colors.info} />
                        <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>
                          Membres actifs
                        </Text>
                        <Text style={[styles.statItemValue, { color: colors.text }]}>
                          {archiveData.members_summary.active_members || 0}
                        </Text>
                      </View>

                      <View style={styles.statItem}>
                        <Users size={20} color={colors.warning} />
                        <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>
                          Personnel
                        </Text>
                        <Text style={[styles.statItemValue, { color: colors.text }]}>
                          {archiveData.members_summary.staff_count || 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Détails des comptes rendus */}
                {archiveData.reports && archiveData.reports.length > 0 && (
                  <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      📊 Comptes rendus ({archiveData.reports.length})
                    </Text>

                    {archiveData.reports.slice(0, 5).map((report: any, index: number) => (
                      <View key={index} style={[styles.reportItem, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.reportDate, { color: colors.textSecondary }]}>
                          {new Date(report.date).toLocaleDateString('fr-FR')}
                        </Text>
                        <Text style={[styles.reportAmount, { color: colors.success }]}>
                          {formatCurrency(report.amount, currency)}
                        </Text>
                        <Text style={[styles.reportCategory, { color: colors.text }]}>
                          {report.category}
                        </Text>
                      </View>
                    ))}

                    {archiveData.reports.length > 5 && (
                      <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                        ... et {archiveData.reports.length - 5} autres comptes rendus
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Actions */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                ⚡ Actions
              </Text>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Alert.alert(
                    'Téléchargement',
                    'Fonctionnalité de téléchargement à venir'
                  );
                }}
              >
                <Download size={20} color="white" />
                <Text style={styles.actionButtonText}>Télécharger l'archive (ZIP)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    padding: 8,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statItemLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  statItemValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  reportItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reportDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  reportAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  reportCategory: {
    fontSize: 14,
  },
  moreText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
