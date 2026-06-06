// lib/send-notification.ts
import { supabase } from './supabase';

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  url: string = '/home'
) => {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .single();


 if(error || !data?.subscription) {
    console.log("No subscription found for user:", userId);
    return;
 }

  

  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: data.subscription,
        title,
        body,
        url
      })
    });

    console.log("Push API response:", await res.status);
  } catch (e) {
    console.error("Failed to send push:", e);
  }
};