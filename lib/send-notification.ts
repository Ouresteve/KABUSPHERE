// lib/send-notification.ts
import { supabase } from './supabase';

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  url: string = '/home'
) => {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .single();

  if (!data) return;

  try {
    await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: data.subscription, title, body, url })
    });
  } catch (e) {
    console.error(e);
  }
};