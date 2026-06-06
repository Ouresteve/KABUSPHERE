import { NextRequest } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:youractualemail@gmail.com', // Use your real email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { subscription, title, body, url } = await request.json();

    if (!subscription?.endpoint) {
      return Response.json({ success: false, error: "Invalid subscription" }, { status: 400 });
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, url })
    );

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Push Error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}