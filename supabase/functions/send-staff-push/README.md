# Chronicle staff browser push sender

This Supabase Edge Function is invoked by the secured PostgreSQL `pg_net` trigger whenever a new `staff_notifications` record with the `push` channel is inserted. It needs these server-only production secrets, which must **not** be committed to GitHub or exposed in the browser:

| Secret | Purpose |
|---|---|
| `CHRONICLE_VAPID_PUBLIC_JWK` | JSON Web Key for the public half of the Chronicle Web Push VAPID key pair |
| `CHRONICLE_VAPID_PRIVATE_JWK` | JSON Web Key for the private half of the Chronicle Web Push VAPID key pair |
| `CHRONICLE_PUSH_CONTACT` | A `mailto:` contact address used by browser push services |
| `CHRONICLE_WEBHOOK_SECRET` | A high-entropy token supplied as the `x-chronicle-webhook-secret` header by the trusted `pg_net` trigger |

After deploying the function, set `site_settings.push_vapid_public_key` to the URL-safe base64 application-server key derived from the same VAPID public key. Migrations `007` through `009` enable `pg_net`, keep the trigger credentials in the locked-down `private.chronicle_runtime_secrets` table, and create the `staff_notifications_send_push` INSERT trigger. The trigger provides the Supabase publishable-key headers required by the function gateway plus the separate private header checked by this function.

Email notification records use the `email` channel and the `deferred` status. This function deliberately ignores them until a transactional email provider, verified sender domain, and member email-verification flow have been configured. See [`docs/email-mention-notifications.md`](../../../docs/email-mention-notifications.md) for the activation checklist.
