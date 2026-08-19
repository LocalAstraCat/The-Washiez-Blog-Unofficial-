import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

type NotificationRow = { id: string; recipient_id: string; chat_message_id: string; channel: "push" | "email"; attempts: number };
type SubscriptionRow = { id: string; endpoint: string; p256dh_key: string; auth_key: string };
type MessageRow = { room_id: "admins" | "writers"; body: string; profiles: { display_name: string | null } | { display_name: string | null }[] | null };
type WebhookPayload = { type: "INSERT"; table: "staff_notifications"; record: NotificationRow };

function secretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) return JSON.parse(modern).default as string;
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("Supabase service key is unavailable in this function.");
  return legacy;
}

function profileName(profile: MessageRow["profiles"]) {
  const value = Array.isArray(profile) ? profile[0] : profile;
  return value?.display_name?.trim() || "A Chronicle staff member";
}

function pushPayload(message: MessageRow) {
  const room = message.room_id === "admins" ? "Admin room" : "Writer room";
  return JSON.stringify({
    title: "Chronicle staff mention",
    body: `${profileName(message.profiles)} mentioned your role in ${room}.`,
    url: "chat",
    tag: `chronicle-chat-${room.toLowerCase().replace(" ", "-")}`,
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const webhookSecret = Deno.env.get("CHRONICLE_WEBHOOK_SECRET");
  if (!webhookSecret || request.headers.get("x-chronicle-webhook-secret") !== webhookSecret) return new Response("Unauthorized", { status: 401 });
  const webhook = await request.json() as WebhookPayload;
  if (webhook.type !== "INSERT" || webhook.table !== "staff_notifications" || webhook.record?.channel === "email") return Response.json({ skipped: true });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secretKey());
  const notification = webhook.record;
  const { data: current, error: notificationError } = await supabase
    .from("staff_notifications")
    .select("id,recipient_id,chat_message_id,attempts,channel,status")
    .eq("id", notification.id)
    .maybeSingle();
  if (notificationError) throw notificationError;
  if (!current || current.channel !== "push" || current.status !== "pending") return Response.json({ skipped: true });

  const [{ data: message, error: messageError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    supabase.from("chat_messages").select("room_id,body,profiles!chat_messages_author_id_fkey(display_name)").eq("id", current.chat_message_id).maybeSingle(),
    supabase.from("push_subscriptions").select("id,endpoint,p256dh_key,auth_key").eq("user_id", current.recipient_id),
  ]);
  if (messageError) throw messageError;
  if (subscriptionsError) throw subscriptionsError;
  if (!message) {
    await supabase.from("staff_notifications").update({ status: "skipped", last_error: "The source message is no longer available." }).eq("id", current.id);
    return Response.json({ skipped: true });
  }
  if (!subscriptions?.length) {
    await supabase.from("staff_notifications").update({ status: "skipped", last_error: "No active browser subscription." }).eq("id", current.id);
    return Response.json({ skipped: true });
  }

  const exportedKeys = {
    publicKey: JSON.parse(Deno.env.get("CHRONICLE_VAPID_PUBLIC_JWK")!),
    privateKey: JSON.parse(Deno.env.get("CHRONICLE_VAPID_PRIVATE_JWK")!),
  };
  const vapidKeys = await webpush.importVapidKeys(exportedKeys, { extractable: false });
  const applicationServer = await webpush.ApplicationServer.new({
    contactInformation: Deno.env.get("CHRONICLE_PUSH_CONTACT")!,
    vapidKeys,
  });
  const body = pushPayload(message as MessageRow);
  const outcomes = await Promise.allSettled((subscriptions as SubscriptionRow[]).map(async (subscription) => {
    try {
      const subscriber = applicationServer.subscribe({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh_key, auth: subscription.auth_key } });
      await subscriber.pushTextMessage(body, { urgency: webpush.Urgency.High, ttl: 60 * 60 * 24, topic: `chronicle-${current.chat_message_id}` });
      return { subscription, delivered: true };
    } catch (error) {
      const response = error instanceof webpush.PushMessageError ? error.response : undefined;
      if (response?.status === 404 || response?.status === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      throw error;
    }
  }));
  const delivered = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
  const failures = outcomes.filter((outcome) => outcome.status === "rejected");
  const status = delivered ? "sent" : "failed";
  const lastError = failures.length ? String(failures[0].reason).slice(0, 500) : null;
  const { error: updateError } = await supabase.from("staff_notifications").update({
    status,
    attempts: current.attempts + 1,
    delivered_at: delivered ? new Date().toISOString() : null,
    last_error: lastError,
  }).eq("id", current.id);
  if (updateError) throw updateError;
  return Response.json({ delivered, failed: failures.length });
});
