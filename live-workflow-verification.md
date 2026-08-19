# Live Workflow Verification

The deployed GitHub Pages site was verified with the native account **astra** after its profile role was promoted to `admin`.

- The public archive loads from Supabase and presents its empty archive state without a connection error.
- The protected writer workspace opens and shows the draft editor with no existing drafts.
- The protected owner moderation console opens and shows Applications, Accounts, Articles, and Comments controls.

Optional email verification remains intentionally inactive until a reliable SMTP provider replaces the default Supabase email delivery service.

## Simplified interface and draft recovery update

The public GitHub Pages deployment was verified after commit `f137a24` completed successfully in GitHub Actions.

- The public homepage now shows the simplified heading, navigation, and post discovery language at `https://localastracat.github.io/The-Washiez-Blog-Unofficial-/`.
- The authenticated writer workspace now shows the plain-language draft editor and its visible local-save status.
- The authenticated admin console now shows the simplified Admin, Users, Posts, and Comments controls.

## GitHub Pages deep-link verification

The GitHub Pages workflow for commit `8a77fc7` completed successfully. The direct URL `https://localastracat.github.io/The-Washiez-Blog-Unofficial-/about` was opened in a fresh navigation and rendered the site Guidelines page rather than GitHub Pages’ default 404 screen.

## Public writer application entry point

The public homepage was verified after the GitHub Pages workflow for commit `eb5a845` completed successfully. It now displays an **Apply to write** call-to-action. The link routes to `/The-Washiez-Blog-Unofficial-/workspace`; approved writers reach their desk there, while other signed-in accounts receive the existing writer-application screen.

## Markdown helper and pinned-post controls

The GitHub Pages workflow for commit `9967481` completed successfully. The Astra administrator account was used to inspect the live writer workspace and admin Posts tab without changing content:

- The writer editor displays the **Markdown quick help** panel beneath the post field.
- The administrator sees **Pin** controls for each published post in the Posts moderation tab.
- The current `site_settings.pinned_post_id` remains clear; no post was selected or repositioned during verification.
