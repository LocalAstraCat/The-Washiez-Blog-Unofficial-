# Chronicle email role-mention notifications — activation research

## Why email is still disabled

Chronicle accounts are designed to work with a username and password, so a member’s optional contact address is not yet a verified delivery address. Supabase’s default mail service is not suitable for community notifications: it only sends to authorised project-team addresses, applies a low and changeable rate limit, and carries no delivery guarantee. [1]

The existing notification system therefore does the safe thing: it can record a member’s **deferred** email preference, but it does not send any email. Browser push remains the active role-mention channel.

## Viable future approaches

| Approach | How it would work for Chronicle | Tradeoffs | Setup complexity |
|---|---|---|---|
| **Resend + a Chronicle sending subdomain** | A secure Supabase function sends queued, verified-member role mentions through the Resend API. Recommended sender shape: `alerts@notify.your-domain`. | Strongest long-term fit for transactional notifications, but requires a domain controlled by Chronicle and DNS setup. Resend requires a verified domain for sending. [2] [3] | Moderate |
| **Brevo SMTP/API + verified sender** | Use Brevo for the custom SMTP service required by Supabase Auth and, optionally, its API for the queued mention sender. | Can support both verification messages and notifications from one provider. It still requires domain authentication, configured transactional senders, and provider credentials. [4] | Moderate |
| **Postmark sender signature as a provisional path** | Verify one owner-controlled sender address and send only small-volume role alerts while a custom domain is planned. | Faster to start if a sender address can be verified, but a verified domain is the more maintainable and deliverable choice as the community grows. [5] | Low to moderate |

## Recommended staged solution

The practical long-term route is **Resend with a dedicated sending subdomain** once Chronicle has a domain it controls. Resend explicitly recommends using a subdomain to separate transactional sending reputation, and domain verification requires the DNS records it provides, including SPF and DKIM. [2] [3]

The implementation should follow this order:

1. Obtain or connect a Chronicle-owned domain, then configure a subdomain such as `notify.example.com` with the provider’s DNS records.
2. Add a verified `From` address, for example `The Washiez Chronicle <alerts@notify.example.com>`.
3. Configure the same provider as Supabase Auth’s custom SMTP service so contact-email verification messages can reliably reach non-team members. Supabase supports custom SMTP providers such as Resend, Brevo, and Postmark. [1]
4. Add a dedicated **Verify contact email** flow. A member enters an optional address, receives a one-time verification link, and only a verified address can turn on the email role-mention preference.
5. Deploy a dedicated email-sender function that processes only `staff_notifications` records with `channel = 'email'` and `status = 'deferred'`. It must send idempotently, mark successful rows as `sent`, and record failure information without exposing provider details to regular members.
6. Keep browser push separate and primary. Email should be an opt-in backup and should include a direct preference-management link.

No sender domain, provider key, SMTP credential, or email delivery has been configured by this research. The current Chronicle release remains browser-push-only for real-time role mentions.

## References

[1]: https://supabase.com/docs/guides/auth/auth-smtp "Supabase — Send emails with custom SMTP"
[2]: https://resend.com/docs/dashboard/domains/introduction "Resend — Verified domains"
[3]: https://resend.com/docs/add-a-domain "Resend — Add and verify a domain"
[4]: https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP "Brevo — Send transactional emails using SMTP"
[5]: https://postmarkapp.com/support/article/adding-sender-signatures "Postmark — Adding sender signatures"
