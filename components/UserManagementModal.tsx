import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Plus, Users, Crown, DollarSign, FileText, Eye, Trash2, CreditCard as Edit, Shield } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import { RBACService } from '../utils/rbac';
import { ValidationService } from '../utils/validation';
import { useChurch } from '../contexts/ChurchContext';
import type { User, UserRole } from '../types/database';

interface UserManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export function UserManagementModal({ visible, onClose }: UserManagementModalProps) {
  const { church, user: currentUser, permissions } = useChurch();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Formulaire d'ajout/modification
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Lecteur' as UserRole,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && church) {
      loadUsers();
    }
  }, [visible, church]);

  const loadUsers = async () => {
    if (!church) return;
    
    setLoading(true);
    try {
      const churchUsers = await DatabaseService.getChurchUsers(church.id);
      setUsers(churchUsers);
    } catch (error) {
      console.error('❌ Erreur chargement utilisateurs:', error);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'Le prénom est obligatoire';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Le nom est obligatoire';
    }
    
    const emailValidation = ValidationService.validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error!;
    }
    
    if (!editingUser) {
      const passwordValidation = ValidationService.validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.error!;
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!church || !currentUser || !validateForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        // Modification
        const updates: Partial<User> = {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
        };

        if (formData.password.trim()) {
          updates.password_hash = formData.password;
        }

        await DatabaseService.updateUser(editingUser.id, updates);
        
        // Audit log
        await DatabaseService.createAuditLogEntry({
          church_id: church.id,
          user_id: currentUser.id,
          action: 'UPDATE_USER',
          resource_type: 'User',
          resource_id: editingUser.id,
          details: { email: formData.email, role: formData.role }
        });
        
        Alert.alert('✅ Succès', 'Utilisateur modifié avec succès');
      } else {
        // Création
        await DatabaseService.createUser({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          role: formData.role,
          churchId: church.id,
        });
        
        // Audit log
        await DatabaseService.createAuditLogEntry({
          church_id: church.id,
          user_id: currentUser.id,
          action: 'CREATE_USER',
          resource_type: 'User',
          resource_id: '',
          details: { email: formData.email, role: formData.role }
        });
        
        Alert.alert('✅ Succès', 'Utilisateur créé avec succès');
      }
      
      resetForm();
      setShowAddModal(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error: any) {
      Alert.alert('❌ Erreur', error.message || 'Impossible de sauvegarder l\'utilisateur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    if (!currentUser || !RBACService.canManageUser(currentUser.role, user.role)) {
      Alert.alert('Erreur', 'Vous ne pouvez pas modifier cet utilisateur');
      return;
    }
    
    setFormData({
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setEditingUser(user);
    setShowAddModal(true);
  };

  const handleDelete = async (user: User) => {
    if (!currentUser || !RBACService.canManageUser(currentUser.role, user.role)) {
      Alert.alert('Erreur', 'Vous ne pouvez pas supprimer cet utilisateur');
      return;
    }

    if (user.id === currentUser.id) {
      Alert.alert('Erreur', 'Vous ne pouvez pas supprimer votre propre compte');
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.first_name} ${user.last_name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteUser(user.id);
              
              // Audit log
              if (church) {
                await DatabaseService.createAuditLogEntry({
                  church_id: church.id,
                  user_id: currentUser.id,
                  action: 'DELETE_USER',
                  resource_type: 'User',
                  resource_id: user.id,
                  details: { email: user.email, role: user.role }
                });
              }
              
              await loadUsers();
              Alert.alert('✅ Succès', 'Utilisateur supprimé');
            } catch (error: any) {
              Alert.alert('❌ Erreur', error.message || 'Impossible de supprimer l\'utilisateur');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'Lecteur',
    });
    setFormErrors({});
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'Admin': return <Crown size={16} color="#e74c3c" />;
      case 'Trésorier': return <DollarSign size={16} color="#f39c12" />;
      case 'Secrétaire': return <FileText size={16} color="#3498db" />;
      case 'Lecteur': return <Eye size={16} color="#7f8c8d" />;
      default: return <Users size={16} color="#7f8c8d" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'Admin': return '#e74c3c';
      case 'Trésorier': return '#f39c12';
      case 'Secrétaire': return '#3498db';
      case 'Lecteur': return '#7f8c8d';
      default: return '#7f8c8d';
    }
  };

  if (!permissions.canManageUsers) {
    return null;
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>👥 Gestion des utilisateurs</Text>
            <TouchableOpacity 
              onPress={() => {
                resetForm();
                setEditingUser(null);
                setShowAddModal(true);
              }}
            >
              <Plus size={24} color="#3498db" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Utilisateurs de l'église ({users.length})
                </Text>
                
                {users.map((user) => (
                  <View key={user.id} style={styles.userCard}>
                    <View style={styles.userInfo}>
                      <View style={styles.userHeader}>
                        <Text style={styles.userName}>
                          {user.first_name} {user.last_name}
                        </Text>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                          {getRoleIcon(user.role)}
                          <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                            {user.role}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.userEmail}>{user.email}</Text>
                      
                      <View style={styles.userMeta}>
                        <Text style={styles.userStatus}>
                          {user.is_active ? '✅ Actif' : '❌ Inactif'}
                        </Text>
                        {user.last_login && (
                          <Text style={styles.lastLogin}>
                            Dernière connexion: {new Date(user.last_login).toLocaleDateString('fr-FR')}
                          </Text>
                        )}
                      </View>
                    </View>

                    {currentUser && user.id !== currentUser.id && RBACService.canManageUser(currentUser.role, user.role) && (
                      <View style={styles.userActions}>
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleEdit(user)}
                        >
                          <Edit size={16} color="#3498db" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDelete(user)}
                        >
                          <Trash2 size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
                
                {users.length === 0 && (
                  <View style={styles.emptyState}>
                    <Users size={48} color="#bdc3c7" />
                    <Text style={styles.emptyText}>Aucun utilisateur</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Modal d'ajout/modification */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              setEditingUser(null);
              resetForm();
            }}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {editingUser ? '✏️ Modifier utilisateur' : '➕ Nouvel utilisateur'}
            </Text>
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={[styles.saveButton, submitting && styles.saveButtonDisabled]}>
                {submitting ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Prénom *</Text>
                <TextInput
                  style={[styles.fieldInput, formErrors.firstName && styles.fieldInputError]}
                  placeholder="Prénom"
                  value={formData.firstName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                  autoCapitalize="words"
                />
                {formErrors.firstName && (
                  <Text style={styles.fieldError}>{formErrors.firstName}</Text>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nom *</Text>
                <TextInput
                  style={[styles.fieldInput, formErrors.lastName && styles.fieldInputError]}
                  placeholder="Nom de famille"
                  value={formData.lastName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                  autoCapitalize="words"
                />
                {formErrors.lastName && (
                  <Text style={styles.fieldError}>{formErrors.lastName}</Text>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={[styles.fieldInput, formErrors.email && styles.fieldInputError]}
                  placeholder="email@exemple.com"
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {formErrors.email && (
                  <Text style={styles.fieldError}>{formErrors.email}</Text>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>
                  {editingUser ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
                </Text>
                <TextInput
                  style={[styles.fieldInput, formErrors.password && styles.fieldInputError]}
                  placeholder={editingUser ? 'Laisser vide pour ne pas changer' : 'Minimum 6 caractères'}
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {formErrors.password && (
                  <Text style={styles.fieldError}>{formErrors.password}</Text>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Rôle *</Text>
                <Text style={styles.fieldHelp}>
                  Choisissez le niveau d'accès pour cet utilisateur
                </Text>
                
                <View style={styles.roleButtons}>
                  {currentUser && RBACService.getAvailableRoles(currentUser.role).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        formData.role === role && styles.roleButtonActive
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, role }))}
                    >
                      {getRoleIcon(role)}
                      <View style={styles.roleInfo}>
                        <Text style={[
                          styles.roleButtonText,
                          formData.role === role && styles.roleButtonTextActive
                        ]}>
                          {RBACService.getRoleDisplayName(role)}
                        </Text>
                        <Text style={[
                          styles.roleDescription,
                          formData.role === role && styles.roleDescriptionActive
                        ]}>
                          {RBACService.getRoleDescription(role)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  saveButtonDisabled: {
    color: '#bdc3c7',
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastLogin: {
    fontSize: 10,
    color: '#adb5bd',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  deleteButton: {
    backgroundColor: '#fdf2f2',
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
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  fieldHelp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  fieldInputError: {
    borderColor: '#e74c3c',
  },
  fieldError: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  roleButtons: {
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    gap: 12,
  },
  roleButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  roleInfo: {
    flex: 1,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  roleButtonTextActive: {
    color: 'white',
  },
  roleDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  roleDescriptionActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});