import { NextRequest } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:steveoure96@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  const { subscription, title, body, url } = await request.json();

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, url })
    );
    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false }, { status: 500 });
  }
}