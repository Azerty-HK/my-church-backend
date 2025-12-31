import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { LogoComponent } from '../components/LogoComponent';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    router.replace('/auth');
  };

  return (
    <LinearGradient
      colors={['#1e88e5', '#e53935']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <LogoComponent size={180} showText={false} />
        </View>

        <Text style={styles.title}>myChurch</Text>
        <Text style={styles.subtitle}>
          Gestion d'église moderne{'\n'}et simplifiée
        </Text>

        <View style={styles.features}>
          <FeatureItem text="Gérez les membres facilement" />
          <FeatureItem text="Suivez les finances en temps réel" />
          <FeatureItem text="Générez des rapports complets" />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Commencer</Text>
          <ArrowRight size={20} color="#1e88e5" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.creator}>Created by Henock Aduma</Text>
          <Text style={styles.version}>Version 5.0</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.dot} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e88e5',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    alignItems: 'center',
  },
  creator: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  version: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
