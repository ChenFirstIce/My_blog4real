# Local Markdown Blog Design

## Goal

Turn the current site into a complete personal blog that is stable on Netlify, mobile-friendly, and driven by local Markdown content. The first phase prioritizes core blog usability over a full visual rebuild.

The site will keep the existing Vite + React frontend and Netlify Functions setup. Firebase, login, in-browser post creation, editing, deletion, Firestore, and Storage will be removed.

## Product Direction

The site represents `Chen1Ice`, a computer science student who wants to publish learning notes, essays, education information, honors, anime tracking, and friend links.

The brand text is `Chen1Ice`. The avatar/logo source is the existing root-level `logo.svg`; random placeholder avatars must not be used for the owner identity.

The visual style should be clean, modern, content-first, and mostly light. The palette is based on:

- `#fff9ee` for the main warm light background.
- `#3e342d` for primary text and high-contrast UI.
- `#fad0d8` for soft highlights and selected states.
- `#daf480` for small accent states, badges, or secondary highlights.

The design should avoid unnecessary generated images. Existing visual assets are preferred.

## Architecture

Keep:

- Vite + React + React Router.
- Tailwind CSS.
- Netlify deployment.
- Netlify Function proxy for Bilibili anime data.
- React Markdown rendering, code highlighting, Markmap, and PDF embedding.

Remove:

- Firebase configuration and initialization.
- Google login and admin state.
- Firestore reads/writes for posts and friends.
- Firebase Storage image uploads.
- New post, edit post, and delete post UI.
- Connection status UI tied to Firestore.

Add:

- `src/content/posts/` for local Markdown posts.
- `src/content/site.ts` for owner profile, education, honors, navigation, social links, and homepage content.
- `src/content/friends.ts` for friend link cards.
- `src/lib/posts.ts` for collecting, validating, sorting, filtering, and exposing post data.
- `src/lib/slug.ts` or equivalent utility for stable category/tag/heading slugs if needed.

## Content Model

Each post is a Markdown file with frontmatter:

```yaml
---
title: "Post title"
date: "2026-04-19"
category: "Learning Notes"
tags: ["React", "Markdown"]
excerpt: "Short summary shown on listing pages."
pdf: "/pdf/example.pdf"
draft: false
---
```

Required fields:

- `title`
- `date`
- `category`
- `tags`
- `excerpt`

Optional fields:

- `pdf`: public path to a PDF file to embed in the article.
- `draft`: when true, hide from normal listing in production.
- `series`: future-friendly field for course note collections.
- `cover`: optional image path, but not required in phase one.

The slug should come from the Markdown filename. Example: `src/content/posts/react-hooks.md` becomes `/blog/react-hooks`.

## Blog Features

`/blog`:

- Shows all published posts sorted by date descending.
- Has category filters.
- Has tag filters.
- Shows all tags in a sidebar on desktop and a compact block on mobile.
- Shows recent posts.
- Has useful empty states for no posts or no matches.

`/blog/category/:category`:

- Shows posts in one category.
- Provides a clear way back to all posts.
- Uses human-readable category labels while keeping URL-safe slugs.

`/blog/tag/:tag`:

- Shows posts with the selected tag.
- Provides a clear way back to all posts.
- Tag links must work from both listing cards and article pages.

`/blog/:slug`:

- Renders Markdown with GFM tables, code blocks, images, blockquotes, links, and raw HTML when safe for existing content needs.
- Generates a table of contents from headings.
- Supports article view, mindmap view, and split view when heading structure exists.
- Embeds a PDF when the post frontmatter has `pdf`.
- Shows category, tags, date, and excerpt.
- Provides back navigation to the blog listing.
- Keeps desktop TOC sticky, while mobile TOC should not crowd the screen.

## Obsidian Workflow

Obsidian content can be placed directly inside the website repository under `src/content/posts/`.

Phase one should support common Obsidian-style Markdown as much as practical:

- Standard Markdown headings, lists, tables, code blocks, links, and images.
- Relative image paths when images are placed in a known public or content assets directory.
- Markdown documents structured with headings can be rendered as a Markmap mindmap.

Obsidian-specific syntax that is not standard Markdown can be treated as future work unless it blocks normal reading.

## Anime Page

The anime page stays in React. It continues to fetch `/api/bilibili/anime`, backed by the existing Netlify Function.

This avoids the previously observed Astro import issues with the anime wall. The page should remain read-only and not require login.

## Friends Page

Friend links move from Firestore to static local data in `src/content/friends.ts`.

Each friend item should include:

- `name`
- `url`
- `description`
- optional `avatar`

The page should show link cards and open friend sites in a new tab. No admin add modal is needed in phase one.

## Home Page

The home page should read owner data and recent posts from local content.

It should show:

- `Chen1Ice` identity with `logo.svg` as avatar.
- Short self-introduction.
- Education.
- Honors.
- Latest posts.
- Links to blog, anime, and friends.

Random placeholder images should be removed from owner identity areas.

## Interaction And Motion

All content blocks should use reveal-on-scroll: slight upward movement and fade-in when entering the viewport.

Clickable elements should have micro-interactions:

- Hover/focus states.
- Subtle scale.
- Slightly stronger shadow where elevation is already used.
- Keyboard-visible focus rings.

Motion should respect `prefers-reduced-motion`.

## Responsive Requirements

The site is mobile-first.

Mobile requirements:

- No horizontal scrolling.
- Navigation is easy to use with touch.
- Blog filters are reachable without requiring a desktop sidebar.
- Article content has readable line length and font size.
- Tables and code blocks scroll horizontally inside their own containers.
- PDF and mindmap containers have stable dimensions and do not overflow the viewport.

Desktop requirements:

- Main content width remains readable.
- Blog listing can use a sidebar for tags/recent posts.
- Article TOC can be sticky.

## Error And Empty States

The site should handle:

- No posts.
- Unknown tag/category.
- Unknown post slug.
- Bilibili API failure or missing `BILIBILI_UID`.
- Empty friends list.
- Missing PDF path or unsupported PDF display.

Messages should be concise and include recovery actions when useful.

## Testing And Verification

Implementation should include or preserve automated checks for:

- Post metadata extraction.
- Sorting by date.
- Filtering by category.
- Filtering by tag.
- Slug generation.
- Draft exclusion.

Verification commands:

- `npm run lint`
- `npm run build`

Manual verification:

- `/`
- `/blog`
- `/blog/category/:category`
- `/blog/tag/:tag`
- `/blog/:slug`
- `/anime`
- `/friends`
- Mobile viewport around 375px width.

## Out Of Scope For Phase One

- Full migration to Astro.
- CMS/admin dashboard.
- Login.
- Firebase.
- Comment system.
- Newsletter backend.
- Full Obsidian wiki-link compatibility.
- Complex generated imagery or decorative image generation.
