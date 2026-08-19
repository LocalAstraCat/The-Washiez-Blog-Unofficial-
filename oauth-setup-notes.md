# GitHub OAuth Setup Notes

The pending GitHub OAuth application is named **The Washiez Chronicle**. Its homepage is the deployed GitHub Pages address and its callback is the project-specific Supabase authentication callback URL.

The OAuth application was registered and the GitHub provider was enabled in Supabase. The Pages site URL was also saved as both the Supabase Site URL and an allowed redirect URL. The client secret remains only in Supabase and must not be committed to the repository or exposed in the Pages build.

The user later requested that the product use a native username/password account system rather than GitHub accounts. This OAuth configuration should therefore be treated as superseded and can be disabled after native sign-in is verified.
