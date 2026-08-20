import { Bell, BellOff, Mail, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import "./StaffChatNotifications.css";
import { browserPushSupported, createBrowserPushSubscription, removeBrowserPushSubscription } from "@/lib/browserPush";
import { fetchNotificationPreferences, fetchPushVapidPublicKey, removePushSubscription, saveNotificationPreferences, savePushSubscription, useSupabaseQuery } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type AlertMessage = { tone: "success" | "error"; summary: string; detail?: string };

function errorDetail(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "An unexpected browser error occurred.";
}

export function StaffChatNotifications() {
  const preferences = useSupabaseQuery(fetchNotificationPreferences, []);
  const [message, setMessage] = useState<AlertMessage>();
  const [isSaving, setIsSaving] = useState(false);
  const supported = browserPushSupported();
  const browserEnabled = Boolean(preferences.data?.browserPushMentionsEnabled);

  const enableBrowserPush = async () => {
    setMessage(undefined);
    setIsSaving(true);
    try {
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Browser permission was not granted. You can enable it later in your browser settings.");
      const vapidPublicKey = await fetchPushVapidPublicKey();
      if (!vapidPublicKey) throw new Error("Chronicle’s browser-alert key is not available yet. Please try again shortly.");
      const subscription = await createBrowserPushSubscription(vapidPublicKey, import.meta.env.BASE_URL);
      await savePushSubscription(subscription);
      await saveNotificationPreferences({ browserPushMentionsEnabled: true, emailMentionsEnabled: preferences.data?.emailMentionsEnabled ?? false });
      await preferences.refetch();
      setMessage({ tone: "success", summary: "Browser alerts are on for role mentions." });
    } catch (error) {
      const detail = errorDetail(error);
      console.error("[Chronicle browser push] Could not enable alerts.", error);
      setMessage({ tone: "error", summary: "Browser alerts could not be enabled. Your setting was not saved.", detail });
    } finally { setIsSaving(false); }
  };

  const disableBrowserPush = async () => {
    setMessage(undefined);
    setIsSaving(true);
    try {
      const subscription = await removeBrowserPushSubscription(import.meta.env.BASE_URL);
      if (subscription) await removePushSubscription(subscription.endpoint);
      await saveNotificationPreferences({ browserPushMentionsEnabled: false, emailMentionsEnabled: preferences.data?.emailMentionsEnabled ?? false });
      await preferences.refetch();
      setMessage({ tone: "success", summary: "Browser alerts are off." });
    } catch (error) {
      const detail = errorDetail(error);
      console.error("[Chronicle browser push] Could not disable alerts.", error);
      setMessage({ tone: "error", summary: "Browser alerts could not be turned off.", detail });
    } finally { setIsSaving(false); }
  };

  return <section className="staff-chat-notifications" aria-label="Staff chat notifications"><div className="staff-chat-notifications__heading"><Bell size={17} /><div><strong>Role mention alerts</strong><p>Get a browser alert for <code>@admins</code>, <code>@authors</code>, or <code>@owner</code>.</p></div></div>{preferences.isLoading ? <p className="staff-chat-notifications__status">Checking your alert settings…</p> : !supported ? <p className="staff-chat-notifications__status">This browser cannot receive push alerts. You can still see mention labels in chat.</p> : <div className="staff-chat-notifications__actions"><Button type="button" size="sm" variant={browserEnabled ? "outline" : "default"} disabled={isSaving} onClick={() => void (browserEnabled ? disableBrowserPush() : enableBrowserPush())}>{browserEnabled ? <><BellOff size={14} /> Turn off browser alerts</> : <><Bell size={14} /> Enable browser alerts</>}</Button><span>{browserEnabled ? <><ShieldCheck size={13} /> Enabled for this browser</> : "Optional — you choose whether to turn this on."}</span></div>}<div className="staff-chat-email-foundation"><Mail size={14} /><p><strong>Email backup is being prepared.</strong> It will stay off until Chronicle has verified member email addresses and a trusted sending service.</p></div>{message && <div className={`staff-chat-notifications__message staff-chat-notifications__message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}><strong>{message.summary}</strong>{message.detail && <span>Technical details: {message.detail}</span>}</div>}</section>;
}
