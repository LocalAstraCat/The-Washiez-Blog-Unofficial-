# Browser Push Live Diagnostic

On 20 August 2026, the live Chronicle owner session had notification permission already granted but did not create a `push_subscriptions` row or enable `notification_preferences.browser_push_mentions_enabled`. The public VAPID key decoded to 65 bytes, the service-worker file returned HTTP 200, and the browser-facing Supabase tables returned HTTP 200.

The controlled browser's alert button remained disabled for more than ten seconds and produced no status message, which indicates that its service-worker registration promise did not resolve. The client now applies an eight-second timeout to both service-worker registration and activation. Any equivalent real-browser failure now returns a visible red error panel with the exact technical message, while normal browsers can continue into `PushManager.subscribe()` once the worker is active.
