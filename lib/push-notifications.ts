import { supabase } from '@/lib/supabase';

export const subscribeToPushNotifications = async (userId: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push notifications not supported on this device");
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
      return null;
    }

    alert("Push subscription saved successfully");
    return subscription;
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
    return null;
  }
};