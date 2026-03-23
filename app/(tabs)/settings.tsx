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
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Settings, User, Church, Palette, DollarSign, Shield, Users, FileText, LogOut, Info, Crown, Eye, CreditCard, Star, MessageCircle, Download, Bell, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useChurch } from '../../contexts/ChurchContext';
import { AuthService } from '../../lib/auth';
import { DatabaseService } from '../../lib/database';
import { SubscriptionManagement } from '../../components/SubscriptionManagement';
import { ValidationService } from '../../utils/validation';
import { UserManagementModal } from '../../components/UserManagementModal';
import { AuditLogViewer } from '../../components/AuditLogViewer';
import { EventsManagement } from '../../components/EventsManagement';
import { EventsManagerAdmin } from '../../components/EventsManagerAdmin';
import { AboutModal } from '../../components/AboutModal';
import { MessagingSystem } from '../../components/MessagingSystem';
import { getThemeColors, THEME_CONFIGS } from '../../lib/theme';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';
import { UpdateService } from '../../services/updateService';

export default function SettingsScreen() {
  const { church, user, permissions, updateChurch, refreshChurch } = useChurch();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showEventsManagement, setShowEventsManagement] = useState(false);
  const [showEventReminders, setShowEventReminders] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showChurchSettings, setShowChurchSettings] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false);
  const [showPublicLinksModal, setShowPublicLinksModal] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Formulaire église (SANS logo_url)
  const [churchForm, setChurchForm] = useState({
    name: '',
    address: '',
    phone: '',
    currency: 'FC' as 'FC' | 'USD' | 'EURO',
    theme: 'blue' as 'blue' | 'white' | 'black',
    expense_limit: '',
    archive_frequency: 'monthly' as 'monthly' | 'yearly',
  });
  const [churchErrors, setChurchErrors] = useState<Record<string, string>>({});
  const [updatingChurch, setUpdatingChurch] = useState(false);

  // Gestion des liens publics
  const [publicLinks, setPublicLinks] = useState<any[]>([]);
  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    description: '',
    platform: 'Autre' as 'YouTube' | 'Facebook' | 'Autre',
  });
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [addingLink, setAddingLink] = useState(false);

  const theme = church?.theme || 'blue';
  const colors = getThemeColors(theme);

  useEffect(() => {
    if (church) {
      setChurchForm({
        name: church.name,
        address: church.address || '',
        phone: church.phone || '',
        currency: church.currency,
        theme: church.theme,
        expense_limit: church.expense_limit?.toString() || '1000',
        archive_frequency: church.archive_frequency || 'monthly',
      });
      loadPublicLinks();
    }
  }, [church]);

  const loadPublicLinks = async () => {
    if (!church) return;
    try {
      // ✅ CORRECTION: Utiliser le service direct, PAS fetch
      const links = await DatabaseService.getChurchPublicLinks(church.id);
      setPublicLinks(Array.isArray(links) ? links : []);
    } catch (error) {
      console.error('❌ Erreur chargement liens publics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshChurch();
    setRefreshing(false);
  };

  const validateChurchForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    const nameValidation = ValidationService.validateChurchName(churchForm.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error!;
    }
    
    // ADRESSE ET TÉLÉPHONE SONT OPTIONNELS - PAS DE VALIDATION
    // Seule validation pour le téléphone s'il est rempli
    if (churchForm.phone.trim()) {
      const phoneValidation = ValidationService.validatePhone(churchForm.phone);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error!;
      }
    }
    
    // Validation de expense_limit
    if (!churchForm.expense_limit.trim()) {
      errors.expense_limit = 'La limite de dépense est obligatoire';
    } else {
      const amount = parseFloat(churchForm.expense_limit);
      if (isNaN(amount)) {
        errors.expense_limit = 'Le montant doit être un nombre valide';
      } else if (amount <= 0) {
        errors.expense_limit = 'Le montant doit être supérieur à 0';
      } else if (amount > 1000000) {
        errors.expense_limit = 'Le montant ne peut pas dépasser 1,000,000';
      }
    }
    
    setChurchErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateChurch = async () => {
    if (!church || !user) {
      Alert.alert('Erreur', 'Données manquantes');
      return;
    }

    if (!permissions.canManageSettings) {
      Alert.alert('Erreur', 'Vous n\'avez pas les permissions pour modifier les paramètres');
      return;
    }

    // Valider le formulaire
    if (!validateChurchForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setUpdatingChurch(true);
    try {
      // SUPPRIMÉ: logo_url de tous les updates
      const updates = {
        name: churchForm.name.trim(),
        // Adresse et téléphone optionnels - envoyer même si vides
        address: churchForm.address.trim() || null,
        phone: churchForm.phone.trim() || null,
        // NE PAS PERMETTRE DE CHANGER LA DEVISE PRINCIPALE
        theme: churchForm.theme,
        expense_limit: parseFloat(churchForm.expense_limit) || 1000,
        archive_frequency: churchForm.archive_frequency,
      };

      console.log('📤 Mise à jour église:', updates);
      
      await updateChurch(updates);
      
      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'UPDATE_CHURCH',
        resource_type: 'Church',
        resource_id: church.id,
        details: updates
      });
      
      setShowChurchSettings(false);
      Alert.alert('✅ Succès', 'Paramètres de l\'église mis à jour avec succès');
      
      // Rafraîchir l'église après modification
      await refreshChurch();
    } catch (error: any) {
      console.error('❌ Erreur mise à jour église:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible de mettre à jour les paramètres');
    } finally {
      setUpdatingChurch(false);
    }
  };

  const validateLinkForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!newLink.title.trim()) {
      errors.title = 'Le titre est obligatoire';
    }
    
    const urlValidation = ValidationService.validateUrl(newLink.url);
    if (!urlValidation.isValid) {
      errors.url = urlValidation.error!;
    }
    
    setLinkErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddPublicLink = async () => {
    if (!church || !user || !validateLinkForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setAddingLink(true);
    try {
      await DatabaseService.createPublicLink({
        church_id: church.id,
        title: newLink.title.trim(),
        url: newLink.url.trim(),
        description: newLink.description.trim() || undefined,
        platform: newLink.platform,
      });

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'CREATE_PUBLIC_LINK',
        resource_type: 'Church',
        resource_id: church.id,
        details: { title: newLink.title, platform: newLink.platform }
      });

      setNewLink({ title: '', url: '', description: '', platform: 'Autre' });
      setLinkErrors({});
      await loadPublicLinks();
      
      Alert.alert('✅ Succès', 'Lien public ajouté avec succès');
    } catch (error: any) {
      Alert.alert('❌ Erreur', error.message || 'Impossible d\'ajouter le lien');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeletePublicLink = async (linkId: string) => {
    if (!church || !user) return;

    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce lien public ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deletePublicLink(linkId);
              await loadPublicLinks();
              Alert.alert('✅ Succès', 'Lien supprimé');
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de supprimer le lien');
            }
          }
        }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Début déconnexion My Church...');
              setLoading(true);
              await AuthService.signOut();
              console.log('✅ Déconnexion réussie, redirection...');
              
              // Attendre un peu pour s'assurer que le nettoyage est terminé
              setTimeout(() => {
                router.replace('/welcome');
              }, 500);
            } catch (error) {
              console.error('❌ Erreur déconnexion:', error);
              // Même en cas d'erreur, on redirige
              console.log('⚠️ Redirection forcée après erreur...');
              router.replace('/welcome');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const result = await UpdateService.checkForUpdates();

      if (result.hasUpdate && result.latestVersion) {
        Alert.alert(
          '🆕 Mise à jour disponible',
          `Version ${result.latestVersion.version} est disponible!\n\nVoulez-vous mettre à jour maintenant?`,
          [
            { text: 'Plus tard', style: 'cancel' },
            {
              text: 'Mettre à jour',
              onPress: async () => {
                try {
                  await UpdateService.performUpdate();
                  Alert.alert('✅ Succès', 'Mise à jour effectuée avec succès');
                } catch (error) {
                  Alert.alert('❌ Erreur', 'Impossible de mettre à jour l\'application');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('✅ À jour', 'Vous utilisez déjà la dernière version de l\'application');
      }
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de vérifier les mises à jour');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Crown size={20} color="#e74c3c" />;
      case 'Trésorier': return <DollarSign size={20} color="#f39c12" />;
      case 'Secrétaire': return <FileText size={20} color="#3498db" />;
      case 'Lecteur': return <Eye size={20} color="#7f8c8d" />;
      default: return <User size={20} color="#7f8c8d" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return '#e74c3c';
      case 'Trésorier': return '#f39c12';
      case 'Secrétaire': return '#3498db';
      case 'Lecteur': return '#7f8c8d';
      default: return '#7f8c8d';
    }
  };

  if (!church || !user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Aucune église ou utilisateur trouvé</Text>
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
              <Settings size={28} color="white" strokeWidth={2.5} />
              <Text style={styles.title}>Paramètres</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{user?.role}</Text>
                <Text style={styles.statLabel}>Votre rôle</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{Object.keys(permissions).filter(k => permissions[k]).length}</Text>
                <Text style={styles.statLabel}>Permissions</Text>
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
        {/* Informations utilisateur */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <User size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              👤 Mon compte
            </Text>
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.userCard}>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {user.first_name} {user.last_name}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user.email}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                  {getRoleIcon(user.role)}
                  <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                    {user.role}
                  </Text>
                </View>
              </View>
            </View>
            
            <Text style={[styles.permissionsText, { color: colors.textSecondary }]}>
              🔐 Permissions actives: {Object.keys(permissions).filter(k => permissions[k]).length}
            </Text>
          </View>
        </View>

        {/* Informations église */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Church size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ⛪ Mon église
            </Text>
            {permissions.canManageSettings && (
              <TouchableOpacity onPress={() => setShowChurchSettings(true)}>
                <Text style={[styles.sectionAction, { color: colors.primary }]}>
                  Modifier
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.churchInfo}>
            <Text style={[styles.churchName, { color: colors.text }]}>
              {church.name}
            </Text>
            <Text style={[styles.churchDetails, { color: colors.textSecondary }]}>
              📧 {church.email}
            </Text>
            {church.phone && (
              <Text style={[styles.churchDetails, { color: colors.textSecondary }]}>
                📞 {church.phone}
              </Text>
            )}
            {church.address && (
              <Text style={[styles.churchDetails, { color: colors.textSecondary }]}>
                📍 {church.address}
              </Text>
            )}
            <Text style={[styles.churchDetails, { color: colors.text }]}>
              ⭐ Devise principale: <Text style={{ fontWeight: 'bold' }}>{church.currency}</Text>
            </Text>
            <Text style={[styles.churchDetails, { color: colors.textSecondary }]}>
              🎨 Thème: {church.theme}
            </Text>
            <Text style={[styles.churchDetails, { color: colors.textSecondary }]}>
              💰 Limite de dépense: {church.expense_limit || 1000} {church.currency}
            </Text>
          </View>
        </View>

        {/* Messagerie */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity 
            style={styles.messagingButton}
            onPress={() => setShowMessaging(true)}
          >
            <MessageCircle size={20} color={colors.primary} />
            <Text style={[styles.messagingButtonText, { color: colors.text }]}>
              💬 Messagerie interne
            </Text>
          </TouchableOpacity>
        </View>

        {/* Gestion d'abonnement */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity 
            style={styles.subscriptionButton}
            onPress={() => setShowSubscriptionManagement(true)}
          >
            <CreditCard size={20} color={colors.primary} />
            <Text style={[styles.subscriptionButtonText, { color: colors.text }]}>
              💎 Gestion d'abonnement
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions administratives */}
        {(permissions.canManageUsers || permissions.canViewAudit || permissions.canManageEvents) && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🛡️ Administration
              </Text>
            </View>
            
            <View style={styles.adminActions}>
              {permissions.canManageUsers && (
                <TouchableOpacity 
                  style={[styles.adminButton, { borderColor: colors.border }]}
                  onPress={() => setShowUserManagement(true)}
                >
                  <Users size={20} color="#9b59b6" />
                  <Text style={[styles.adminButtonText, { color: colors.text }]}>
                    👥 Gestion des utilisateurs
                  </Text>
                </TouchableOpacity>
              )}

              {permissions.canViewAudit && (
                <TouchableOpacity 
                  style={[styles.adminButton, { borderColor: colors.border }]}
                  onPress={() => setShowAuditLog(true)}
                >
                  <Shield size={20} color="#e74c3c" />
                  <Text style={[styles.adminButtonText, { color: colors.text }]}>
                    🛡️ Journal d'audit
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.adminButton, { borderColor: colors.border }]}
                onPress={() => {
                  if (!church || !user) {
                    Alert.alert('Erreur', 'Veuillez attendre le chargement complet');
                    return;
                  }
                  setShowEventReminders(true);
                }}
              >
                <Bell size={20} color="#f39c12" />
                <Text style={[styles.adminButtonText, { color: colors.text }]}>
                  ⏰ Événements & Rappels
                </Text>
              </TouchableOpacity>

              {permissions.canManageEvents && (
                <TouchableOpacity
                  style={[styles.adminButton, { borderColor: colors.border }]}
                  onPress={() => setShowEventsManagement(true)}
                >
                  <FileText size={20} color="#27ae60" />
                  <Text style={[styles.adminButtonText, { color: colors.text }]}>
                    📅 Gestion des événements (avancé)
                  </Text>
                </TouchableOpacity>
              )}

              {user.role === 'Admin' && (
                <TouchableOpacity 
                  style={[styles.adminButton, { borderColor: colors.border }]}
                  onPress={() => setShowPublicLinksModal(true)}
                >
                  <FileText size={20} color="#3498db" />
                  <Text style={[styles.adminButtonText, { color: colors.text }]}>
                    🌐 Liens publics ({publicLinks.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Mises à jour */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleCheckForUpdates}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Download size={20} color={colors.primary} />
            )}
            <Text style={[styles.updateButtonText, { color: colors.text }]}>
              🔄 Vérifier les mises à jour
            </Text>
          </TouchableOpacity>
        </View>

        {/* À propos */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.aboutButton}
            onPress={() => setShowAboutModal(true)}
          >
            <Info size={20} color={colors.primary} />
            <Text style={[styles.aboutButtonText, { color: colors.text }]}>
              ℹ️ À propos de l'application
            </Text>
          </TouchableOpacity>
        </View>

        {/* Déconnexion */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity 
            style={[styles.signOutButton, { backgroundColor: colors.error }]}
            onPress={handleSignOut}
          >
            <LogOut size={20} color="white" />
            <Text style={styles.signOutButtonText}>🚪 Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        {/* Signature */}
        <View style={styles.signature}>
          <Star size={16} color="#f39c12" />
          <Text style={styles.signatureText}>Created by Henock Aduma</Text>
          <Star size={16} color="#f39c12" />
        </View>
      </ScrollView>

      {/* Modal paramètres église */}
      {permissions.canManageSettings && (
        <Modal visible={showChurchSettings} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowChurchSettings(false)}>
                <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>⛪ Paramètres église</Text>
              <TouchableOpacity 
                onPress={handleUpdateChurch}
                disabled={updatingChurch}
              >
                <Text style={[styles.modalSave, { color: colors.primary }]}>
                  {updatingChurch ? 'Sauvegarde...' : 'Sauvegarder'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nom de l'église *</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      churchErrors.name && { borderColor: colors.error }
                    ]}
                    placeholder="Nom de l'église"
                    placeholderTextColor={colors.textSecondary}
                    value={churchForm.name}
                    onChangeText={(text) => setChurchForm(prev => ({ ...prev, name: text }))}
                  />
                  {churchErrors.name && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {churchErrors.name}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Adresse (Optionnel)</Text>
                  <TextInput
                    style={[styles.fieldInput, { borderColor: colors.border, color: colors.text }]}
                    placeholder="Adresse complète"
                    placeholderTextColor={colors.textSecondary}
                    value={churchForm.address}
                    onChangeText={(text) => setChurchForm(prev => ({ ...prev, address: text }))}
                    multiline
                    numberOfLines={2}
                  />
                  <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    📍 Ce champ n'est pas obligatoire
                  </Text>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Téléphone (Optionnel)</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      churchErrors.phone && { borderColor: colors.error }
                    ]}
                    placeholder="+243 XXX XXX XXX"
                    placeholderTextColor={colors.textSecondary}
                    value={churchForm.phone}
                    onChangeText={(text) => setChurchForm(prev => ({ ...prev, phone: text }))}
                    keyboardType="phone-pad"
                  />
                  <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    📞 Ce champ n'est pas obligatoire
                  </Text>
                  {churchErrors.phone && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {churchErrors.phone}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    ⭐ Devise principale
                  </Text>
                  <View style={styles.currencyInfoContainer}>
                    <Text style={[styles.currencyInfoText, { color: colors.text }]}>
                      La devise principale est définie à l'inscription et ne peut plus être modifiée.
                    </Text>
                    <View style={styles.selectedCurrencyBox}>
                      <Text style={[styles.selectedCurrencyText, { color: colors.primary }]}>
                        {church.currency} - {
                          SUPPORTED_CURRENCIES.find(c => c.code === church.currency)?.name || 'Devise principale'
                        }
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    💡 Les autres devises (USD, EURO) sont disponibles pour les transactions mais la devise principale reste {church.currency}
                  </Text>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>🎨 Thème global</Text>
                  <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    💡 Le changement de thème s'applique à tous les utilisateurs de l'église
                  </Text>
                  <View style={styles.themeButtons}>
                    {Object.entries(THEME_CONFIGS).map(([themeKey, themeColors]) => (
                      <TouchableOpacity
                        key={themeKey}
                        style={[
                          styles.themeButton,
                          { borderColor: colors.border },
                          churchForm.theme === themeKey && {
                            backgroundColor: themeColors.primary,
                            borderColor: themeColors.primary
                          }
                        ]}
                        onPress={() => setChurchForm(prev => ({ ...prev, theme: themeKey as any }))}
                      >
                        <View style={[styles.themePreview, { backgroundColor: themeColors.primary }]} />
                        <Text style={[
                          styles.themeButtonText,
                          { color: colors.text },
                          churchForm.theme === themeKey && { color: 'white' }
                        ]}>
                          {themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    💰 Limite d'approbation des dépenses ({church.currency})
                  </Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      churchErrors.expense_limit && { borderColor: colors.error }
                    ]}
                    placeholder="10000000000"
                    placeholderTextColor={colors.textSecondary}
                    value={churchForm.expense_limit}
                    onChangeText={(text) => setChurchForm(prev => ({ ...prev, expense_limit: text }))}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    Les dépenses supérieures à ce montant nécessiteront une approbation
                  </Text>
                  {churchErrors.expense_limit && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {churchErrors.expense_limit}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    📁 Fréquence des archives automatiques
                  </Text>
                  <View style={styles.archiveButtons}>
                    <TouchableOpacity
                      style={[
                        styles.archiveButton,
                        { borderColor: colors.border },
                        churchForm.archive_frequency === 'monthly' && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setChurchForm(prev => ({ ...prev, archive_frequency: 'monthly' }))}
                    >
                      <Text style={[
                        styles.archiveButtonText,
                        { color: churchForm.archive_frequency === 'monthly' ? 'white' : colors.text }
                      ]}>
                        📅 Mensuelle
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.archiveButton,
                        { borderColor: colors.border },
                        churchForm.archive_frequency === 'yearly' && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setChurchForm(prev => ({ ...prev, archive_frequency: 'yearly' }))}
                    >
                      <Text style={[
                        styles.archiveButtonText,
                        { color: churchForm.archive_frequency === 'yearly' ? 'white' : colors.text }
                      ]}>
                        📆 Annuelle
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    Le système créera automatiquement des archives à la fréquence sélectionnée
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Modal liens publics */}
      {user.role === 'Admin' && (
        <Modal visible={showPublicLinksModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPublicLinksModal(false)}>
                <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Fermer</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>🌐 Liens publics</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Formulaire d'ajout */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                  ➕ Ajouter un lien public
                </Text>
                
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Titre *</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      linkErrors.title && { borderColor: colors.error }
                    ]}
                    placeholder="Titre du lien"
                    value={newLink.title}
                    onChangeText={(text) => setNewLink(prev => ({ ...prev, title: text }))}
                  />
                  {linkErrors.title && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {linkErrors.title}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>URL *</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text },
                      linkErrors.url && { borderColor: colors.error }
                    ]}
                    placeholder="https://..."
                    value={newLink.url}
                    onChangeText={(text) => setNewLink(prev => ({ ...prev, url: text }))}
                    autoCapitalize="none"
                  />
                  {linkErrors.url && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {linkErrors.url}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
                  <TextInput
                    style={[styles.fieldInput, { borderColor: colors.border, color: colors.text }]}
                    placeholder="Description du lien"
                    value={newLink.description}
                    onChangeText={(text) => setNewLink(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Plateforme</Text>
                  <View style={styles.platformButtons}>
                    {(['YouTube', 'Facebook', 'Autre'] as const).map((platform) => (
                      <TouchableOpacity
                        key={platform}
                        style={[
                          styles.platformButton,
                          { borderColor: colors.border },
                          newLink.platform === platform && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary
                          }
                        ]}
                        onPress={() => setNewLink(prev => ({ ...prev, platform }))}
                      >
                        <Text style={[
                          styles.platformButtonText,
                          { color: colors.text },
                          newLink.platform === platform && { color: 'white' }
                        ]}>
                          {platform}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.addLinkButton, { backgroundColor: colors.primary }]}
                  onPress={handleAddPublicLink}
                  disabled={addingLink}
                >
                  {addingLink ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.addLinkButtonText}>➕ Ajouter le lien</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Liste des liens existants */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                  📋 Liens existants ({publicLinks.length})
                </Text>
                
                {publicLinks.map((link) => (
                  <View key={link.id} style={[styles.linkItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.linkInfo}>
                      <Text style={[styles.linkTitle, { color: colors.text }]}>
                        {link.title}
                      </Text>
                      <Text style={[styles.linkUrl, { color: colors.primary }]}>
                        {link.url}
                      </Text>
                      {link.description && (
                        <Text style={[styles.linkDescription, { color: colors.textSecondary }]}>
                          {link.description}
                        </Text>
                      )}
                      <Text style={[styles.linkPlatform, { color: colors.textSecondary }]}>
                        📱 {link.platform || 'Autre'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.deleteLinkButton, { backgroundColor: colors.error }]}
                      onPress={() => handleDeletePublicLink(link.id)}
                    >
                      <Text style={styles.deleteLinkButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {publicLinks.length === 0 && (
                  <View style={styles.emptyLinks}>
                    <Text style={[styles.emptyLinksText, { color: colors.textSecondary }]}>
                      Aucun lien public ajouté
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Modals */}
      <UserManagementModal
        visible={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />

      <AuditLogViewer
        visible={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />

      <EventsManagement
        visible={showEventsManagement}
        onClose={() => setShowEventsManagement(false)}
      />

      <Modal
        visible={showEventReminders && !!church && !!user}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEventReminders(false)}
      >
        {church && user && (
          <View style={{ flex: 1 }}>
            <EventsManagerAdmin churchId={church.id} userId={user.id} />
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 60,
                right: 20,
                backgroundColor: 'white',
                padding: 8,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 5,
                zIndex: 1000,
              }}
              onPress={() => setShowEventReminders(false)}
            >
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
          </View>
        )}
      </Modal>

      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      <MessagingSystem
        visible={showMessaging}
        onClose={() => setShowMessaging(false)}
      />

      <SubscriptionManagement
        visible={showSubscriptionManagement}
        onClose={() => setShowSubscriptionManagement(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
    marginRight: 12,
  },
  statNumber: {
    fontSize: 16,
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
    flex: 1,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userDetails: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  permissionsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  churchInfo: {
    alignItems: 'center',
  },
  churchName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  churchDetails: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  messagingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  messagingButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  subscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subscriptionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  adminActions: {
    marginTop: 12,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  aboutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff3cd',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  signatureText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginHorizontal: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  fieldHelp: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  currencyInfoContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  currencyInfoText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  selectedCurrencyBox: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f39c12',
    alignItems: 'center',
  },
  selectedCurrencyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  currencyButtons: {
    marginTop: 8,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeButtons: {
    flexDirection: 'row',
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  themePreview: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  platformButtons: {
    flexDirection: 'row',
  },
  platformButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  platformButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addLinkButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addLinkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: 12,
    marginBottom: 2,
  },
  linkDescription: {
    fontSize: 12,
    marginBottom: 2,
  },
  linkPlatform: {
    fontSize: 10,
  },
  deleteLinkButton: {
    padding: 8,
    borderRadius: 6,
  },
  deleteLinkButtonText: {
    color: 'white',
    fontSize: 12,
  },
  emptyLinks: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyLinksText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  archiveButtons: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  archiveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  archiveButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
}); 