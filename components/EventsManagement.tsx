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
  Platform,
} from 'react-native';
import { Calendar, Plus, X, MapPin, Clock, Users, CircleCheck as CheckCircle, Trash2, Bell, BellOff } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import 'moment/locale/fr';
import { DatabaseService } from '../lib/database';
import { useChurch } from '../contexts/ChurchContext';
import type { Event, Member, Attendance } from '../types/database';

type EventType = "Culte" | "Réunion" | "Séminaire" | "Conférence" | "Autre";

interface EventsManagementProps {
  visible: boolean;
  onClose: () => void;
}

export function EventsManagement({ visible, onClose }: EventsManagementProps) {
  const { church, user, permissions } = useChurch();
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  
  // État pour les sélecteurs de date
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  
  // Formulaire d'événement
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'Culte' as EventType,
    start_date: moment().format('YYYY-MM-DD'),
    end_date: '',
    location: '',
    reminder_enabled: true,
    reminder_time: 60,
  });
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && church) {
      loadData();
    }
  }, [visible, church]);

  const loadData = async () => {
    if (!church) return;
    
    setLoading(true);
    try {
      const [eventsData, membersData] = await Promise.all([
        DatabaseService.getEvents(church.id),
        DatabaseService.getMembers(church.id)
      ]);
      setEvents(eventsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      Alert.alert('Erreur', 'Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  const validateEventForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validation du titre
    if (!eventForm.title.trim()) {
      errors.title = 'Le titre est obligatoire';
    } else if (eventForm.title.trim().length < 3) {
      errors.title = 'Le titre doit faire au moins 3 caractères';
    } else if (eventForm.title.trim().length > 100) {
      errors.title = 'Le titre ne peut pas dépasser 100 caractères';
    }
    
    // Validation de la date de début
    if (!eventForm.start_date) {
      errors.start_date = 'La date de début est obligatoire';
    } else {
      const startDate = moment(eventForm.start_date, 'YYYY-MM-DD', true);
      const today = moment().startOf('day');
      
      if (!startDate.isValid()) {
        errors.start_date = 'Format de date invalide';
      } else if (startDate.isBefore(today)) {
        errors.start_date = 'La date de début ne peut pas être dans le passé';
      }
    }
    
    // Validation de la date de fin
    if (eventForm.end_date) {
      const endDate = moment(eventForm.end_date, 'YYYY-MM-DD', true);
      const startDate = moment(eventForm.start_date, 'YYYY-MM-DD', true);
      
      if (!endDate.isValid()) {
        errors.end_date = 'Format de date invalide';
      } else if (endDate.isBefore(startDate)) {
        errors.end_date = 'La date de fin doit être après la date de début';
      }
    }
    
    // Validation de la description
    if (eventForm.description && eventForm.description.length > 500) {
      errors.description = 'La description ne peut pas dépasser 500 caractères';
    }
    
    // Validation du lieu
    if (eventForm.location && eventForm.location.length > 200) {
      errors.location = 'Le lieu ne peut pas dépasser 200 caractères';
    }
    
    setEventErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEvent = async () => {
    if (!church || !user) {
      Alert.alert('Erreur', 'Utilisateur ou église non défini');
      return;
    }

    if (!validateEventForm()) {
      const firstError = Object.values(eventErrors)[0];
      Alert.alert('Erreur de validation', firstError);
      return;
    }

    setSubmitting(true);
    try {
      // S'assurer que les dates sont au format ISO
      const startDateISO = moment(eventForm.start_date, 'YYYY-MM-DD').toISOString();
      const endDateISO = eventForm.end_date 
        ? moment(eventForm.end_date, 'YYYY-MM-DD').toISOString()
        : undefined;

      const eventData = {
        church_id: church.id,
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        event_type: eventForm.event_type,
        start_date: startDateISO,
        end_date: endDateISO,
        location: eventForm.location.trim() || undefined,
        reminder_enabled: eventForm.reminder_enabled,
        reminder_time: eventForm.reminder_enabled ? eventForm.reminder_time : undefined,
        created_by: `${user.first_name} ${user.last_name}`,
      };

      console.log('📅 Création événement:', eventData);
      await DatabaseService.createEvent(eventData);
      
      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'CREATE_EVENT',
        resource_type: 'Event',
        details: { title: eventForm.title, type: eventForm.event_type }
      });
      
      resetEventForm();
      setShowAddModal(false);
      await loadData();
      
      Alert.alert('Succès', 'Événement créé avec succès');
    } catch (error: any) {
      console.error('❌ Erreur création événement:', error);
      Alert.alert('Erreur', error.message || 'Impossible de créer l\'événement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteEvent(event.id);
              
              // Audit log
              if (church && user) {
                await DatabaseService.createAuditLogEntry({
                  church_id: church.id,
                  user_id: user.id,
                  action: 'DELETE_EVENT',
                  resource_type: 'Event',
                  resource_id: event.id,
                  details: { title: event.title }
                });
              }
              
              await loadData();
              Alert.alert('Succès', 'Événement supprimé');
            } catch (error: any) {
              console.error('❌ Erreur suppression événement:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'événement');
            }
          }
        }
      ]
    );
  };

  const handleManageAttendance = async (event: Event) => {
    setSelectedEvent(event);
    try {
      const eventAttendances = await DatabaseService.getEventAttendances(event.id);
      setAttendances(eventAttendances);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('❌ Erreur chargement présences:', error);
      Alert.alert('Erreur', 'Impossible de charger les présences');
    }
  };

  const toggleAttendance = async (memberId: string, attended: boolean) => {
    if (!selectedEvent || !user) return;
    
    try {
      const existingAttendance = attendances.find(a => a.member_id === memberId);
      
      if (existingAttendance) {
        await DatabaseService.updateAttendance(existingAttendance.id, { attended });
      } else {
        await DatabaseService.createAttendance({
          event_id: selectedEvent.id,
          member_id: memberId,
          attended,
          recorded_by: `${user.first_name} ${user.last_name}`,
        });
      }
      
      const updatedAttendances = await DatabaseService.getEventAttendances(selectedEvent.id);
      setAttendances(updatedAttendances);
    } catch (error) {
      console.error('❌ Erreur mise à jour présence:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la présence');
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      event_type: 'Culte',
      start_date: moment().format('YYYY-MM-DD'),
      end_date: '',
      location: '',
      reminder_enabled: true,
      reminder_time: 60,
    });
    setEventErrors({});
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };

  // Gestion des sélecteurs de date - CORRIGÉ POUR ÉVITER LES CRASH
  const handleStartDateSelect = () => {
    setTempStartDate(moment(eventForm.start_date, 'YYYY-MM-DD').toDate());
    setShowStartDatePicker(true);
  };

  const handleEndDateSelect = () => {
    if (eventForm.end_date) {
      setTempEndDate(moment(eventForm.end_date, 'YYYY-MM-DD').toDate());
    } else {
      setTempEndDate(moment().add(1, 'day').toDate());
    }
    setShowEndDatePicker(true);
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    // Gestion du dismiss sur Android
    if (event.type === 'dismissed') {
      setTimeout(() => {
        setShowStartDatePicker(false);
      }, 10);
      return;
    }
    
    // Toujours fermer le picker avec un timeout pour éviter les crash
    setTimeout(() => {
      setShowStartDatePicker(false);
    }, 10);
    
    if (selectedDate) {
      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      setEventForm(prev => ({ ...prev, start_date: formattedDate }));
      if (eventErrors.start_date) {
        setEventErrors(prev => ({ ...prev, start_date: '' }));
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    // Gestion du dismiss sur Android
    if (event.type === 'dismissed') {
      setTimeout(() => {
        setShowEndDatePicker(false);
      }, 10);
      return;
    }
    
    // Toujours fermer le picker avec un timeout pour éviter les crash
    setTimeout(() => {
      setShowEndDatePicker(false);
    }, 10);
    
    if (selectedDate) {
      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      setEventForm(prev => ({ ...prev, end_date: formattedDate }));
      if (eventErrors.end_date) {
        setEventErrors(prev => ({ ...prev, end_date: '' }));
      }
    } else {
      setEventForm(prev => ({ ...prev, end_date: '' }));
    }
  };

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case 'Culte': return '#3498db';
      case 'Réunion': return '#f39c12';
      case 'Séminaire': return '#9b59b6';
      case 'Conférence': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  const isEventPast = (event: Event) => {
    const today = moment().startOf('day');
    const startDate = moment(event.start_date).startOf('day');
    return startDate.isBefore(today);
  };

  const getAttendanceStatus = (memberId: string) => {
    const attendance = attendances.find(a => a.member_id === memberId);
    if (!attendance) return 'unmarked';
    return attendance.attended ? 'present' : 'absent';
  };

  const getAttendanceButtonStyle = (status: string) => {
    switch (status) {
      case 'present':
        return [styles.attendanceButton, styles.attendanceButtonPresent];
      case 'absent':
        return [styles.attendanceButton, styles.attendanceButtonAbsent];
      default:
        return [styles.attendanceButton, styles.attendanceButtonUnmarked];
    }
  };

  const getAttendanceButtonText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Présent';
      case 'absent':
        return 'Absent';
      default:
        return 'Non marqué';
    }
  };

  if (!permissions.canManageEvents && !permissions.canViewAttendance) {
    return null;
  }

  return (
    <>
      <Modal 
        visible={visible} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>📅 Gestion des événements</Text>
            {permissions.canManageEvents && (
              <TouchableOpacity 
                onPress={() => {
                  resetEventForm();
                  setShowAddModal(true);
                }}
                style={styles.addButton}
              >
                <Plus size={24} color="#3498db" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Chargement des événements...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Événements ({events.length})
                </Text>
                
                {events.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <View style={[styles.eventTypeBadge, { backgroundColor: getEventTypeColor(event.event_type as EventType) + '20' }]}>
                        <Calendar size={12} color={getEventTypeColor(event.event_type as EventType)} />
                        <Text style={[styles.eventTypeText, { color: getEventTypeColor(event.event_type as EventType) }]}>
                          {event.event_type}
                        </Text>
                      </View>
                      
                      {isEventPast(event) && (
                        <Text style={styles.pastEventBadge}>Passé</Text>
                      )}
                    </View>
                    
                    <View style={styles.eventTitleContainer}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.reminderStatus}>
                        {event.reminder_enabled ? (
                          <>
                            <Bell size={14} color="#27ae60" />
                            <Text style={styles.reminderStatusText}>Rappel activé</Text>
                          </>
                        ) : (
                          <>
                            <BellOff size={14} color="#7f8c8d" />
                            <Text style={styles.reminderStatusText}>Rappel désactivé</Text>
                          </>
                        )}
                      </View>
                    </View>
                    
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                    
                    <View style={styles.eventMeta}>
                      <View style={styles.eventMetaItem}>
                        <Clock size={14} color="#7f8c8d" />
                        <Text style={styles.eventMetaText}>
                          {moment(event.start_date).format('DD/MM/YYYY')}
                          {event.end_date && ` - ${moment(event.end_date).format('DD/MM/YYYY')}`}
                        </Text>
                      </View>
                      
                      {event.location && (
                        <View style={styles.eventMetaItem}>
                          <MapPin size={14} color="#7f8c8d" />
                          <Text style={styles.eventMetaText}>{event.location}</Text>
                        </View>
                      )}
                      
                      <View style={styles.eventMetaItem}>
                        <Users size={14} color="#7f8c8d" />
                        <Text style={styles.eventMetaText}>Par {event.created_by}</Text>
                      </View>
                    </View>

                    <View style={styles.eventActions}>
                      {permissions.canViewAttendance && (
                        <TouchableOpacity 
                          style={styles.attendanceListButton}
                          onPress={() => handleManageAttendance(event)}
                        >
                          <CheckCircle size={16} color="#27ae60" />
                          <Text style={styles.attendanceListButtonText}>Gérer les présences</Text>
                        </TouchableOpacity>
                      )}
                      
                      {permissions.canManageEvents && (
                        <TouchableOpacity 
                          style={styles.deleteEventButton}
                          onPress={() => handleDeleteEvent(event)}
                        >
                          <Trash2 size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
                
                {events.length === 0 && (
                  <View style={styles.emptyState}>
                    <Calendar size={48} color="#bdc3c7" />
                    <Text style={styles.emptyText}>Aucun événement</Text>
                    <Text style={styles.emptySubtext}>
                      Commencez par créer votre premier événement
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Modal d'ajout d'événement */}
      <Modal 
        visible={showAddModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddModal(false);
          resetEventForm();
        }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              resetEventForm();
            }}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>📅 Nouvel événement</Text>
            <TouchableOpacity 
              onPress={handleAddEvent}
              disabled={submitting}
            >
              <Text style={[styles.saveButton, submitting && styles.saveButtonDisabled]}>
                {submitting ? 'Création...' : 'Créer'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Titre *</Text>
                <TextInput
                  style={[styles.fieldInput, eventErrors.title && styles.fieldInputError]}
                  placeholder="Titre de l'événement"
                  value={eventForm.title}
                  onChangeText={(text) => {
                    setEventForm(prev => ({ ...prev, title: text }));
                    if (eventErrors.title) {
                      setEventErrors(prev => ({ ...prev, title: '' }));
                    }
                  }}
                />
                {eventErrors.title && (
                  <Text style={styles.fieldError}>{eventErrors.title}</Text>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.fieldInput, eventErrors.description && styles.fieldInputError]}
                  placeholder="Description de l'événement"
                  value={eventForm.description}
                  onChangeText={(text) => {
                    setEventForm(prev => ({ ...prev, description: text }));
                    if (eventErrors.description) {
                      setEventErrors(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  multiline
                  numberOfLines={3}
                />
                {eventErrors.description && (
                  <Text style={styles.fieldError}>{eventErrors.description}</Text>
                )}
                <Text style={styles.helperText}>
                  {eventForm.description.length}/500 caractères
                </Text>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Type d'événement *</Text>
                <View style={styles.typeButtons}>
                  {(['Culte', 'Réunion', 'Séminaire', 'Conférence', 'Autre'] as EventType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        eventForm.event_type === type && styles.typeButtonActive
                      ]}
                      onPress={() => setEventForm(prev => ({ ...prev, event_type: type }))}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        eventForm.event_type === type && styles.typeButtonTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Date de début *</Text>
                <TouchableOpacity
                  style={[styles.dateInput, eventErrors.start_date && styles.fieldInputError]}
                  onPress={handleStartDateSelect}
                >
                  <Calendar size={20} color="#3498db" />
                  <Text style={styles.dateText}>
                    {eventForm.start_date} (Cliquez pour sélectionner)
                  </Text>
                </TouchableOpacity>
                {eventErrors.start_date && (
                  <Text style={styles.fieldError}>{eventErrors.start_date}</Text>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Date de fin (optionnel)</Text>
                <TouchableOpacity
                  style={[styles.dateInput, eventErrors.end_date && styles.fieldInputError]}
                  onPress={handleEndDateSelect}
                >
                  <Calendar size={20} color="#3498db" />
                  <Text style={styles.dateText}>
                    {eventForm.end_date || 'Sélectionner une date (optionnel)'}
                  </Text>
                </TouchableOpacity>
                {eventErrors.end_date && (
                  <Text style={styles.fieldError}>{eventErrors.end_date}</Text>
                )}
              </View>

              {/* DateTimePicker - CORRIGÉ POUR ÉVITER LES CRASH SUR ANDROID */}
              {showStartDatePicker && (
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"  // Mode date uniquement sur Android
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartDateChange}
                  minimumDate={new Date()}
                  key="start-date-picker-events"
                />
              )}
              
              {showEndDatePicker && (
                <DateTimePicker
                  value={tempEndDate || new Date()}
                  mode="date"  // Mode date uniquement sur Android
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEndDateChange}
                  minimumDate={moment(eventForm.start_date, 'YYYY-MM-DD').toDate()}
                  key="end-date-picker-events"
                />
              )}

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Lieu</Text>
                <TextInput
                  style={[styles.fieldInput, eventErrors.location && styles.fieldInputError]}
                  placeholder="Lieu de l'événement"
                  value={eventForm.location}
                  onChangeText={(text) => {
                    setEventForm(prev => ({ ...prev, location: text }));
                    if (eventErrors.location) {
                      setEventErrors(prev => ({ ...prev, location: '' }));
                    }
                  }}
                />
                {eventErrors.location && (
                  <Text style={styles.fieldError}>{eventErrors.location}</Text>
                )}
                <Text style={styles.helperText}>
                  {eventForm.location.length}/200 caractères
                </Text>
              </View>

              <View style={styles.formField}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.fieldLabel}>Rappel automatique</Text>
                  <TouchableOpacity
                    style={styles.reminderToggle}
                    onPress={() => setEventForm(prev => ({ ...prev, reminder_enabled: !prev.reminder_enabled }))}
                  >
                    {eventForm.reminder_enabled ? (
                      <Bell size={20} color="#27ae60" />
                    ) : (
                      <BellOff size={20} color="#7f8c8d" />
                    )}
                    <Text style={[styles.reminderToggleText, !eventForm.reminder_enabled && styles.reminderToggleTextOff]}>
                      {eventForm.reminder_enabled ? 'Activé' : 'Désactivé'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {eventForm.reminder_enabled && (
                  <View style={styles.reminderOptions}>
                    <Text style={styles.reminderLabel}>Rappeler avant :</Text>
                    <View style={styles.reminderButtons}>
                      {[15, 30, 60, 120, 1440].map((minutes) => {
                        const label = minutes < 60
                          ? `${minutes} min`
                          : minutes === 60
                            ? '1 heure'
                            : minutes === 120
                              ? '2 heures'
                              : '1 jour';
                        return (
                          <TouchableOpacity
                            key={minutes}
                            style={[
                              styles.reminderButton,
                              eventForm.reminder_time === minutes && styles.reminderButtonActive
                            ]}
                            onPress={() => setEventForm(prev => ({ ...prev, reminder_time: minutes }))}
                          >
                            <Text style={[
                              styles.reminderButtonText,
                              eventForm.reminder_time === minutes && styles.reminderButtonTextActive
                            ]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de gestion des présences */}
      <Modal 
        visible={showAttendanceModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAttendanceModal(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowAttendanceModal(false)}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>
              ✅ Présences - {selectedEvent?.title}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Membres ({members.length})
              </Text>
              
              {members.map((member) => {
                const attendanceStatus = getAttendanceStatus(member.id);
                
                return (
                  <View key={member.id} style={styles.memberAttendanceItem}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.first_name} {member.last_name}
                      </Text>
                      <Text style={styles.memberType}>
                        {member.member_type} {member.position ? `• ${member.position}` : ''}
                      </Text>
                    </View>
                    
                    <View style={styles.attendanceActions}>
                      <TouchableOpacity
                        style={getAttendanceButtonStyle(attendanceStatus)}
                        onPress={() => {
                          const newStatus = attendanceStatus === 'present' ? false : true;
                          toggleAttendance(member.id, newStatus);
                        }}
                      >
                        <CheckCircle 
                          size={16} 
                          color={
                            attendanceStatus === 'present' ? '#ffffff' : 
                            attendanceStatus === 'absent' ? '#ffffff' : '#7f8c8d'
                          } 
                        />
                        <Text style={[
                          styles.attendanceButtonText,
                          attendanceStatus !== 'unmarked' && styles.attendanceButtonTextActive
                        ]}>
                          {getAttendanceButtonText(attendanceStatus)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              
              {members.length === 0 && (
                <View style={styles.emptyState}>
                  <Users size={48} color="#bdc3c7" />
                  <Text style={styles.emptyText}>Aucun membre</Text>
                </View>
              )}
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
  addButton: {
    padding: 8,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  saveButtonDisabled: {
    color: '#bdc3c7',
  },
  headerSpacer: {
    width: 24,
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
  eventCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pastEventBadge: {
    fontSize: 10,
    color: '#7f8c8d',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  reminderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderStatusText: {
    fontSize: 10,
    color: '#7f8c8d',
  },
  eventDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  eventMeta: {
    gap: 4,
    marginBottom: 8,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  attendanceListButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteEventButton: {
    padding: 6,
    borderRadius: 6,
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
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dateText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 10,
    flex: 1,
  },
  fieldInputError: {
    borderColor: '#e74c3c',
  },
  fieldError: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    fontStyle: 'italic',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  typeButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  memberAttendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  memberType: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  attendanceActions: {
    marginLeft: 12,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    minWidth: 100,
    justifyContent: 'center',
  },
  attendanceButtonPresent: {
    backgroundColor: '#27ae60',
  },
  attendanceButtonAbsent: {
    backgroundColor: '#e74c3c',
  },
  attendanceButtonUnmarked: {
    backgroundColor: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  attendanceButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  attendanceButtonTextActive: {
    color: 'white',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  reminderToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27ae60',
  },
  reminderToggleTextOff: {
    color: '#7f8c8d',
  },
  reminderOptions: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  reminderLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  reminderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
  },
  reminderButtonActive: {
    backgroundColor: '#f39c12',
    borderColor: '#f39c12',
  },
  reminderButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
  },
  reminderButtonTextActive: {
    color: 'white',
  },
}); 