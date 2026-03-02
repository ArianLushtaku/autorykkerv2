# Autorykker Project Structure Guide

## 📁 New Organized Structure

This project uses **Next.js 15 App Router** with **route groups** for better organization.

### Directory Layout

```
src/
├── app/
│   ├── (marketing)/              ← Marketing pages (public)
│   │   ├── layout.tsx           ← Shared Navigation + Footer
│   │   ├── page.tsx             ← Homepage (/)
│   │   ├── priser/              ← /priser
│   │   ├── om-os/               ← /om-os
│   │   ├── funktioner/          ← /funktioner
│   │   ├── integrationer/       ← /integrationer
│   │   ├── produkt/             ← /produkt
│   │   ├── ressourcer/          ← /ressourcer
│   │   ├── blog/                ← /blog
│   │   ├── guider/              ← /guider
│   │   ├── support/             ← /support
│   │   ├── kontakt/             ← /kontakt
│   │   ├── karriere/            ← /karriere
│   │   ├── presse/              ← /presse
│   │   ├── status/              ← /status
│   │   ├── roi-regner/          ← /roi-regner
│   │   ├── api/                 ← /api (docs)
│   │   ├── privacy/             ← /privacy
│   │   ├── terms/               ← /terms
│   │   └── cookies/             ← /cookies
│   │
│   ├── (auth)/                   ← Authentication pages
│   │   ├── login/               ← /login
│   │   └── signup/              ← /signup
│   │
│   ├── dashboard/                ← Protected dashboard (existing)
│   │   ├── layout.tsx           ← Dashboard layout with sidebar
│   │   ├── page.tsx             ← /dashboard
│   │   ├── problemkunder/       ← /dashboard/problemkunder
│   │   ├── forfaldne/           ← /dashboard/forfaldne
│   │   ├── afventende/          ← /dashboard/afventende
│   │   ├── automatik/           ← /dashboard/automatik
│   │   ├── integrationer/       ← /dashboard/integrationer
│   │   └── indstillinger/       ← /dashboard/indstillinger
│   │
│   ├── layout.tsx                ← Root layout
│   └── globals.css               ← Global styles
│
└── components/
    ├── marketing/                ← Marketing components
    │   ├── Navigation.tsx       ← Main navigation
    │   ├── Footer.tsx           ← Footer
    │   ├── Hero.tsx             ← Homepage hero
    │   ├── Features.tsx         ← Features section
    │   ├── ProblemSolution.tsx  ← Problem/solution section
    │   ├── Testimonials.tsx     ← Testimonials
    │   ├── CTA.tsx              ← Call-to-action
    │   ├── DebtorOverview.tsx   ← Debtor overview
    │   ├── PageHero.tsx         ← Reusable page hero
    │   ├── FeatureImage.tsx     ← Feature mockup images
    │   └── SocialProof.tsx      ← Social proof
    │
    ├── auth/                     ← Auth components
    │   └── AuthGuard.tsx        ← Auth protection
    │
    ├── ui/                       ← Reusable UI components
    │   └── ...
    │
    └── dashboard/                ← Dashboard components (if needed)
```

## 🎯 Key Concepts

### Route Groups `(folder)`
- Parentheses `()` create a route group that **doesn't affect the URL**
- `(marketing)/priser/page.tsx` → URL: `/priser` (not `/marketing/priser`)
- Allows shared layouts without changing routes

### Layouts
- **Root layout** (`app/layout.tsx`): Applies to all pages
- **Marketing layout** (`app/(marketing)/layout.tsx`): Navigation + Footer for marketing pages
- **Dashboard layout** (`app/dashboard/layout.tsx`): Sidebar + Header for dashboard

### Benefits of This Structure

1. **Clear Separation**: Marketing vs Dashboard vs Auth
2. **Shared Layouts**: Navigation/Footer automatically included
3. **Easy to Navigate**: All marketing pages in one folder
4. **No URL Changes**: Route groups don't affect URLs
5. **Scalable**: Easy to add new pages to each section

## 🚀 Adding New Pages

### Marketing Page
```bash
# Create new marketing page
mkdir src/app/(marketing)/new-page
touch src/app/(marketing)/new-page/page.tsx
```

The page will automatically have Navigation + Footer from the layout!

### Dashboard Page
```bash
# Create new dashboard page
mkdir src/app/dashboard/new-feature
touch src/app/dashboard/new-feature/page.tsx
```

The page will automatically have Sidebar + Header from the dashboard layout!

## 📝 Component Organization

### Marketing Components
- **Sections**: Large page sections (Hero, Features, etc.)
- **Shared**: Reusable across multiple pages (PageHero, FeatureImage)
- **UI**: Small reusable components (Navigation, Footer)

### When to Create a Component
- **Reused 2+ times**: Make it a component
- **Complex logic**: Extract to component
- **Page-specific**: Keep in page file

## 🔄 Migration Status

### Completed
- ✅ Created `(marketing)` route group
- ✅ Created marketing layout with Navigation + Footer
- ✅ Moved homepage to `(marketing)/page.tsx`
- ✅ Removed duplicate Navigation/Footer from homepage

### To Do
- Move all marketing pages to `(marketing)` folder
- Update any hardcoded imports
- Clean up old structure
- Test all routes

## 📚 Resources

- [Next.js Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js Layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts)
