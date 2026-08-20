# Role Mention Notifications — Research Notes

## Confirmed platform constraints

| Option | How it works | Requirements | Fit for Chronicle |
|---|---|---|---|
| In-browser alert while Chronicle is open | The existing realtime chat subscription recognizes a matching role mention and displays a system notification after a member explicitly enables notifications. | HTTPS and a user-initiated permission request. No email provider or private key is required. | Lowest-complexity option. It does not notify someone whose browser is completely closed. |
| Full browser push | A service worker stores a push subscription and receives messages even when the page is not open. A private server-side sender sends encrypted pushes to the subscription endpoint. | Service worker, user opt-in, push-subscription storage, VAPID credentials, and a secure server-side sending function. | Compatible with a GitHub Pages frontend if the secure sender is a Supabase Edge Function. It adds backend secrets and subscription management. |
| Email per matching role mention | A trusted backend looks up opted-in recipients and sends a transactional email for a role mention. | A verified email address for each recipient, opt-in preferences, rate limiting, plus an email provider/API key and verified sender domain. | Current Chronicle accounts use optional email and the production email-delivery setup remains unresolved, so this requires resolving that foundation first. |

## Source findings

The browser Push API requires an active service worker and a server-sent message to the user’s unique subscription endpoint. The endpoint must be treated as secret. Source: https://developer.mozilla.org/en-US/docs/Web/API/Push_API

The browser Notifications API requires the member’s permission and browsers expect that permission to be requested from a user action such as pressing an enable button. Source: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API

Supabase documents server-side transactional email via Edge Functions and the Resend API, with the provider key stored as an Edge Function secret. Source: https://supabase.com/docs/guides/functions/examples/send-emails

Supabase documents that production email delivery needs custom SMTP; the default service is limited, team-address-only, and not meant for production. Source: https://supabase.com/docs/guides/auth/auth-smtp

## Existing integration check

The available session integrations include an inactive Resend connector, but it is not enabled or configured for this project. No email provider should be enabled until the user selects email delivery and supplies or approves the required provider credentials.

## Selected browser-push architecture

1. The GitHub Pages client registers a scoped service worker and only asks for browser notification permission after a member explicitly presses an opt-in button.
2. An opted-in member’s browser `PushSubscription` is stored in Supabase with its endpoint and encryption keys. The database protects subscriptions so members cannot read or change other members’ subscriptions.
3. When a chat message contains a role mention, a security-definer database function creates one durable notification row per matching recipient. The recipient rules are: `@admins` → admins, `@authors` → writers and admins, and `@owner` → the configured primary owner.
4. A Supabase Database Webhook asynchronously invokes a Supabase Edge Function after a notification row is inserted. The function uses server-only VAPID keys to encrypt and send the push to the recipient’s stored subscription, and removes subscriptions rejected as expired (HTTP 404/410).
5. The email foundation shares the same durable notification rows and stores an email opt-in preference. It remains disabled until a transactional provider, verified sender domain, and reliable member email-verification flow are configured.

Supabase documents Database Webhooks as asynchronous post-change HTTP triggers and documents Edge Functions as server-side Deno functions with secrets managed outside browser code. Sources: https://supabase.com/docs/guides/database/webhooks, https://supabase.com/docs/guides/functions, and https://supabase.com/docs/guides/functions/secrets

The web.dev guidance recommends a library to handle encrypted Web Push payloads and VAPID request formatting. The planned function will use the Deno/Web API-compatible JSR package `@negrel/webpush`; its repository notes that it is independently maintained and includes a security caveat, so the deployed function must be validated against a real browser subscription before enabling notifications for members. Sources: https://web.dev/articles/sending-messages-with-web-push-libraries and https://github.com/negrel/webpush

## Deployment readiness

The owner’s authenticated Supabase dashboard exposes the Edge Functions browser editor and the Secrets section for the Chronicle project. The `send-staff-push` function source is ready for deployment, and sensitive configuration permission was explicitly granted by the owner. The remaining sensitive actions are to deploy the source, save the VAPID private-key secrets and contact address, then configure the `staff_notifications` database webhook to invoke the deployed function.

The Supabase browser editor now contains the reviewed `send-staff-push` TypeScript source and the function name is set to `send-staff-push`. The function has not yet been deployed and no secret has been entered into the dashboard at this point.

The approved Edge Function deployment completed successfully. The live endpoint is `https://klflwtkjvtyuzzxyjgkn.supabase.co/functions/v1/send-staff-push`; it remains inert until its VAPID key-pair secrets, push-contact address, and database webhook are configured.

The Supabase secrets manager is open under the owner’s authenticated session. The public VAPID JWK has been staged as an encrypted project secret; the private JWK and push-service contact setting are being added in the same approved batch. Secret values are not recorded in this repository note.

Both VAPID JWK entries are now staged in the encrypted Supabase secrets form. The final push-service contact setting is still required before the approved batch can be saved.

The VAPID public JWK, VAPID private JWK, and approved `mailto:` contact are all staged in one encrypted Supabase secrets batch. The dashboard has not yet saved the batch, so the deployed function cannot yet access these values.

The encrypted Supabase secrets batch was saved successfully and now lists the public VAPID JWK, private VAPID JWK, and push contact by name only. The authenticated dashboard is now open to Database Webhooks so the `staff_notifications` INSERT event can be connected to the deployed sender.

The Database Webhooks configuration page is loaded and currently has no hooks. It offers a “Create a new hook” action; the next approved step is to configure an INSERT event on `public.staff_notifications` that calls the deployed `send-staff-push` Edge Function with secure function authentication.

The new webhook form is open and its name has been set to `staff_notification_push`. The source table, INSERT event, and Edge Function destination have not yet been selected or saved.

The webhook source-table selector lists project tables by schema. The Chronicle queue table appears as `public staff_notifications`; it remains to be selected before the insert-only event and function target can be configured.

The new webhook source table is now `public.staff_notifications`. The webhook has not yet been limited to INSERT events or linked to an Edge Function target.

The webhook is now limited to `INSERT` events on `public.staff_notifications`. The destination section offers a native “Supabase Edge Functions” target in addition to HTTP requests; the native target will be used to avoid exposing an authentication secret in a database-webhook header.

The native Supabase Edge Function destination is selected and targets `send-staff-push` with POST and the default five-second timeout. The dashboard remained on the creation form after the first create action, so its completion state must be rechecked before treating the webhook as live.

The native webhook creation attempt failed with the dashboard error `schema "supabase_functions" does not exist`, confirming that this project cannot use the native function-webhook path. A fallback is being applied: the sender source now checks a private `x-chronicle-webhook-secret` header, and the database webhook will call the sender’s HTTPS endpoint with that token rather than an exposed service-role credential.

The dashboard’s deployed function initially retained its starter template, so the full reviewed `send-staff-push` source has now been entered into its Code screen. The edited source includes the private webhook-header check and is waiting for the approved “Deploy updates” action.

The authenticated `send-staff-push` source deployment has completed successfully in the Supabase dashboard. The function now requires its matching `CHRONICLE_WEBHOOK_SECRET` before it will process any database-webhook requests.

The `CHRONICLE_WEBHOOK_SECRET` has been staged as an encrypted Supabase secret using a locally generated high-entropy token. Its value is not retained in repository documentation; the dashboard save action is the remaining step before configuring the HTTP webhook header.

The private webhook token was saved successfully and appears in the Supabase encrypted secret list by name and digest only. A fresh Database Webhook form is open for the supported HTTP fallback configuration.

The authenticated HTTP fallback webhook is named `staff_notification_push`, and its table selector is open. The remaining webhook configuration will use `public.staff_notifications`, INSERT-only events, the deployed function URL, and the private header token.

The HTTP fallback webhook now targets `public.staff_notifications`. Its INSERT filter, function URL, and private header are the remaining required settings before creation.

The HTTP fallback webhook is now restricted to INSERT events. Its destination form is set to POST and exposes fields for the deployed function URL and custom request headers; the existing `Content-type: application/json` header will be retained and an additional private webhook-secret header will be added.

The deployed sender URL is now entered. The dashboard automatically inserted an Authorization row, which it did not remove through its row control; instead, that same row will be replaced with the dedicated `x-chronicle-webhook-secret` header so the service-role credential is neither stored nor sent by this webhook.

The HTTP webhook now includes `Content-type: application/json`, the dedicated `x-chronicle-webhook-secret` header with the stored private token, and the dashboard-maintained Supabase Authorization header required for its function endpoint. The sender independently validates the dedicated header and does not authorize requests based on the dashboard Authorization row.

The Database Webhooks service also failed to create the HTTP hook because `supabase_functions` is absent, so it cannot be used for this project. The supported `pg_net` extension was enabled instead, a private server-only secret store and asynchronous trigger were created, and the Edge Function’s platform legacy-JWT check was successfully disabled. The function now relies solely on the high-entropy `x-chronicle-webhook-secret` validation implemented in its own source.

Direct function invocations show that the Supabase browser editor did not replace the active starter function, despite displaying the edited source and a successful-looking deploy action. The live endpoint still returns the starter response. The platform also enforces its publishable-key Authorization header even after the legacy-JWT switch is disabled. The pg_net trigger and function should therefore include the public Authorization header in addition to the private webhook token, and the function source must be deployed through a more reliable route than the current browser-editor flow.
