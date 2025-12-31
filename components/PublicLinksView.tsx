import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { ArrowLeft, Search, Link, Youtube, Facebook, Globe, ExternalLink, Church, Calendar, Clock, DollarSign } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import { ValidationService } from '../utils/validation';
import { APP_NAME, ERROR_MESSAGES } from '../utils/constants';
import { LogoComponent } from './LogoComponent';
import type { PublicLink } from '../types/database';

interface PublicLinksViewProps {
  onBack: () => void;
}

interface PublicEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_date: string;
  location?: string;
}

export function PublicLinksView({ onBack }: PublicLinksViewProps) {
  const [churchName, setChurchName] = useState('');
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [churchInfo, setChurchInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [timeUntil, setTimeUntil] = useState<Record<string, string>>({});

  const searchChurchLinks = async () => {
    const validation = ValidationService.validateChurchName(churchName);
    if (!validation.isValid) {
      setError(validation.error || 'Nom d\'église invalide');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Recherche liens My Church pour:', churchName);
      const [linksData, eventsData, churches] = await Promise.all([
        DatabaseService.getPublicLinksByChurchName(churchName.trim()),
        DatabaseService.getEvents(churchName.trim()).catch(() => []),
        DatabaseService.searchChurchesByName(churchName.trim())
      ]);

      setLinks(linksData);
      setEvents(eventsData.filter((e: any) => new Date(e.start_date) >= new Date()));
      setChurchInfo(churches[0] || null);
      setSearched(true);
      
      if (linksData.length === 0) {
        const churches = await DatabaseService.searchChurchesByName(churchName.trim());
        if (churches.length === 0) {
          Alert.alert(
            ERROR_MESSAGES.CHURCH_NOT_FOUND, 
            `Aucune église trouvée avec le nom "${churchName}". Vérifiez l'orthographe exacte.\n\n💡 Essayez "Église de Démonstration My Church" pour voir les liens de démo.`
          );
        } else {
          Alert.alert(
            ERROR_MESSAGES.NO_LINKS_AVAILABLE,
            `L'église "${churchName}" existe mais n'a pas encore publié de liens.`
          );
        }
      } else {
        console.log('✅ Liens My Church trouvés:', linksData.length);
        console.log('✅ Événements trouvés:', eventsData.length);
      }
    } catch (error: any) {
      console.error('❌ Erreur recherche My Church:', error);
      setError('Impossible de rechercher les liens de cette église');
      Alert.alert('Erreur', ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const openLink = async (url: string, title: string) => {
    try {
      console.log('🔗 Ouverture lien My Church:', url);
      
      // 🔥 CORRECTION : Ajout automatique de https:// si absent
      let fixedUrl = url.trim();
      if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
        fixedUrl = 'https://' + fixedUrl;
      }

      // Validation de l'URL corrigée
      const validation = ValidationService.validateUrl(fixedUrl);
      if (!validation.isValid) {
        Alert.alert('Erreur', 'URL invalide');
        return;
      }

      const supported = await Linking.canOpenURL(fixedUrl);
      if (supported) {
        await Linking.openURL(fixedUrl);
        console.log('✅ Lien My Church ouvert avec succès');
      } else {
        Alert.alert('Erreur', `Impossible d'ouvrir le lien "${title}"`);
      }
    } catch (error: any) {
      console.error('❌ Erreur ouverture lien My Church:', error);
      Alert.alert('Erreur', `Impossible d'ouvrir le lien "${title}"`);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'YouTube':
        return <Youtube size={20} color="#ff0000" />;
      case 'Facebook':
        return <Facebook size={20} color="#1877f2" />;
      default:
        return <Globe size={20} color="#3498db" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'YouTube':
        return '#ff0000';
      case 'Facebook':
        return '#1877f2';
      default:
        return '#3498db';
    }
  };

  const clearSearch = () => {
    setChurchName('');
    setLinks([]);
    setEvents([]);
    setChurchInfo(null);
    setSearched(false);
    setError('');
  };

  const getTimeUntilEvent = (startDate: string): string => {
    const now = new Date();
    const event = new Date(startDate);
    const diff = event.getTime() - now.getTime();

    if (diff <= 0) return 'En cours';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Dans ${days}j ${hours}h`;
    if (hours > 0) return `Dans ${hours}h ${minutes}min`;
    return `Dans ${minutes} minutes`;
  };

  useEffect(() => {
    if (events.length === 0) return;

    const interval = setInterval(() => {
      const updates: Record<string, string> = {};
      events.forEach(event => {
        updates[event.id] = getTimeUntilEvent(event.start_date);
      });
      setTimeUntil(updates);
    }, 1000);

    return () => clearInterval(interval);
  }, [events]);

  const formatCurrency = (amount: number, currency: string) => {
    const formatted = amount.toLocaleString('fr-FR');
    switch (currency) {
      case 'FC': return `${formatted} FC`;
      case 'USD': return `$ ${formatted}`;
      case 'EURO': return `€ ${formatted}`;
      default: return formatted;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#3498db" />
        </TouchableOpacity>
        <Text style={styles.title}>Liens publics - {APP_NAME}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchHeader}>
          <Church size={24} color="#3498db" />
          <Text style={styles.searchTitle}>Rechercher une église</Text>
        </View>
        
        <Text style={styles.searchLabel}>
          Entrez le nom exact de l'église pour voir ses liens publics :
        </Text>
        
        <View style={[styles.searchInputGroup, error && styles.inputError]}>
          <Search size={20} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom de l'église *"
            placeholderTextColor="#adb5bd"
            value={churchName}
            onChangeText={(text) => {
              setChurchName(text);
              if (error) setError('');
            }}
            onSubmitEditing={searchChurchLinks}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {churchName.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={searchChurchLinks}
          disabled={loading || !churchName.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Search size={20} color="white" />
          )}
          <Text style={styles.searchButtonText}>
            {loading ? 'Recherche...' : 'Rechercher'}
          </Text>
        </TouchableOpacity>
      </View>

      {searched && (
        <ScrollView style={styles.linksList} showsVerticalScrollIndicator={false}>
          {churchInfo && (
            <View style={styles.churchInfoCard}>
              <View style={styles.churchInfoHeader}>
                {churchInfo.logo_url ? (
                  <Image source={{ uri: churchInfo.logo_url }} style={styles.churchLogo} />
                ) : (
                  <LogoComponent size={48} showText={false} />
                )}
                <Text style={styles.churchInfoName}>{churchInfo.name}</Text>
              </View>

              {churchInfo.address && (
                <Text style={styles.churchInfoDetail}>📍 {churchInfo.address}</Text>
              )}
              {churchInfo.phone && (
                <Text style={styles.churchInfoDetail}>📞 {churchInfo.phone}</Text>
              )}

              {churchInfo.current_balance !== undefined && (
                <View style={styles.balanceCard}>
                  <DollarSign size={20} color="#27ae60" />
                  <Text style={styles.balanceLabel}>Solde actuel</Text>
                  <Text style={styles.balanceAmount}>
                    {formatCurrency(churchInfo.current_balance, churchInfo.currency)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {events.length > 0 && (
            <View style={styles.eventsSection}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color="#3498db" />
                <Text style={styles.sectionTitle}>Événements à venir</Text>
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
                    <Text style={styles.eventDescription}>{event.description}</Text>
                  )}

                  <View style={styles.eventMeta}>
                    <View style={styles.eventMetaItem}>
                      <Calendar size={14} color="#7f8c8d" />
                      <Text style={styles.eventMetaText}>
                        {new Date(event.start_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>

                    {event.location && (
                      <View style={styles.eventMetaItem}>
                        <Text style={styles.eventMetaText}>📍 {event.location}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.countdownContainer}>
                    <Clock size={16} color="#e74c3c" />
                    <Text style={styles.countdownText}>{timeUntil[event.id] || 'Calcul...'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {links.length > 0 ? (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>
                  Liens publics de "{churchName}"
                </Text>
                <Text style={styles.resultsCount}>
                  {links.length} lien{links.length > 1 ? 's' : ''} trouvé{links.length > 1 ? 's' : ''}
                </Text>
              </View>
              
              {links.map((link, index) => (
                <TouchableOpacity
                  key={link.id}
                  style={[styles.linkItem, { borderLeftColor: getPlatformColor(link.platform || 'Autre') }]}
                  onPress={() => openLink(link.url, link.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.linkHeader}>
                    {getPlatformIcon(link.platform || 'Autre')}
                    <Text style={styles.linkTitle}>{link.title}</Text>
                    <ExternalLink size={16} color="#7f8c8d" />
                  </View>
                  
                  {link.description && (
                    <Text style={styles.linkDescription}>
                      {link.description}
                    </Text>
                  )}
                  
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                  
                  <View style={styles.linkFooter}>
                    <Text style={styles.linkPlatform}>
                      {link.platform || 'Autre'}
                    </Text>
                    <Text style={styles.linkDate}>
                      Ajouté le {new Date(link.created_at || '').toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Church size={64} color="#bdc3c7" />
              <Text style={styles.emptyText}>
                {ERROR_MESSAGES.NO_LINKS_AVAILABLE}
              </Text>
              <Text style={styles.emptySubtext}>
                L'église "{churchName}" n'a pas encore publié de liens ou le nom ne correspond pas exactement.
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={clearSearch}
              >
                <Text style={styles.retryButtonText}>Essayer un autre nom</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {!searched && (
        <View style={styles.instructionsContainer}>
          <Church size={48} color="#bdc3c7" />
          <Text style={styles.instructionsTitle}>
            Comment ça marche ?
          </Text>
          <View style={styles.instructionsList}>
            <Text style={styles.instructionItem}>
              1. Tapez le nom exact de l'église
            </Text>
            <Text style={styles.instructionItem}>
              2. Cliquez sur "Rechercher"
            </Text>
            <Text style={styles.instructionItem}>
              3. Consultez les liens publics disponibles
            </Text>
            <Text style={styles.instructionItem}>
              4. Cliquez sur un lien pour l'ouvrir
            </Text>
          </View>
          
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>
              Propulsé par {APP_NAME}
            </Text>
          </View>
        </View>
      )}
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
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  searchLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  searchInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  searchButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linksList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  churchInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  churchInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  churchLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  churchInfoName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  churchInfoDetail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '500',
    flex: 1,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  eventsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
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
    marginBottom: 10,
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
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  resultsHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
    textAlign: 'center',
  },
  resultsCount: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  linkItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
    flex: 1,
  },
  linkDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  linkUrl: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 8,
  },
  linkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkPlatform: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  linkDate: {
    fontSize: 12,
    color: '#adb5bd',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  instructionsList: {
    alignSelf: 'stretch',
    marginBottom: 30,
  },
  instructionItem: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 12,
    textAlign: 'left',
    lineHeight: 24,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  appInfoText: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic',
  },
}); 