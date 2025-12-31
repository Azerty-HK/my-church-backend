import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Shield, Search, Filter, Clock, User, Settings, FileText, Users, DollarSign, X } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import { useChurch } from '../contexts/ChurchContext';
import type { AuditLogEntry } from '../types/database';

interface AuditLogViewerProps {
  visible: boolean;
  onClose: () => void;
}

export function AuditLogViewer({ visible, onClose }: AuditLogViewerProps) {
  const { church, permissions } = useChurch();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    if (visible && church) {
      loadAuditLogs();
    }
  }, [visible, church]);

  useEffect(() => {
    filterLogs();
  }, [auditLogs, searchQuery, filterAction]);

  const loadAuditLogs = async () => {
    if (!church) return;
    
    setLoading(true);
    try {
      const logs = await DatabaseService.getAuditLogs(church.id);
      setAuditLogs(logs);
    } catch (error) {
      console.error('❌ Erreur chargement audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = auditLogs;

    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(query) ||
        log.resource_type.toLowerCase().includes(query) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return <User size={16} color="#3498db" />;
    }
    if (action.includes('USER')) {
      return <Users size={16} color="#9b59b6" />;
    }
    if (action.includes('CHURCH') || action.includes('SETTINGS')) {
      return <Settings size={16} color="#f39c12" />;
    }
    if (action.includes('FINANCE') || action.includes('EXPENSE') || action.includes('REPORT')) {
      return <DollarSign size={16} color="#27ae60" />;
    }
    return <FileText size={16} color="#7f8c8d" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return '#e74c3c';
    if (action.includes('CREATE')) return '#27ae60';
    if (action.includes('UPDATE')) return '#f39c12';
    return '#3498db';
  };

  const formatActionName = (action: string) => {
    const actionMap: Record<string, string> = {
      'LOGIN': '🔐 Connexion',
      'LOGOUT': '🚪 Déconnexion',
      'CREATE_USER': '👤 Création utilisateur',
      'UPDATE_USER': '✏️ Modification utilisateur',
      'DELETE_USER': '🗑️ Suppression utilisateur',
      'CREATE_MEMBER': '👥 Ajout membre',
      'UPDATE_MEMBER': '✏️ Modification membre',
      'DELETE_MEMBER': '🗑️ Suppression membre',
    };
    return actionMap[action] || action;
  };

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

  if (!permissions.canViewAudit) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#7f8c8d" />
          </TouchableOpacity>
          <Text style={styles.title}>🛡️ Journal d'audit</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Filtres */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#7f8c8d" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher dans les logs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionFilters}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterAction === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setFilterAction('all')}
            >
              <Text style={[
                styles.filterButtonText,
                filterAction === 'all' && styles.filterButtonTextActive
              ]}>
                Toutes
              </Text>
            </TouchableOpacity>
            
            {uniqueActions.map((action) => (
              <TouchableOpacity
                key={action}
                style={[
                  styles.filterButton,
                  filterAction === action && styles.filterButtonActive
                ]}
                onPress={() => setFilterAction(action)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterAction === action && styles.filterButtonTextActive
                ]}>
                  {formatActionName(action)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Chargement du journal d'audit...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Activités ({filteredLogs.length})
              </Text>
              
              {filteredLogs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logHeader}>
                    <View style={styles.logAction}>
                      {getActionIcon(log.action)}
                      <Text style={[styles.logActionText, { color: getActionColor(log.action) }]}>
                        {formatActionName(log.action)}
                      </Text>
                    </View>
                    <Text style={styles.logDate}>
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </Text>
                  </View>
                  
                  <View style={styles.logDetails}>
                    <Text style={styles.logResource}>
                      📋 {log.resource_type}
                      {log.resource_id && ` (ID: ${log.resource_id.substring(0, 8)}...)`}
                    </Text>
                    
                    {log.details && (
                      <Text style={styles.logDetailsText}>
                        💡 {JSON.stringify(log.details, null, 2)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              
              {filteredLogs.length === 0 && (
                <View style={styles.emptyState}>
                  <Shield size={48} color="#bdc3c7" />
                  <Text style={styles.emptyText}>
                    {searchQuery || filterAction !== 'all' 
                      ? 'Aucun log trouvé'
                      : 'Aucune activité enregistrée'
                    }
                  </Text>
                </View>
              )}
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 24,
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2c3e50',
  },
  actionFilters: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  filterButtonTextActive: {
    color: 'white',
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
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  logDetails: {
    gap: 4,
  },
  logResource: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  logDetailsText: {
    fontSize: 10,
    color: '#adb5bd',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
  },
});