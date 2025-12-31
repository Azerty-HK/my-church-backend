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
  RefreshControl,
} from 'react-native';
import { X, Calendar, Download, Eye, RotateCcw, FileArchive, Info, Trash2 } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import { ArchiveViewer } from './ArchiveViewer';
import { ArchiveScheduler } from '../services/archiveScheduler';
import { getThemeColors } from '../lib/theme';
import type { Archive } from '../types/database';

interface ArchivesManagementProps {
  visible: boolean;
  onClose: () => void;
  churchId: string;
  currency: string;
  theme?: 'blue' | 'white' | 'black';
  isAdmin?: boolean;
}

export function ArchivesManagement({
  visible,
  onClose,
  churchId,
  currency,
  theme = 'blue',
  isAdmin = false
}: ArchivesManagementProps) {
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>('monthly');
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const colors = getThemeColors(theme);

  useEffect(() => {
    if (visible) {
      loadArchives();
    }
  }, [visible]);

  const loadArchives = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getArchives(churchId);
      setArchives(data);
    } catch (error) {
      console.error('❌ Erreur chargement archives:', error);
      Alert.alert('Erreur', 'Impossible de charger les archives');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArchives();
    setRefreshing(false);
  };

  const handleViewArchive = (archive: Archive) => {
    setSelectedArchive(archive);
    setShowViewer(true);
  };

  const handleDownloadArchive = (archive: Archive) => {
    Alert.alert(
      'Téléchargement',
      `Télécharger l'archive ${formatPeriod(archive)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Télécharger',
          onPress: () => {
            // TODO: Implémenter le téléchargement
            Alert.alert('Info', 'Fonctionnalité de téléchargement à venir');
          }
        }
      ]
    );
  };

  const handleRestoreArchive = (archive: Archive) => {
    if (!isAdmin) {
      Alert.alert('Erreur', 'Seuls les administrateurs peuvent restaurer des archives');
      return;
    }

    Alert.alert(
      '⚠️ Restaurer l\'archive',
      `Êtes-vous sûr de vouloir restaurer l'archive ${formatPeriod(archive)} ?\n\nCette action remplacera les données actuelles par celles de l'archive.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implémenter la restauration
              Alert.alert('Info', 'Fonctionnalité de restauration à venir');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de restaurer l\'archive');
            }
          }
        }
      ]
    );
  };

  const handleDeleteArchive = async (archive: Archive) => {
    if (!isAdmin) {
      Alert.alert('Erreur', 'Seuls les administrateurs peuvent supprimer des archives');
      return;
    }

    Alert.alert(
      '⚠️ Supprimer l\'archive',
      `Êtes-vous sûr de vouloir supprimer définitivement l'archive ${formatPeriod(archive)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteArchive(archive.id);
              await loadArchives();
              Alert.alert('✅ Succès', 'Archive supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'archive');
            }
          }
        }
      ]
    );
  };

  const formatPeriod = (archive: Archive) => {
    const start = new Date(archive.period_start);

    if (archive.period_type === 'monthly') {
      return start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } else {
      return `Année ${start.getFullYear()}`;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredArchives = archives.filter(a => a.period_type === activeTab);

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* En-tête */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>🗄️ Archives</Text>
                <Text style={styles.headerSubtitle}>
                  Gestion des archives automatiques
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages informatifs */}
          <View style={[styles.infoSection, { backgroundColor: colors.info + '20' }]}>
            <Info size={20} color={colors.info} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoText, { color: colors.text }]}>
                📅 <Text style={{ fontWeight: '700' }}>Archives mensuelles:</Text> Créées automatiquement chaque 1er du mois (00:00)
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                📆 <Text style={{ fontWeight: '700' }}>Archives annuelles:</Text> Créées automatiquement chaque 1er janvier (00:00)
              </Text>
            </View>
          </View>

          {/* Onglets */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                { borderBottomColor: colors.border },
                activeTab === 'monthly' && { borderBottomColor: colors.primary }
              ]}
              onPress={() => setActiveTab('monthly')}
            >
              <Calendar size={20} color={activeTab === 'monthly' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === 'monthly' && { color: colors.primary, fontWeight: '700' }
              ]}>
                Mensuelles ({archives.filter(a => a.period_type === 'monthly').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                { borderBottomColor: colors.border },
                activeTab === 'yearly' && { borderBottomColor: colors.primary }
              ]}
              onPress={() => setActiveTab('yearly')}
            >
              <FileArchive size={20} color={activeTab === 'yearly' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === 'yearly' && { color: colors.primary, fontWeight: '700' }
              ]}>
                Annuelles ({archives.filter(a => a.period_type === 'yearly').length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Liste des archives */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Chargement des archives...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }
            >
              {filteredArchives.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FileArchive size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Aucune archive {activeTab === 'monthly' ? 'mensuelle' : 'annuelle'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Les archives seront créées automatiquement
                  </Text>
                </View>
              ) : (
                filteredArchives.map((archive) => (
                  <View key={archive.id} style={[styles.archiveCard, { backgroundColor: colors.surface }]}>
                    {/* En-tête de la carte */}
                    <View style={styles.archiveHeader}>
                      <View style={styles.archiveTitleContainer}>
                        <Text style={[styles.archivePeriod, { color: colors.text }]}>
                          {formatPeriod(archive)}
                        </Text>
                        <Text style={[styles.archiveDate, { color: colors.textSecondary }]}>
                          Créée le {new Date(archive.created_at).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                      <View style={[styles.archiveSizeBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.archiveSize, { color: colors.primary }]}>
                          {formatSize(archive.data_size)}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.archiveActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleViewArchive(archive)}
                      >
                        <Eye size={16} color="white" />
                        <Text style={styles.actionBtnText}>Voir</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.success }]}
                        onPress={() => handleDownloadArchive(archive)}
                      >
                        <Download size={16} color="white" />
                        <Text style={styles.actionBtnText}>Télécharger</Text>
                      </TouchableOpacity>

                      {isAdmin && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                            onPress={() => handleRestoreArchive(archive)}
                          >
                            <RotateCcw size={16} color="white" />
                            <Text style={styles.actionBtnText}>Restaurer</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.error }]}
                            onPress={() => handleDeleteArchive(archive)}
                          >
                            <Trash2 size={16} color="white" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Viewer d'archive */}
      <ArchiveViewer
        visible={showViewer}
        archive={selectedArchive}
        onClose={() => {
          setShowViewer(false);
          setSelectedArchive(null);
        }}
        theme={theme}
        currency={currency}
      />
    </>
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
    fontSize: 28,
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
  infoSection: {
    flexDirection: 'row',
    padding: 16,
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  archiveCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  archiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  archiveTitleContainer: {
    flex: 1,
  },
  archivePeriod: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  archiveDate: {
    fontSize: 12,
  },
  archiveSizeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  archiveSize: {
    fontSize: 12,
    fontWeight: '700',
  },
  archiveActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});
