import '../polyfills';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UpdateChecker } from '../components/UpdateChecker';
import { ChurchProvider } from '../contexts/ChurchContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useNotifications } from '../hooks/useNotifications';

export default function RootLayout() {
  useFrameworkReady();
  
  // Initialize notifications system
  useNotifications();

  return (
    <UpdateChecker>
      <ChurchProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ChurchProvider>
    </UpdateChecker>
  );
}