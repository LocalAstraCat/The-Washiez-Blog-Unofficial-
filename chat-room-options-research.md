# Chronicle Chat Room Options — Research Notes

## Official source findings

| Topic | Finding | Source |
|---|---|---|
| Discord incoming webhooks | Incoming webhooks can post to a specific Discord channel, but they are a one-way posting mechanism rather than a complete two-way chat sync. | [Discord Webhook Resource](https://docs.discord.com/developers/resources/webhook) |
| Discord two-way message sync | Receiving Discord channel activity requires a bot connected to Discord’s Gateway. The connection must be maintained, heartbeated, and handle reconnects; message events are part of the Guild Messages intent. | [Discord Gateway](https://docs.discord.com/developers/events/gateway) and [Gateway Events](https://docs.discord.com/developers/events/gateway-events) |
| Supabase text chat | Supabase documents Realtime as suitable for chat and recommends Broadcast with authorization for scalable and secure realtime updates. | [Supabase Realtime](https://supabase.com/docs/guides/realtime) and [Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) |
| Supabase Free Plan capacity | Free projects enter read-only mode at 500 MB of database data. Text messages live in database rows, not the separate file-storage bucket. Retention/deletion policies prevent unbounded historical growth. | [Supabase Database Size](https://supabase.com/docs/guides/platform/database-size) |

## Preliminary recommendation

For two small private staff rooms, use native Chronicle text rooms backed by secure database rows and Realtime delivery. Create one `admin` room restricted to admins and one `writers` room accessible to writers and admins. Do not allow file uploads in version one. Add a retention setting (for example, remove messages older than 12 months) before release.

A Discord webhook is suitable only for one-way notifications, such as alerting the owner when a writer posts a message. A true Discord-to-site mirror needs a bot and a persistent connection, which is materially more operationally complex than native room chat.

## Conservative 100-character message capacity estimate

The estimate uses Supabase’s 500 MiB Free Plan database threshold and reserves 60 MiB for the pre-existing project database. The 100 characters of user text alone are not used as the per-message size because each record also needs IDs, timestamp, room information, row metadata, alignment, and index entries.

| Assumed total per message | Estimated messages before 500 MiB | Estimated messages after reserving 60 MiB |
|---|---:|---:|
| 256 bytes | 2,048,000 | 1,802,240 |
| 512 bytes — planning baseline | 1,024,000 | 901,120 |
| 1 KiB — highly conservative | 512,000 | 450,560 |

At the 512-byte planning baseline and after reserving 60 MiB, 50 messages per day lasts about 49 years and 200 messages per day lasts about 12 years before the database threshold. This is an estimate, not a capacity guarantee; monitoring database reports and retaining only text messages are still appropriate safeguards.

## Confirmed implementation decisions

| Requirement | Decision |
|---|---|
| Rooms | A private `admin` room for admins only, plus a private `writers` room for writers and admins. |
| Retention | A daily database-native scheduled job deletes only unpinned messages older than three months. It uses Supabase Cron (`pg_cron`), so it operates independently of the static GitHub Pages frontend. |
| Pinning | A security-definer database function allows only admins to pin or unpin individual messages. Pinned messages are excluded from the retention deletion query. |
| Search | The client sends a text search to the chat message table. The same Row Level Security policies that protect normal reads also constrain search results. |
| Mentions | Plain-text role mentions supported in both rooms: `@admins`, `@authors`, and `@owner`. `@authors` is displayed as “writers” in the interface because the existing role name is `writer`; both spellings can be recognized while composing. |
| Realtime | Use database-change subscriptions for newly inserted permitted messages. RLS applies to Postgres Changes, avoiding an unauthenticated message feed. No extra broadcast policy is needed for this first version. |

Official Supabase documentation confirms that Cron can execute SQL within Postgres and documents scheduled SQL deletion of old rows. It also states that Postgres Changes with RLS sends rows only to clients allowed to read them. Sources: https://supabase.com/docs/guides/cron/quickstart and https://supabase.com/docs/guides/realtime/authorization
