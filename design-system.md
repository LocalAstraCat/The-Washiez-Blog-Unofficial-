# Washiez Chronicle: Original Visual System

## Creative direction

The Chronicle uses an original **“freshly washed, high-energy community desk”** identity. It does not replicate the official Washiez site or borrow its page layout, imagery, or visual composition. The design translates only the approved color cues into a distinct editorial product: dark dashboard blue for grounding, saturated blue for water, red for urgency, lime for progress, yellow for highlights, and white circular foam details.

## Palette

| Token | Value | Intended use |
|---|---:|---|
| Ink navy | `#11162E` | Outline, navigation, long-form reading contrast |
| Wash blue | `#2478FF` | Primary panels, links, interaction focus |
| Signal red | `#FF4B45` | Headlines, moderation emphasis, action accents |
| Foam white | `#F7FBFF` | Surface background and high-contrast type |
| Lime rinse | `#B9F227` | Positive states, category accents, callouts |
| Sun yellow | `#FFD83D` | Secondary highlights and warnings |
| Sky mist | `#92E7FF` | Water-like details and soft information surfaces |

## Original interface motifs

The public experience combines an off-center hero panel with CSS-generated foam bubbles, angled rinse stripes, outlined metadata pills, and intentionally high-contrast editorial cards. Private writer and moderation areas retain functional density while using the same dark outlines, blue panels, and bright state colors.

## Hosting boundary

GitHub Pages can host static HTML, CSS, and JavaScript. The Chronicle’s current database, server procedures, OAuth session handling, comments, votes, role gates, and moderation actions require a separate backend. A compatible hybrid release therefore needs a static frontend on GitHub Pages plus an API/auth backend on a server-capable host, with cross-origin configuration and an OAuth callback configured for the chosen public domain. No official-site visual material is required for that architecture.
