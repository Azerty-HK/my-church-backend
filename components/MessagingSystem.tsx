import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MessageCircle, Send, X, User, Mail, Clock, CircleCheck as CheckCircle } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import { useChurch } from '../contexts/ChurchContext';
import type { Message, User as UserType } from '../types/database';

interface MessagingSystemProps {
  visible: boolean;
  onClose: () => void;
}

export function MessagingSystem({ visible, onClose }: MessagingSystemProps) {
  const { church, user } = useChurch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  
  // Formulaire de composition
  const [newMessage, setNewMessage] = useState({
    receiver_id: '',
    subject: '',
    content: '',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible && church && user) {
      loadData();
    }
  }, [visible, church, user]);

  const loadData = async () => {
    if (!church || !user) return;
    
    setLoading(true);
    try {
      const [messagesData, usersData] = await Promise.all([
        DatabaseService.getMessages(church.id, user.id),
        DatabaseService.getChurchUsers(church.id)
      ]);
      
      setMessages(messagesData);
      // Exclure l'utilisateur actuel et s'assurer que seuls les utilisateurs valides sont disponibles
      setUsers(usersData.filter(u => u.id !== user.id && u.id && u.first_name && u.last_name));
    } catch (error) {
      console.error('❌ Erreur chargement messagerie:', error);
      Alert.alert('Erreur', 'Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!church || !user) return;
    
    if (!newMessage.receiver_id || !newMessage.subject.trim() || !newMessage.content.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setSending(true);
    try {
      await DatabaseService.createMessage({
        church_id: church.id,
        sender_id: user.id,
        receiver_id: newMessage.receiver_id,
        subject: newMessage.subject.trim(),
        content: newMessage.content.trim(),
      });

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'SEND_MESSAGE',
        resource_type: 'Message',
        details: { 
          receiver: users.find(u => u.id === newMessage.receiver_id)?.email,
          subject: newMessage.subject 
        }
      });

      setNewMessage({ receiver_id: '', subject: '', content: '' });
      setShowComposeModal(false);
      await loadData();
      
      Alert.alert('✅ Succès', 'Message envoyé avec succès');
    } catch (error: any) {
      Alert.alert('❌ Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (message: Message) => {
    if (message.is_read || message.receiver_id !== user?.id) return;
    
    try {
      await DatabaseService.markMessageAsRead(message.id);
      await loadData();
    } catch (error) {
      console.error('❌ Erreur marquer comme lu:', error);
    }
  };

  const getUserName = (userId: string): string => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? `${foundUser.first_name} ${foundUser.last_name}` : 'Utilisateur inconnu';
  };

  const getUserRole = (userId: string): string => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser?.role || '';
  };

  const getUnreadCount = (): number => {
    return messages.filter(m => !m.is_read && m.receiver_id === user?.id).length;
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>
              💬 Messagerie ({getUnreadCount()} non lu{getUnreadCount() > 1 ? 's' : ''})
            </Text>
            <TouchableOpacity onPress={() => setShowComposeModal(true)} disabled={users.length === 0}>
              <Send size={24} color={users.length === 0 ? "#bdc3c7" : "#3498db"} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Chargement des messages...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content}>
              <View style={styles.section}>
                {messages.map((message) => {
                  const isReceived = message.receiver_id === user?.id;
                  const otherUserId = isReceived ? message.sender_id : message.receiver_id;
                  
                  return (
                    <TouchableOpacity
                      key={message.id}
                      style={[
                        styles.messageCard,
                        !message.is_read && isReceived && styles.messageCardUnread
                      ]}
                      onPress={() => markAsRead(message)}
                    >
                      <View style={styles.messageHeader}>
                        <View style={styles.messageUser}>
                          <User size={16} color="#7f8c8d" />
                          <Text style={styles.messageUserName}>
                            {isReceived ? 'De' : 'À'}: {getUserName(otherUserId)}
                          </Text>
                          <Text style={styles.messageUserRole}>
                            ({getUserRole(otherUserId)})
                          </Text>
                        </View>
                        
                        <View style={styles.messageStatus}>
                          {!message.is_read && isReceived && (
                            <View style={styles.unreadIndicator} />
                          )}
                          <Text style={styles.messageDate}>
                            {new Date(message.created_at).toLocaleDateString('fr-FR')}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.messageSubject}>{message.subject}</Text>
                      <Text style={styles.messageContent} numberOfLines={2}>
                        {message.content}
                      </Text>

                      <View style={styles.messageFooter}>
                        <Text style={styles.messageTime}>
                          {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                        {message.is_read && isReceived && (
                          <CheckCircle size={12} color="#27ae60" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                
                {messages.length === 0 && (
                  <View style={styles.emptyState}>
                    <MessageCircle size={48} color="#bdc3c7" />
                    <Text style={styles.emptyText}>Aucun message</Text>
                    <Text style={styles.emptySubtext}>
                      Commencez une conversation avec vos collègues
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Modal de composition */}
      <Modal visible={showComposeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowComposeModal(false)}>
              <Text style={styles.cancelButton}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.title}>✍️ Nouveau message</Text>
            <TouchableOpacity onPress={sendMessage} disabled={sending}>
              <Text style={[styles.sendButton, sending && styles.sendButtonDisabled]}>
                {sending ? 'Envoi...' : 'Envoyer'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Destinataire *</Text>
                <View style={styles.receiverButtons}>
                  {users.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        styles.receiverButton,
                        newMessage.receiver_id === u.id && styles.receiverButtonActive
                      ]}
                      onPress={() => setNewMessage(prev => ({ ...prev, receiver_id: u.id }))}
                    >
                      <User size={16} color={newMessage.receiver_id === u.id ? 'white' : '#7f8c8d'} />
                      <Text style={[
                        styles.receiverButtonText,
                        newMessage.receiver_id === u.id && styles.receiverButtonTextActive
                      ]}>
                        {u.first_name} {u.last_name} ({u.role})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Sujet *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Sujet du message"
                  value={newMessage.subject}
                  onChangeText={(text) => setNewMessage(prev => ({ ...prev, subject: text }))}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Message *</Text>
                <TextInput
                  style={[styles.fieldInput, styles.messageInput]}
                  placeholder="Tapez votre message ici..."
                  value={newMessage.content}
                  onChangeText={(text) => setNewMessage(prev => ({ ...prev, content: text }))}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
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
  cancelButton: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  sendButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  sendButtonDisabled: {
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
  messageCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dee2e6',
  },
  messageCardUnread: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#3498db',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  messageUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  messageUserRole: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
  },
  messageDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 8,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: 12,
    color: '#adb5bd',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
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
  fieldInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  messageInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  receiverButtons: {
    gap: 8,
  },
  receiverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  receiverButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  receiverButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  receiverButtonTextActive: {
    color: 'white',
  },
});