import { NextRequest } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:steveoure96@gmail.com', // Change to your real email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { subscription, title, body, url } = await request.json();

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: title || 'KABUSphere',
        body: body || 'New notification',
        url: url || '/home'
      })
    );

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Push send error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}