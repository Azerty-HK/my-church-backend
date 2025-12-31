import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';

interface PublicEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_date: string;
  location?: string;
}

interface PublicEventCountdownProps {
  events: PublicEvent[];
}

export function PublicEventCountdown({ events }: PublicEventCountdownProps) {
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  const calculateCountdown = (startDate: string): string => {
    const now = new Date();
    const eventDate = new Date(startDate);
    const diff = eventDate.getTime() - now.getTime();

    if (diff <= 0) return 'En cours';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}min ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  useEffect(() => {
    if (events.length === 0) return;

    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {};
      events.forEach((event) => {
        newCountdowns[event.id] = calculateCountdown(event.start_date);
      });
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [events]);

  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Calendar size={20} color="#3498db" />
        <Text style={styles.headerTitle}>Événements à venir</Text>
      </View>

      {events.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventTypeBadge}>
              <Text style={styles.eventTypeText}>{event.event_type}</Text>
            </View>
          </View>

          {event.description && (
            <Text style={styles.eventDescription} numberOfLines={2}>
              {event.description}
            </Text>
          )}

          <View style={styles.eventMeta}>
            <View style={styles.eventMetaItem}>
              <Calendar size={14} color="#7f8c8d" />
              <Text style={styles.eventMetaText}>
                {new Date(event.start_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {event.location && (
              <View style={styles.eventMetaItem}>
                <MapPin size={14} color="#7f8c8d" />
                <Text style={styles.eventMetaText}>{event.location}</Text>
              </View>
            )}
          </View>

          <View style={styles.countdownContainer}>
            <Clock size={18} color="#e74c3c" />
            <View style={styles.countdownContent}>
              <Text style={styles.countdownLabel}>Commence dans</Text>
              <Text style={styles.countdownText}>
                {countdowns[event.id] || 'Calcul...'}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  eventTypeBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1976d2',
  },
  eventDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 10,
    lineHeight: 18,
  },
  eventMeta: {
    gap: 6,
    marginBottom: 12,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    fontSize: 12,
    color: '#7f8c8d',
    flex: 1,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3f3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
  },
  countdownContent: {
    flex: 1,
  },
  countdownLabel: {
    fontSize: 11,
    color: '#e74c3c',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
});
