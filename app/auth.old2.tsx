import React from 'react';
import { AuthScreen } from '../components/AuthScreen';
import { router } from 'expo-router';

export default function AuthPage() {
  const handleAuthSuccess = async () => {
    router.replace('/');
  };

  return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
}