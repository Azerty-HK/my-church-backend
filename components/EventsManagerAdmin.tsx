import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Calendar, Plus, Trash2, Edit2, Bell, Clock, MapPin, Users } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import 'moment/locale/fr';
import { DatabaseService } from '../lib/database';
import { Event } from '../types/database';
import { Button } from './Button';

interface EventsManagerAdminProps {
  churchId: string;
  userId: string;
}

type EventType = "Culte" | "Réunion" | "Séminaire" | "Conférence" | "Autre";

export function EventsManagerAdmin({ churchId, userId }: EventsManagerAdminProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'Culte' as EventType,
    start_date: moment().toDate(),
    end_date: null as Date | null,
    location: '',
    reminder_enabled: true,
    reminder_time: 60,
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(moment().toDate());
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);

  useEffect(() => {
    loadEvents();
  }, [churchId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getEvents(churchId);
      // Trier par date de début
      const sortedEvents = data.sort((a, b) => 
        moment(a.start_date).valueOf() - moment(b.start_date).valueOf()
      );
      setEvents(sortedEvents);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      Alert.alert('Erreur', 'Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation du titre
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est obligatoire';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Le titre doit faire au moins 3 caractères';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Le titre ne peut pas dépasser 100 caractères';
    }

    // Validation de la date de début
    const now = moment();
    const startDate = moment(formData.start_date);
    if (startDate.isBefore(now, 'minute')) {
      newErrors.start_date = 'La date de début ne peut pas être dans le passé';
    }

    // Validation de la date de fin
    if (formData.end_date) {
      const endDate = moment(formData.end_date);
      if (endDate.isBefore(startDate)) {
        newErrors.end_date = 'La date de fin doit être après la date de début';
      }
    }

    // Validation de la description
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'La description ne peut pas dépasser 500 caractères';
    }

    // Validation du lieu
    if (formData.location && formData.location.length > 200) {
      newErrors.location = 'Le lieu ne peut pas dépasser 200 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'Culte',
      start_date: moment().toDate(),
      end_date: null,
      location: '',
      reminder_enabled: true,
      reminder_time: 60,
    });
    setEditingEvent(null);
    setShowAddForm(false);
    setErrors({});
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      const firstError = Object.values(errors)[0];
      Alert.alert('Erreur de validation', firstError);
      return;
    }

    try {
      // S'assurer que les dates sont au format ISO avec le fuseau horaire correct
      const startDateISO = moment(formData.start_date).toISOString();
      const endDateISO = formData.end_date 
        ? moment(formData.end_date).toISOString()
        : undefined;

      const eventData = {
        church_id: churchId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        event_type: formData.event_type,
        start_date: startDateISO,
        end_date: endDateISO,
        location: formData.location.trim() || undefined,
        reminder_enabled: formData.reminder_enabled,
        reminder_time: formData.reminder_enabled ? formData.reminder_time : undefined,
        created_by: userId,
      };

      console.log('📅 Sauvegarde événement:', eventData);

      if (editingEvent) {
        await DatabaseService.updateEvent(editingEvent.id, eventData);
        Alert.alert('Succès', 'Événement mis à jour');
      } else {
        await DatabaseService.createEvent(eventData);
        Alert.alert('Succès', 'Événement créé');
      }

      await loadEvents();
      resetForm();
    } catch (error: any) {
      console.error('Erreur sauvegarde événement:', error);
      Alert.alert('Erreur', error.message || 'Impossible de sauvegarder l\'événement');
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: (event.event_type as EventType) || 'Culte',
      start_date: moment(event.start_date).toDate(),
      end_date: event.end_date ? moment(event.end_date).toDate() : null,
      location: event.location || '',
      reminder_enabled: event.reminder_enabled || true,
      reminder_time: event.reminder_time || 60,
    });
    setShowAddForm(true);
    setErrors({});
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteEvent(eventId);
              Alert.alert('Succès', 'Événement supprimé');
              await loadEvents();
            } catch (error) {
              console.error('Erreur suppression événement:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'événement');
            }
          },
        },
      ]
    );
  };

  const getTimeRemaining = (startDate: string) => {
    const now = moment();
    const event = moment(startDate);
    const diffDays = event.diff(now, 'days');

    if (diffDays < 0) {
      return { text: 'Événement passé', color: '#95a5a6', isPast: true };
    } else if (diffDays === 0) {
      const diffHours = event.diff(now, 'hours');
      if (diffHours === 0) {
        return { text: 'Maintenant !', color: '#e74c3c', isPast: false };
      }
      return { text: 'Aujourd\'hui !', color: '#e74c3c', isPast: false };
    } else if (diffDays === 1) {
      return { text: 'Demain', color: '#e67e22', isPast: false };
    } else if (diffDays <= 7) {
      return { text: `Dans ${diffDays} jours`, color: '#f39c12', isPast: false };
    } else {
      return { text: `Dans ${diffDays} jours`, color: '#27ae60', isPast: false };
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

  const handleStartDateSelect = () => {
    setTempStartDate(formData.start_date);
    setShowStartDatePicker(true);
  };

  const handleEndDateSelect = () => {
    setTempEndDate(formData.end_date || moment().add(1, 'day').toDate());
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
      setFormData({ ...formData, start_date: selectedDate });
      if (errors.start_date) {
        setErrors(prev => ({ ...prev, start_date: '' }));
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
      setFormData({ ...formData, end_date: selectedDate });
      if (errors.end_date) {
        setErrors(prev => ({ ...prev, end_date: '' }));
      }
    } else {
      setFormData({ ...formData, end_date: null });
    }
  };

  if (showAddForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {editingEvent ? '✏️ Modifier l\'événement' : '➕ Nouvel événement'}
          </Text>
          <TouchableOpacity onPress={resetForm}>
            <Text style={styles.cancelButton}>Annuler</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Titre de l'événement *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={formData.title}
              onChangeText={(text) => {
                setFormData({ ...formData, title: text });
                if (errors.title) {
                  setErrors(prev => ({ ...prev, title: '' }));
                }
              }}
              placeholder="Ex: Culte spécial, Baptême..."
              placeholderTextColor="#95a5a6"
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            <Text style={styles.helperText}>
              {formData.title.length}/100 caractères
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              value={formData.description}
              onChangeText={(text) => {
                setFormData({ ...formData, description: text });
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: '' }));
                }
              }}
              placeholder="Détails de l'événement..."
              placeholderTextColor="#95a5a6"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            <Text style={styles.helperText}>
              {formData.description.length}/500 caractères
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Type d'événement *</Text>
            <View style={styles.typeButtons}>
              {(['Culte', 'Réunion', 'Séminaire', 'Conférence', 'Autre'] as EventType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.event_type === type && [styles.typeButtonActive, { backgroundColor: getEventTypeColor(type) }]
                  ]}
                  onPress={() => setFormData({ ...formData, event_type: type })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    formData.event_type === type && styles.typeButtonTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date de début *</Text>
            <TouchableOpacity
              style={[styles.dateButton, errors.start_date && styles.inputError]}
              onPress={handleStartDateSelect}
            >
              <Calendar size={20} color="#3498db" />
              <Text style={styles.dateText}>
                {moment(formData.start_date).format('DD/MM/YYYY HH:mm')}
              </Text>
            </TouchableOpacity>
            {errors.start_date && <Text style={styles.errorText}>{errors.start_date}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date de fin (optionnel)</Text>
            <TouchableOpacity
              style={[styles.dateButton, errors.end_date && styles.inputError]}
              onPress={handleEndDateSelect}
            >
              <Calendar size={20} color="#3498db" />
              <Text style={styles.dateText}>
                {formData.end_date 
                  ? moment(formData.end_date).format('DD/MM/YYYY HH:mm')
                  : 'Sélectionner une date'
                }
              </Text>
            </TouchableOpacity>
            {errors.end_date && <Text style={styles.errorText}>{errors.end_date}</Text>}
          </View>

          {/* DateTimePicker - CORRIGÉ POUR ÉVITER LES CRASH SUR ANDROID */}
          {showStartDatePicker && (
            <DateTimePicker
              value={tempStartDate}
              mode="date"  // Mode date uniquement sur Android
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartDateChange}
              minimumDate={new Date()}
              key="start-date-picker-admin"
            />
          )}
          
          {showEndDatePicker && (
            <DateTimePicker
              value={tempEndDate || new Date()}
              mode="date"  // Mode date uniquement sur Android
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onEndDateChange}
              minimumDate={formData.start_date}
              key="end-date-picker-admin"
            />
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Lieu</Text>
            <TextInput
              style={[styles.input, errors.location && styles.inputError]}
              value={formData.location}
              onChangeText={(text) => {
                setFormData({ ...formData, location: text });
                if (errors.location) {
                  setErrors(prev => ({ ...prev, location: '' }));
                }
              }}
              placeholder="Lieu de l'événement..."
              placeholderTextColor="#95a5a6"
            />
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
            <Text style={styles.helperText}>
              {formData.location.length}/200 caractères
            </Text>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.reminderHeader}>
              <Text style={styles.label}>Rappel automatique</Text>
              <TouchableOpacity
                style={styles.reminderToggle}
                onPress={() => setFormData({ ...formData, reminder_enabled: !formData.reminder_enabled })}
              >
                {formData.reminder_enabled ? (
                  <Bell size={20} color="#27ae60" />
                ) : (
                  <Bell size={20} color="#95a5a6" />
                )}
                <Text style={[
                  styles.reminderToggleText,
                  !formData.reminder_enabled && styles.reminderToggleTextOff
                ]}>
                  {formData.reminder_enabled ? 'Activé' : 'Désactivé'}
                </Text>
              </TouchableOpacity>
            </View>

            {formData.reminder_enabled && (
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
                          formData.reminder_time === minutes && styles.reminderButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, reminder_time: minutes })}
                      >
                        <Text
                          style={[
                            styles.reminderButtonText,
                            formData.reminder_time === minutes && styles.reminderButtonTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <View style={styles.buttonGroup}>
            <View style={styles.buttonContainer}>
              <Button
                label="Enregistrer"
                onPress={handleSave}
                variant="primary"
                size="large"
                fullWidth
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 Gestion des événements</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>Aucun événement</Text>
            <Text style={styles.emptySubtext}>
              Créez votre premier événement avec rappel
            </Text>
          </View>
        ) : (
          events.map((event) => {
            const timeRemaining = getTimeRemaining(event.start_date);
            return (
              <View
                key={event.id}
                style={[
                  styles.eventCard,
                  { borderLeftColor: getEventTypeColor(event.event_type as EventType) },
                  timeRemaining.isPast && styles.eventCardPast,
                ]}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventTitleRow}>
                    <View style={styles.eventTypeBadge}>
                      <Text style={[styles.eventTypeText, { color: getEventTypeColor(event.event_type as EventType) }]}>
                        {event.event_type}
                      </Text>
                    </View>
                    <View style={styles.eventActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(event)}
                      >
                        <Edit2 size={18} color="#3498db" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(event.id)}
                      >
                        <Trash2 size={18} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.eventTitle}>{event.title}</Text>

                  {event.description && (
                    <Text style={styles.eventDescription}>{event.description}</Text>
                  )}
                </View>

                <View style={styles.eventInfo}>
                  <View style={styles.eventInfoRow}>
                    <Calendar size={16} color="#7f8c8d" />
                    <Text style={styles.eventInfoText}>
                      {moment(event.start_date).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </View>

                  {event.end_date && (
                    <View style={styles.eventInfoRow}>
                      <Calendar size={16} color="#7f8c8d" />
                      <Text style={styles.eventInfoText}>
                        Jusqu'au {moment(event.end_date).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    </View>
                  )}

                  {event.location && (
                    <View style={styles.eventInfoRow}>
                      <MapPin size={16} color="#7f8c8d" />
                      <Text style={styles.eventInfoText}>{event.location}</Text>
                    </View>
                  )}

                  <View style={styles.eventInfoRow}>
                    <Users size={16} color="#7f8c8d" />
                    <Text style={styles.eventInfoText}>Par {event.created_by}</Text>
                  </View>

                  {event.reminder_enabled && (
                    <View style={styles.eventInfoRow}>
                      <Bell size={16} color="#7f8c8d" />
                      <Text style={styles.eventInfoText}>
                        Rappel {event.reminder_time} min avant
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.countdownBadge,
                      { backgroundColor: timeRemaining.color },
                    ]}
                  >
                    <Clock size={16} color="white" />
                    <Text style={styles.countdownText}>{timeRemaining.text}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cancelButton: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#3498db',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 20,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventCardPast: {
    opacity: 0.6,
  },
  eventHeader: {
    marginBottom: 12,
  },
  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  eventActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  eventInfo: {
    marginTop: 8,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventInfoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
    flex: 1,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  dateText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
    marginLeft: 12,
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
    borderColor: 'transparent',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
  },
  typeButtonTextActive: {
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
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  reminderToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
  },
  reminderToggleTextOff: {
    color: '#95a5a6',
  },
  reminderOptions: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  reminderLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  reminderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reminderButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ecf0f1',
    marginRight: 12,
    marginBottom: 8,
  },
  reminderButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#f0f8ff',
  },
  reminderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  reminderButtonTextActive: {
    color: '#3498db',
  },
  buttonGroup: {
    marginTop: 32,
    marginBottom: 20,
  },
  buttonContainer: {
    marginHorizontal: 6,
  },
}); 