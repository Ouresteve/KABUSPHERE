import { supabase } from '@/lib/supabase';

// Type for the callback to use toast
type ToastCallback = (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;

export const subscribeToPushNotifications = async (userId: string, onToast?: ToastCallback) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push notifications not supported on this device");
    if (onToast) {
      onToast("Push notifications not supported on this device", 'warning');
    }
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    // Save subscription to database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
        user_id: userId,
        subscription: JSON.stringify(subscription),
      },
      { onConflict: 'user_id' });

    if (error) {
      console.error("Failed to save subscription:", error);
      if (onToast) {
        onToast("Failed to save subscription. Please try again.", 'error');
      }
      return null;
    }

    if (onToast) {
      onToast("Push notifications enabled successfully", 'success');
    }
    return subscription;
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
    if (onToast) {
      onToast("Failed to enable push notifications. Please try again.", 'error');
    }
    return null;
  }
};