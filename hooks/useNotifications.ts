import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '../services/NotificationService';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // 1. Register for push notifications
    NotificationService.registerForPushNotificationsAsync().then(token => {
      if (token) setExpoPushToken(token);
    });

    // 2. Listen for incoming notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // 3. Listen for interactions with notifications (when user taps on it)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response.notification.request.content);
      // Here you can handle routing based on response.notification.request.content.data
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    scheduleNotification: NotificationService.scheduleLocalNotification
  };
}
