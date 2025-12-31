import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Calendar, Bell, Clock, MapPin, Users, ChevronRight } from 'lucide-react-native';
import moment from 'moment';
import 'moment/locale/fr';
import { DatabaseService } from '../lib/database';
import { Event } from '../types/database';

interface EventsViewerProps {
  churchId: string;
  compact?: boolean;
}

export function EventsViewer({ churchId, compact = false }: EventsViewerProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [churchId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getEvents(churchId);
      
      // Filtrer les événements à venir (y compris ceux d'aujourd'hui)
      const upcomingEvents = data.filter((event) => {
        const eventDate = moment(event.start_date);
        const today = moment().startOf('day');
        return eventDate.isSameOrAfter(today);
      });
      
      // Trier par date (plus proche en premier)
      const sortedEvents = upcomingEvents.sort((a, b) =>
        moment(a.start_date).valueOf() - moment(b.start_date).valueOf()
      );
      
      // Limiter à 5 événements si mode compact
      setEvents(compact ? sortedEvents.slice(0, 5) : sortedEvents);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const getTimeRemaining = (eventDate: string) => {
    const now = moment();
    const event = moment(eventDate);
    const diffDays = Math.floor(event.diff(now, 'days', true));
    
    if (diffDays < 0) {
      return { text: 'Passé', color: '#95a5a6', isPast: true };
    } else if (diffDays === 0) {
      const diffHours = event.diff(now, 'hours');
      if (diffHours <= 0) {
        const diffMinutes = event.diff(now, 'minutes');
        if (diffMinutes <= 0) {
          return { text: 'En cours', color: '#e74c3c', isPast: false };
        }
        return { text: `Dans ${diffMinutes}min`, color: '#e74c3c', isPast: false };
      }
      return { text: 'Aujourd\'hui', color: '#e74c3c', isPast: false };
    } else if (diffDays === 1) {
      return { text: 'Demain', color: '#e67e22', isPast: false };
    } else if (diffDays <= 7) {
      return { text: `Dans ${diffDays}j`, color: '#f39c12', isPast: false };
    } else {
      const weeks = Math.floor(diffDays / 7);
      if (weeks === 1) {
        return { text: 'Dans 1 semaine', color: '#27ae60', isPast: false };
      } else if (weeks <= 4) {
        return { text: `Dans ${weeks} sem`, color: '#27ae60', isPast: false };
      } else {
        return { text: `Dans ${weeks} sem`, color: '#3498db', isPast: false };
      }
    }
  };

  const formatEventDate = (event: Event) => {
    const startDate = moment(event.start_date);
    const endDate = event.end_date ? moment(event.end_date) : null;
    
    if (endDate && endDate.isSame(startDate, 'day')) {
      // Même jour : afficher seulement l'heure
      return `${startDate.format('DD/MM/YYYY')} • ${startDate.format('HH:mm')}`;
    } else if (endDate) {
      // Sur plusieurs jours
      return `${startDate.format('DD/MM')} → ${endDate.format('DD/MM/YYYY')}`;
    } else {
      // Un seul jour
      return `${startDate.format('DD/MM/YYYY')} • ${startDate.format('HH:mm')}`;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'Culte': return '#3498db';
      case 'Réunion': return '#f39c12';
      case 'Séminaire': return '#9b59b6';
      case 'Conférence': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.emptyState}>
          <Calendar size={compact ? 32 : 48} color="#bdc3c7" />
          <Text style={[styles.emptyText, compact && styles.emptyTextCompact]}>
            Aucun événement à venir
          </Text>
          {!compact && (
            <Text style={styles.emptySubtext}>
              Créez un nouvel événement pour commencer
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, compact && styles.containerCompact]}
      showsVerticalScrollIndicator={!compact}
      refreshControl={
        !compact ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <View style={styles.eventsList}>
        {events.map((event) => {
          const timeRemaining = getTimeRemaining(event.start_date);
          const eventColor = getEventTypeColor(event.event_type);
          
          return (
            <TouchableOpacity 
              key={event.id} 
              style={[
                styles.eventCard,
                compact && styles.eventCardCompact,
                { borderLeftColor: eventColor }
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.eventHeader}>
                <View style={styles.eventTypeBadge}>
                  <View 
                    style={[
                      styles.eventTypeDot, 
                      { backgroundColor: eventColor }
                    ]} 
                  />
                  <Text style={styles.eventTypeText}>{event.event_type}</Text>
                </View>
                
                {!timeRemaining.isPast && (
                  <View style={[styles.countdownBadge, { backgroundColor: timeRemaining.color }]}>
                    <Clock size={12} color="white" />
                    <Text style={styles.countdownText}>{timeRemaining.text}</Text>
                  </View>
                )}
              </View>
              
              <Text style={[styles.eventTitle, compact && styles.eventTitleCompact]}>
                {event.title}
              </Text>
              
              {event.description && !compact && (
                <Text style={styles.eventDescription} numberOfLines={2}>
                  {event.description}
                </Text>
              )}
              
              <View style={styles.eventInfo}>
                <View style={styles.infoRow}>
                  <Calendar size={14} color="#7f8c8d" />
                  <Text style={styles.infoText}>
                    {formatEventDate(event)}
                  </Text>
                </View>
                
                {event.location && (
                  <View style={styles.infoRow}>
                    <MapPin size={14} color="#7f8c8d" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {event.location}
                    </Text>
                  </View>
                )}
                
                {event.reminder_enabled && (
                  <View style={styles.infoRow}>
                    <Bell size={14} color="#f39c12" />
                    <Text style={styles.infoText}>
                      Rappel {event.reminder_time} min avant
                    </Text>
                  </View>
                )}
              </View>
              
              {compact && (
                <View style={styles.eventFooter}>
                  <Text style={styles.createdByText}>
                    Par {event.created_by}
                  </Text>
                  <ChevronRight size={16} color="#95a5a6" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {compact && events.length > 0 && (
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Voir tous les événements</Text>
          <ChevronRight size={16} color="#3498db" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  containerCompact: {
    paddingHorizontal: 0,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyTextCompact: {
    fontSize: 14,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 4,
    textAlign: 'center',
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  eventCardCompact: {
    padding: 14,
    marginBottom: 0,
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
    gap: 6,
  },
  eventTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    textTransform: 'uppercase',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  eventTitleCompact: {
    fontSize: 15,
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 12,
  },
  eventInfo: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#7f8c8d',
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  createdByText: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
}); 