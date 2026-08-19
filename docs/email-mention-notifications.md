# Deferred email notifications for staff role mentions

Chronicle already records deferred `email` deliveries when a member has opted in and a staff-chat message uses `@admins`, `@authors`, or `@owner`. **No email is sent by the current release.** This prevents accidental mail delivery while the community account system still treats email as optional.

| Required before activation | Why it is required |
|---|---|
| Transactional email provider | The built-in Supabase mail service is not intended for production notification volume. |
| Verified sending domain and sender identity | Delivers mail from a trusted Chronicle address and supports normal spam-prevention checks. |
| Confirmed contact-email policy | Members must explicitly provide and verify an address before it can receive role-mention alerts. |
| Server-only provider credentials | The sending API key must be stored as a Supabase Edge Function secret, never in GitHub Pages code. |
| Email sender function and queue retry policy | Deferred `email` rows must be sent, retried safely, and marked with an outcome without blocking chat. |
| Member-facing opt-in text | The existing email toggle must clearly state what messages will be sent and how to stop them. |

When these prerequisites are ready, add a dedicated Edge Function for the `email` channel. It should send only rows with `status = 'deferred'`, mark a successful delivery as `sent`, record failures without leaking provider responses to readers, and never send an email merely because a user opened the chat page.
