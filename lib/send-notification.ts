import { supabase } from './supabase';

export const sendPushNotification = async (
  userId: string, 
  title: string, 
  body: string,
  url: string = '/home'
) => {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const subscription = subscriptions[0].subscription;

  try {
    await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        title,
        body,
        url
      })
    });
  } catch (error) {
    console.error('Failed to send push:', error);
  }
};