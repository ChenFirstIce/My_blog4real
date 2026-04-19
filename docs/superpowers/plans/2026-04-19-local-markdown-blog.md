# Local Markdown Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current React blog into a Firebase-free, login-free, local Markdown driven personal blog for `Chen1Ice`.

**Architecture:** Keep Vite + React + React Router and Netlify Functions. Replace Firestore/Storage/Auth data flows with local content modules and Markdown imports. Keep the Bilibili anime proxy in Netlify Functions because Astro import issues were previously observed.

**Tech Stack:** Vite, React, TypeScript, React Router, Tailwind CSS, React Markdown, Markmap, Netlify Functions, Vitest, gray-matter.

---

## File Structure

- Create `src/content/posts/hello-chen1ice.md`: sample post covering tags, category, Markdown, and mindmap headings.
- Create `src/content/posts/course-notes-demo.md`: sample learning note with PDF frontmatter.
- Create `src/content/site.ts`: static owner profile, education, honors, social links, and navigation labels.
- Create `src/content/friends.ts`: static friend-link data.
- Create `src/lib/slug.ts`: stable slug helpers for categories, tags, headings, and filenames.
- Create `src/lib/postsCore.ts`: pure post parsing, sorting, filtering, and metadata utilities.
- Create `src/lib/posts.ts`: Vite `import.meta.glob` adapter for loading Markdown files.
- Create `src/lib/reveal.ts`: small browser helper for reveal-on-scroll.
- Create `src/lib/__tests__/slug.test.ts`: slug helper tests.
- Create `src/lib/__tests__/postsCore.test.ts`: post parsing and filtering tests.
- Modify `package.json`: remove Firebase dependencies, add Vitest scripts and Markdown parser dependency.
- Modify `src/types.ts`: replace Firebase-shaped types with local content types.
- Modify `src/App.tsx`: add category route and keep existing routes.
- Modify `src/components/Layout.tsx`: remove auth/connectivity UI; use `Chen1Ice` and `logo.svg`.
- Modify `src/pages/Home.tsx`: read local site data and recent posts.
- Modify `src/pages/Blog.tsx`: read local posts, tags, categories; remove admin modal.
- Modify `src/pages/PostDetail.tsx`: read local post by slug; remove edit/delete; add PDF embed.
- Modify `src/pages/Friends.tsx`: read static friend data; remove admin modal.
- Modify `src/pages/Anime.tsx`: remove unused Firebase imports and keep Netlify Function fetch.
- Modify `src/index.css`: apply palette, Markdown styling, reveal motion, focus and interaction states.
- Delete `src/firebase.ts`.
- Remove Firebase config files from implementation if unused by build: `firebase-applet-config.json`, `firebase-blueprint.json`, `firestore.rules`.

---

### Task 1: Add Test And Markdown Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install dependencies**

Run:

```powershell
npm install gray-matter
npm install -D vitest
```

Expected: `package.json` and `package-lock.json` update successfully.

- [ ] **Step 2: Update scripts**

In `package.json`, set scripts to:

```json
{
  "dev": "tsx server.ts",
  "build": "vite build",
  "preview": "vite preview",
  "clean": "rimraf dist",
  "lint": "tsc --noEmit",
  "test": "vitest run"
}
```

If `rimraf` is not installed, keep the existing `clean` script unchanged on Windows-sensitive work.

- [ ] **Step 3: Remove Firebase packages**

Run:

```powershell
npm uninstall firebase
```

Expected: `firebase` is gone from `dependencies`.

- [ ] **Step 4: Verify dependency state**

Run:

```powershell
npm run lint
```

Expected at this point: lint may fail because source still imports Firebase. Continue to Task 2 before treating that as a blocker.

---

### Task 2: Implement Slug Utilities With Tests

**Files:**
- Create: `src/lib/__tests__/slug.test.ts`
- Create: `src/lib/slug.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filenameToSlug, slugify } from '../slug';

describe('slugify', () => {
  it('creates stable lowercase slugs for English labels', () => {
    expect(slugify('Learning Notes')).toBe('learning-notes');
  });

  it('keeps Chinese text readable and removes unsafe punctuation', () => {
    expect(slugify('课程 笔记：React 入门')).toBe('课程-笔记-react-入门');
  });

  it('normalizes repeated separators', () => {
    expect(slugify(' React---Markdown  Notes ')).toBe('react-markdown-notes');
  });
});

describe('filenameToSlug', () => {
  it('uses the markdown filename as the post slug', () => {
    expect(filenameToSlug('/src/content/posts/react-hooks.md')).toBe('react-hooks');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- src/lib/__tests__/slug.test.ts
```

Expected: FAIL because `src/lib/slug.ts` does not exist.

- [ ] **Step 3: Implement slug helpers**

Create `src/lib/slug.ts`:

```ts
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function filenameToSlug(path: string): string {
  const filename = path.split(/[\\/]/).pop() ?? path;
  return filename.replace(/\.mdx?$/i, '');
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```powershell
npm test -- src/lib/__tests__/slug.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add package.json package-lock.json src/lib/slug.ts src/lib/__tests__/slug.test.ts
git commit -m "feat: add local content slug helpers"
```

---

### Task 3: Implement Post Parsing Core With Tests

**Files:**
- Create: `src/lib/__tests__/postsCore.test.ts`
- Create: `src/lib/postsCore.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/postsCore.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  collectCategories,
  collectTags,
  filterPostsByCategorySlug,
  filterPostsByTagSlug,
  parseMarkdownPost,
  sortPostsByDateDesc,
} from '../postsCore';

const rawPost = `---
title: "React Hooks 笔记"
date: "2026-04-18"
category: "Learning Notes"
tags: ["React", "Markdown"]
excerpt: "Hooks learning summary."
pdf: "/pdf/hooks.pdf"
draft: false
---

# React Hooks

## useState

Content.
`;

describe('parseMarkdownPost', () => {
  it('extracts frontmatter, body, slug, tag slugs, and category slug', () => {
    const post = parseMarkdownPost('/src/content/posts/react-hooks.md', rawPost);

    expect(post.slug).toBe('react-hooks');
    expect(post.title).toBe('React Hooks 笔记');
    expect(post.category).toBe('Learning Notes');
    expect(post.categorySlug).toBe('learning-notes');
    expect(post.tags.map((tag) => tag.slug)).toEqual(['react', 'markdown']);
    expect(post.pdf).toBe('/pdf/hooks.pdf');
    expect(post.body).toContain('## useState');
  });
});

describe('post collections', () => {
  const posts = [
    parseMarkdownPost('/src/content/posts/old.md', rawPost.replace('2026-04-18', '2026-04-01').replace('React Hooks 笔记', 'Old')),
    parseMarkdownPost('/src/content/posts/new.md', rawPost.replace('2026-04-18', '2026-04-20').replace('React Hooks 笔记', 'New').replace('["React", "Markdown"]', '["Life"]')),
  ];

  it('sorts posts by date descending', () => {
    expect(sortPostsByDateDesc(posts).map((post) => post.slug)).toEqual(['new', 'old']);
  });

  it('collects categories with counts', () => {
    expect(collectCategories(posts)).toEqual([{ label: 'Learning Notes', slug: 'learning-notes', count: 2 }]);
  });

  it('collects tags with counts', () => {
    expect(collectTags(posts)).toEqual([
      { label: 'Life', slug: 'life', count: 1 },
      { label: 'Markdown', slug: 'markdown', count: 1 },
      { label: 'React', slug: 'react', count: 1 },
    ]);
  });

  it('filters by category and tag slug', () => {
    expect(filterPostsByCategorySlug(posts, 'learning-notes')).toHaveLength(2);
    expect(filterPostsByTagSlug(posts, 'react').map((post) => post.slug)).toEqual(['old']);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- src/lib/__tests__/postsCore.test.ts
```

Expected: FAIL because `postsCore.ts` does not exist.

- [ ] **Step 3: Update shared types**

Replace `src/types.ts` with:

```ts
export interface PostTag {
  label: string;
  slug: string;
}

export interface PostSummary {
  slug: string;
  title: string;
  date: string;
  category: string;
  categorySlug: string;
  tags: PostTag[];
  excerpt: string;
  body: string;
  pdf?: string;
  draft: boolean;
}

export interface TaxonomyItem {
  label: string;
  slug: string;
  count: number;
}

export interface Friend {
  id: string;
  name: string;
  url: string;
  description: string;
  avatar?: string;
}

export interface Honor {
  title: string;
  description: string;
}

export interface Education {
  school: string;
  major: string;
  period: string;
}
```

- [ ] **Step 4: Implement post parsing core**

Create `src/lib/postsCore.ts`:

```ts
import matter from 'gray-matter';
import type { PostSummary, PostTag, TaxonomyItem } from '../types';
import { filenameToSlug, slugify } from './slug';

interface RawPostMatter {
  title?: string;
  date?: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
  pdf?: string;
  draft?: boolean;
}

function assertString(value: unknown, field: string, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Post ${path} is missing required frontmatter field: ${field}`);
  }
  return value.trim();
}

function normalizeTags(tags: unknown, path: string): PostTag[] {
  if (!Array.isArray(tags)) {
    throw new Error(`Post ${path} frontmatter field "tags" must be an array`);
  }

  return tags.map((tag) => {
    const label = assertString(tag, 'tags[]', path);
    return { label, slug: slugify(label) };
  });
}

export function parseMarkdownPost(path: string, raw: string): PostSummary {
  const parsed = matter(raw);
  const data = parsed.data as RawPostMatter;
  const category = assertString(data.category, 'category', path);

  return {
    slug: filenameToSlug(path),
    title: assertString(data.title, 'title', path),
    date: assertString(data.date, 'date', path),
    category,
    categorySlug: slugify(category),
    tags: normalizeTags(data.tags, path),
    excerpt: assertString(data.excerpt, 'excerpt', path),
    body: parsed.content.trim(),
    pdf: typeof data.pdf === 'string' && data.pdf.trim() ? data.pdf.trim() : undefined,
    draft: data.draft === true,
  };
}

export function sortPostsByDateDesc(posts: PostSummary[]): PostSummary[] {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function collectByKey(items: { label: string; slug: string }[]): TaxonomyItem[] {
  const map = new Map<string, TaxonomyItem>();

  for (const item of items) {
    const current = map.get(item.slug);
    if (current) {
      current.count += 1;
    } else {
      map.set(item.slug, { label: item.label, slug: item.slug, count: 1 });
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function collectCategories(posts: PostSummary[]): TaxonomyItem[] {
  return collectByKey(posts.map((post) => ({ label: post.category, slug: post.categorySlug })));
}

export function collectTags(posts: PostSummary[]): TaxonomyItem[] {
  return collectByKey(posts.flatMap((post) => post.tags));
}

export function filterPostsByCategorySlug(posts: PostSummary[], categorySlug?: string): PostSummary[] {
  if (!categorySlug) return posts;
  return posts.filter((post) => post.categorySlug === categorySlug);
}

export function filterPostsByTagSlug(posts: PostSummary[], tagSlug?: string): PostSummary[] {
  if (!tagSlug) return posts;
  return posts.filter((post) => post.tags.some((tag) => tag.slug === tagSlug));
}
```

- [ ] **Step 5: Run tests and verify pass**

Run:

```powershell
npm test -- src/lib/__tests__/postsCore.test.ts src/lib/__tests__/slug.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/types.ts src/lib/postsCore.ts src/lib/__tests__/postsCore.test.ts
git commit -m "feat: parse local markdown posts"
```

---

### Task 4: Add Local Content Sources

**Files:**
- Create: `src/content/site.ts`
- Create: `src/content/friends.ts`
- Create: `src/content/posts/hello-chen1ice.md`
- Create: `src/content/posts/course-notes-demo.md`
- Create: `src/lib/posts.ts`

- [ ] **Step 1: Create site data**

Create `src/content/site.ts`:

```ts
import { BookOpen, Github, Heart, Tv, User } from 'lucide-react';
import type { Education, Honor } from '../types';

export const siteProfile = {
  name: 'Chen1Ice',
  role: 'CS Student & Anime Lover',
  avatar: '/logo.svg',
  github: 'https://github.com/ChenFirstIce',
  intro:
    '计算机学生，记录课程学习、项目实践、随笔感想，也整理自己看过的动漫和朋友们的网站。',
};

export const navigation = [
  { name: 'Home', path: '/', icon: User },
  { name: 'Blog', path: '/blog', icon: BookOpen },
  { name: 'Anime', path: '/anime', icon: Tv },
  { name: 'Friends', path: '/friends', icon: Heart },
];

export const education: Education[] = [
  {
    school: '中国海洋大学',
    major: '软件工程',
    period: '2023 - 2027',
  },
];

export const honors: Honor[] = [
  {
    title: '课程与竞赛经历',
    description: '这里可以替换为你的奖学金、竞赛、项目或荣誉经历。',
  },
];

export const socialLinks = [
  { label: 'GitHub', href: siteProfile.github, icon: Github },
];
```

- [ ] **Step 2: Create friend data**

Create `src/content/friends.ts`:

```ts
import type { Friend } from '../types';

export const friends: Friend[] = [
  {
    id: 'example',
    name: 'Friend Site',
    url: 'https://example.com',
    description: '把这里替换成朋友的网站介绍。',
  },
];
```

- [ ] **Step 3: Create sample posts**

Create `src/content/posts/hello-chen1ice.md`:

```md
---
title: "欢迎来到 Chen1Ice 的博客"
date: "2026-04-19"
category: "随笔"
tags: ["Blog", "Life"]
excerpt: "这是本地 Markdown 博客的第一篇示例文章。"
draft: false
---

# 欢迎来到 Chen1Ice 的博客

这里会记录学习笔记、项目复盘、随笔感想，以及一些和动漫有关的内容。

## 为什么改成本地 Markdown

- 不需要登录后台。
- 不依赖 Firebase。
- 可以直接从 Obsidian 整理文章。

## 后续计划

后续可以继续补充课程分类、系列文章、PDF 资料和思维导图。
```

Create `src/content/posts/course-notes-demo.md`:

```md
---
title: "课程笔记示例：Markdown 到思维导图"
date: "2026-04-18"
category: "学习笔记"
tags: ["Course", "Mindmap", "Markdown"]
excerpt: "展示一篇学习笔记如何同时以文章和思维导图方式查看。"
pdf: "/pdf/course-demo.pdf"
draft: false
---

# 课程笔记示例

## 第一章

### 核心概念

使用层级标题组织内容时，文章可以被转换为思维导图。

### 关键问题

- Markdown 是否足够清晰
- 思维导图是否便于复习

## 第二章

### 总结

如果结构清晰，文章视图和思维导图视图可以互相补充。
```

- [ ] **Step 4: Create Vite Markdown loader**

Create `src/lib/posts.ts`:

```ts
import type { PostSummary } from '../types';
import {
  collectCategories,
  collectTags,
  filterPostsByCategorySlug,
  filterPostsByTagSlug,
  parseMarkdownPost,
  sortPostsByDateDesc,
} from './postsCore';

const modules = import.meta.glob('../content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const allPosts: PostSummary[] = sortPostsByDateDesc(
  Object.entries(modules)
    .map(([path, raw]) => parseMarkdownPost(path, String(raw)))
    .filter((post) => !post.draft),
);

export const categories = collectCategories(allPosts);
export const tags = collectTags(allPosts);

export function getRecentPosts(limit = 3): PostSummary[] {
  return allPosts.slice(0, limit);
}

export function getPostBySlug(slug: string | undefined): PostSummary | undefined {
  if (!slug) return undefined;
  return allPosts.find((post) => post.slug === slug);
}

export function getPostsByCategory(categorySlug: string | undefined): PostSummary[] {
  return filterPostsByCategorySlug(allPosts, categorySlug);
}

export function getPostsByTag(tagSlug: string | undefined): PostSummary[] {
  return filterPostsByTagSlug(allPosts, tagSlug);
}
```

- [ ] **Step 5: Run tests and lint**

Run:

```powershell
npm test
npm run lint
```

Expected: tests pass; lint may still fail because pages still import Firebase. Continue to page refactor tasks.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/content src/lib/posts.ts
git commit -m "feat: add local blog content sources"
```

---

### Task 5: Refactor Layout And Home Away From Firebase

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add category route**

Modify `src/App.tsx` routes:

```tsx
<Route path="/blog" element={<Blog />} />
<Route path="/blog/category/:categorySlug" element={<Blog />} />
<Route path="/blog/tag/:tagSlug" element={<Blog />} />
<Route path="/blog/:slug" element={<PostDetail />} />
```

- [ ] **Step 2: Replace Layout imports**

At the top of `src/components/Layout.tsx`, use:

```tsx
import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { navigation, siteProfile, socialLinks } from '../content/site';
```

- [ ] **Step 3: Replace Layout component**

Replace the component body with:

```tsx
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="interactive flex items-center gap-3 rounded-xl">
            <img src={siteProfile.avatar} alt="Chen1Ice logo" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight">{siteProfile.name}</span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `interactive inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                    isActive ? 'bg-[var(--color-accent-soft)] text-[var(--color-text)]' : 'text-[var(--color-muted)]'
                  }`
                }
              >
                <item.icon size={16} />
                {item.name}
              </NavLink>
            ))}
          </div>

          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            className="interactive inline-flex h-11 w-11 items-center justify-center rounded-xl md:hidden"
            aria-label="Toggle navigation"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-[var(--color-border)] px-4 py-3 md:hidden">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `interactive mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold ${
                    isActive ? 'bg-[var(--color-accent-soft)]' : 'text-[var(--color-muted)]'
                  }`
                }
              >
                <item.icon size={20} />
                {item.name}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">{children}</main>

      <footer className="mt-16 border-t border-[var(--color-border)] bg-white/40 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-[var(--color-muted)] sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {siteProfile.name}. Built with local Markdown.</p>
          <div className="flex gap-3">
            {socialLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="interactive inline-flex items-center gap-2 rounded-xl px-2 py-1">
                <link.icon size={16} />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
```

- [ ] **Step 4: Replace Home with local data**

Use `siteProfile`, `education`, `honors`, and `getRecentPosts()` in `src/pages/Home.tsx`. Remove all Firestore imports and state. The latest posts mapping should link to `/blog/${post.slug}` and render `post.date`.

- [ ] **Step 5: Run lint**

Run:

```powershell
npm run lint
```

Expected: Remaining failures are only in pages not yet refactored.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/App.tsx src/components/Layout.tsx src/pages/Home.tsx
git commit -m "refactor: use local profile data"
```

---

### Task 6: Refactor Blog Listing To Local Markdown

**Files:**
- Modify: `src/pages/Blog.tsx`

- [ ] **Step 1: Replace imports**

Use:

```tsx
import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, ListFilter, Tag as TagIcon, X } from 'lucide-react';
import { allPosts, categories, getPostsByCategory, getPostsByTag, tags } from '../lib/posts';
```

- [ ] **Step 2: Replace stateful data logic**

Inside `Blog`, use:

```tsx
const { tagSlug, categorySlug } = useParams<{ tagSlug?: string; categorySlug?: string }>();
const navigate = useNavigate();

const filteredPosts = useMemo(() => {
  if (tagSlug) return getPostsByTag(tagSlug);
  if (categorySlug) return getPostsByCategory(categorySlug);
  return allPosts;
}, [tagSlug, categorySlug]);

const activeTag = tags.find((tag) => tag.slug === tagSlug);
const activeCategory = categories.find((category) => category.slug === categorySlug);
```

- [ ] **Step 3: Remove admin UI**

Delete new post modal, upload handler, delete handler, auth state, and all Firebase-related code.

- [ ] **Step 4: Render local cards**

Each post card link should use:

```tsx
<Link to={`/blog/${post.slug}`}>...</Link>
```

Category chips should link to:

```tsx
<Link to={`/blog/category/${post.categorySlug}`}>{post.category}</Link>
```

Tag chips should link to:

```tsx
<Link to={`/blog/tag/${tag.slug}`}>#{tag.label}</Link>
```

- [ ] **Step 5: Run lint**

Run:

```powershell
npm run lint
```

Expected: Blog-specific Firebase errors are gone.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/pages/Blog.tsx
git commit -m "refactor: render blog from local markdown"
```

---

### Task 7: Refactor Article Detail, PDF, And Mindmap

**Files:**
- Modify: `src/pages/PostDetail.tsx`

- [ ] **Step 1: Replace Firebase data loading**

Use:

```tsx
const { slug } = useParams<{ slug: string }>();
const post = getPostBySlug(slug);
```

Remove `useEffect` loading, edit state, save/delete handlers, admin checks, and Firebase imports.

- [ ] **Step 2: Keep Markdown rendering and heading extraction**

Point heading extraction at `post?.body` instead of `post?.content`.

ReactMarkdown should render:

```tsx
{post.body}
```

- [ ] **Step 3: Add PDF embed**

Below the Markdown article, render:

```tsx
{post.pdf && (
  <section className="mt-10 reveal space-y-4">
    <h2 className="text-2xl font-bold">Related PDF</h2>
    <div className="h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
      <iframe src={post.pdf} title={`${post.title} PDF`} className="h-full w-full" />
    </div>
  </section>
)}
```

- [ ] **Step 4: Update view toggles**

Mindmap and split view should pass `post.body` to `<Mindmap markdown={post.body} />`.

- [ ] **Step 5: Preserve 404 state**

If `!post`, return a clear not-found block with a link to `/blog`.

- [ ] **Step 6: Run lint**

Run:

```powershell
npm run lint
```

Expected: PostDetail-specific Firebase errors are gone.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/pages/PostDetail.tsx
git commit -m "refactor: render posts from local markdown"
```

---

### Task 8: Refactor Friends And Anime Pages

**Files:**
- Modify: `src/pages/Friends.tsx`
- Modify: `src/pages/Anime.tsx`

- [ ] **Step 1: Replace Friends data source**

In `src/pages/Friends.tsx`, remove Firestore/Auth imports and state. Import:

```tsx
import { friends } from '../content/friends';
```

Render the current card grid from this array. Remove the add friend modal.

- [ ] **Step 2: Clean Anime imports**

In `src/pages/Anime.tsx`, remove unused imports:

```tsx
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Anime } from '../types';
import { Plus, X } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
```

Keep only React, Bilibili types, and icons actually used.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: no Firebase import errors remain except possibly `src/firebase.ts` if still included.

- [ ] **Step 4: Commit**

Run:

```powershell
git add src/pages/Friends.tsx src/pages/Anime.tsx
git commit -m "refactor: remove dynamic data from side pages"
```

---

### Task 9: Remove Firebase Files And Polish Global UI

**Files:**
- Delete: `src/firebase.ts`
- Delete if unused: `firebase-applet-config.json`
- Delete if unused: `firebase-blueprint.json`
- Delete if unused: `firestore.rules`
- Modify: `src/index.css`
- Create: `src/lib/reveal.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Search Firebase references**

Run:

```powershell
rg "firebase|Firestore|auth|GoogleAuth|firestore" src package.json
```

Expected: no required source references. If references remain, remove them before deleting files.

- [ ] **Step 2: Delete unused Firebase files**

Run:

```powershell
Remove-Item -LiteralPath src\firebase.ts
Remove-Item -LiteralPath firebase-applet-config.json
Remove-Item -LiteralPath firebase-blueprint.json
Remove-Item -LiteralPath firestore.rules
```

- [ ] **Step 3: Add reveal helper**

Create `src/lib/reveal.ts`:

```ts
export function setupRevealOnScroll() {
  if (typeof window === 'undefined') return;

  const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
  if (elements.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  elements.forEach((element) => observer.observe(element));
}
```

- [ ] **Step 4: Initialize reveal helper**

In `src/main.tsx`, after rendering, add:

```ts
import { setupRevealOnScroll } from './lib/reveal';

setupRevealOnScroll();
```

If route transitions add new reveal elements, call `setupRevealOnScroll()` from `Layout` inside a `useEffect` on location changes instead.

- [ ] **Step 5: Add global design tokens**

In `src/index.css`, add:

```css
:root {
  --color-bg: #fff9ee;
  --color-text: #3e342d;
  --color-muted: rgba(62, 52, 45, 0.68);
  --color-border: rgba(62, 52, 45, 0.12);
  --color-accent: #fad0d8;
  --color-accent-soft: rgba(250, 208, 216, 0.55);
  --color-lime: #daf480;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-bg);
}

.interactive {
  transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, color 180ms ease, border-color 180ms ease;
}

.interactive:hover {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 14px 30px rgba(62, 52, 45, 0.08);
}

.interactive:focus-visible {
  outline: 3px solid var(--color-lime);
  outline-offset: 3px;
}

.reveal {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 420ms ease, transform 420ms ease;
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .interactive,
  .reveal {
    transition: none;
  }

  .interactive:hover {
    transform: none;
  }
}
```

- [ ] **Step 6: Run final static checks**

Run:

```powershell
npm test
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src package.json package-lock.json
git add -u firebase-applet-config.json firebase-blueprint.json firestore.rules src/firebase.ts
git commit -m "refactor: remove firebase and polish global ui"
```

---

### Task 10: Build And Manual Verification

**Files:**
- No source files unless verification finds a bug.

- [ ] **Step 1: Build**

Run:

```powershell
npm run build
```

Expected: PASS and `dist/` is generated.

- [ ] **Step 2: Start local server**

Run:

```powershell
npm run dev
```

Expected: local server starts at `http://localhost:3000`.

- [ ] **Step 3: Verify pages manually**

Open:

```text
http://localhost:3000/
http://localhost:3000/blog
http://localhost:3000/blog/category/学习笔记
http://localhost:3000/blog/tag/markdown
http://localhost:3000/blog/hello-chen1ice
http://localhost:3000/anime
http://localhost:3000/friends
```

Expected:

- Header shows `Chen1Ice` and `logo.svg`.
- No login, admin, Firebase, edit, delete, or upload UI.
- Blog list renders local posts.
- Tag and category links navigate correctly.
- Article page renders Markdown and mindmap.
- PDF section appears for `course-notes-demo`.
- Anime page fetches through `/api/bilibili/anime` and shows a clear error if `BILIBILI_UID` is not set.
- Friends page renders static cards.

- [ ] **Step 4: Verify mobile layout**

Open browser dev tools at 375px width.

Expected:

- No horizontal scroll.
- Mobile navigation opens and closes.
- Blog tags/categories remain reachable.
- Code/table blocks scroll inside their own container.
- Mindmap/PDF containers do not overflow viewport.

- [ ] **Step 5: Commit verification fixes if needed**

If fixes were required:

```powershell
git add <changed-files>
git commit -m "fix: address local blog verification issues"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Local Markdown content: Tasks 3 and 4.
- Remove Firebase/login: Tasks 1, 5, 6, 7, 8, and 9.
- Blog categories/tags/detail/TOC/mindmap/PDF: Tasks 3, 4, 6, and 7.
- `Chen1Ice` brand and `logo.svg`: Tasks 4 and 5.
- Anime page remains React + Netlify Function: Task 8 and Task 10.
- Friends static cards: Task 4 and Task 8.
- Palette, reveal-on-scroll, micro-interactions, reduced motion: Task 9.
- Mobile verification and build/lint/test: Task 10.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation steps remain.

Type consistency:

- `PostSummary`, `PostTag`, and `TaxonomyItem` are defined before use.
- Route params use `slug`, `tagSlug`, and `categorySlug` consistently.
