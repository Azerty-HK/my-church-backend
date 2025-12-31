import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Search, Link as LinkIcon, X, ExternalLink, AlertCircle } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import type { Church } from '../types/database';

interface PublicChurchSearchProps {
  visible: boolean;
  onClose: () => void;
}

export function PublicChurchSearch({ visible, onClose }: PublicChurchSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [church, setChurch] = useState<Church | null>(null);
  const [publicLinks, setPublicLinks] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const colors = {
    primary: '#3B82F6',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B', 
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    border: '#E5E7EB',
  };

  if (!visible) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom de votre église');
      return;
    }

    setSearching(true);
    setShowResults(false);
    setNotFound(false);

    try {
      const churches = await DatabaseService.searchChurchesByName(searchQuery.trim());

      if (churches.length === 0) {
        setNotFound(true);
        setChurch(null);
        setPublicLinks([]);
        setShowResults(true);
      } else {
        const foundChurch = churches[0];
        setChurch(foundChurch);

        const links = await DatabaseService.getChurchPublicLinks(foundChurch.id);
        setPublicLinks(links);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Erreur recherche église:', error);
      Alert.alert('Erreur', 'Impossible de rechercher l\'église');
    } finally {
      setSearching(false);
    }
  };

  const openLink = async (url: string) => {
    try {
      console.log('🔗 Ouverture lien:', url);
      
      // 🔥 CORRECTION : Ajout automatique de https:// si absent
      let fixedUrl = url.trim();
      if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
        fixedUrl = 'https://' + fixedUrl;
      }

      const supported = await Linking.canOpenURL(fixedUrl);
      if (supported) {
        await Linking.openURL(fixedUrl);
        console.log('✅ Lien ouvert avec succès');
      } else {
        Alert.alert('Erreur', `Impossible d'ouvrir ce lien`);
      }
    } catch (error: any) {
      console.error('❌ Erreur ouverture lien:', error);
      Alert.alert('Erreur', `Impossible d'ouvrir ce lien`);
    }
  };

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.container}>
        {/* En-tête */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <LinkIcon size={28} color="white" />
            <Text style={styles.headerTitle}>Liens Publics</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Instructions */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <AlertCircle size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Entrez le nom de votre église pour voir les liens publics partagés
            </Text>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { borderColor: colors.border }]}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Nom de votre église..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                autoCapitalize="words"
              />
            </View>
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.searchButtonText}>Rechercher</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Résultats */}
          {showResults && (
            <View style={styles.resultsContainer}>
              {notFound ? (
                <View style={[styles.messageCard, { backgroundColor: colors.error + '20' }]}>
                  <AlertCircle size={32} color={colors.error} />
                  <Text style={[styles.messageTitle, { color: colors.error }]}>
                    Église non trouvée
                  </Text>
                  <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                    Cette église n'utilise pas encore notre application.
                    {'\n\n'}
                    Veuillez vérifier l'orthographe ou contactez votre église pour plus d'informations.
                  </Text>
                </View>
              ) : church && publicLinks.length === 0 ? (
                <View style={[styles.messageCard, { backgroundColor: colors.warning + '20' }]}>
                  <AlertCircle size={32} color={colors.warning} />
                  <Text style={[styles.messageTitle, { color: colors.warning }]}>
                    Aucun lien disponible
                  </Text>
                  <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                    {church.name} utilise notre application mais n'a pas encore partagé de liens publics.
                    {'\n\n'}
                    Revenez plus tard ou contactez votre église directement.
                  </Text>
                </View>
              ) : church && publicLinks.length > 0 ? (
                <>
                  <View style={[styles.churchCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.churchName, { color: colors.text }]}>
                      {church.name}
                    </Text>
                    <Text style={[styles.churchInfo, { color: colors.textSecondary }]}>
                      {publicLinks.length} lien{publicLinks.length > 1 ? 's' : ''} disponible{publicLinks.length > 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={styles.linksContainer}>
                    {publicLinks.map((link, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => openLink(link.url)}
                      >
                        <View style={styles.linkContent}>
                          <View style={[styles.linkIcon, { backgroundColor: colors.primary + '20' }]}>
                            <ExternalLink size={20} color={colors.primary} />
                          </View>
                          <View style={styles.linkInfo}>
                            <Text style={[styles.linkTitle, { color: colors.text }]}>
                              {link.title}
                            </Text>
                            {link.description && (
                              <Text style={[styles.linkDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                                {link.description}
                              </Text>
                            )}
                            <Text style={[styles.linkUrl, { color: colors.primary }]} numberOfLines={1}>
                              {link.url}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.linkArrow, { backgroundColor: colors.primary }]}>
                          <ExternalLink size={16} color="white" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          )}

          {/* Message d'aide */}
          {!showResults && (
            <View style={styles.helpContainer}>
              <Text style={[styles.helpTitle, { color: colors.text }]}>
                Comment ça marche ?
              </Text>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                1. Entrez le nom exact de votre église
                {'\n'}
                2. Cliquez sur "Rechercher"
                {'\n'}
                3. Consultez les liens publics partagés
                {'\n\n'}
                Les liens peuvent inclure : sites web, réseaux sociaux, formulaires, etc.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginTop: 50, // Laisse de l'espace en haut pour un effet modal
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginLeft: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Espace supplémentaire en bas pour le scroll
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    marginLeft: 12,
  },
  searchButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 10,
  },
  messageCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  churchCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  churchName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  churchInfo: {
    fontSize: 14,
  },
  linksContainer: {
    marginBottom: 20,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {
    flex: 1,
    marginLeft: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
    fontWeight: '500',
  },
  linkArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  helpContainer: {
    marginTop: 20,
    padding: 20,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 22,
  },
});