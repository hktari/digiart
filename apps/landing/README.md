# Monthly Booklet Drops - Landing Page

A Next.js marketing landing page for an art booklet subscription platform connecting digital artists with collectors.

## Features

- **Dual-Audience Tabs**: Separate content for Artists and Collectors
- **Auto-Playing Slideshow**: 6 booklet mockup images with fade transitions
- **Waitlist Integration**: Resend API for email capture with audience tagging
- **Post-Signup Flow**: "Your Opinion Matters" card with questionnaire invitation
- **Tally Questionnaires**: Embedded forms for product feedback (separate for artists/collectors)
- **Responsive Design**: Mobile-first with editorial print aesthetic
- **Custom Design System**: Tailwind CSS with paper/ink color palette

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS with custom design tokens
- **Fonts**: Crimson Pro (serif) + DM Sans (sans-serif)
- **Icons**: Lucide React
- **Email**: Resend API
- **Forms**: Tally embedded questionnaires

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Resend API account (free tier: 3k emails/month)
- Tally account (free tier: unlimited responses)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
# Resend API Configuration
RESEND_API_KEY=your_resend_api_key_here
RESEND_AUDIENCE_ID=your_audience_id_here

# Tally Form IDs
NEXT_PUBLIC_TALLY_ARTIST_FORM_ID=your_artist_form_id
NEXT_PUBLIC_TALLY_COLLECTOR_FORM_ID=your_collector_form_id
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

## Project Structure

```
apps/landing/
├── app/
│   ├── layout.tsx              # Root layout with fonts
│   ├── page.tsx                # Main landing page
│   ├── artists/page.tsx        # Artists route
│   ├── collectors/page.tsx     # Collectors route
│   ├── questionnaire/
│   │   ├── artists/page.tsx    # Artist questionnaire
│   │   └── collectors/page.tsx # Collector questionnaire
│   └── api/
│       └── waitlist/route.ts   # Resend API integration
├── components/
│   ├── Header.tsx              # Sticky header with tabs
│   ├── Hero.tsx                # Hero with slideshow
│   ├── BookletSlideshow.tsx    # Auto-playing carousel
│   ├── HowItWorks.tsx          # Step-by-step process
│   ├── BenefitsGrid.tsx        # Benefits checklist
│   ├── VisualGallery.tsx       # 3-image showcase
│   ├── TrustBlock.tsx          # Founding artist program
│   ├── FAQ.tsx                 # Accordion FAQ
│   ├── WaitlistForm.tsx        # Email capture form
│   ├── PostSignupCard.tsx      # Post-signup modal
│   ├── TallyEmbed.tsx          # Tally iframe wrapper
│   ├── Footer.tsx              # Footer CTA
│   └── ui/                     # Reusable primitives
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Accordion.tsx
├── lib/
│   ├── constants.ts            # Content and config
│   └── resend.ts               # Resend client
└── public/
    └── booklets/               # Slideshow images (01-06.png)
```

## Configuration


### Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Create an audience for your waitlist
4. Add credentials to `.env.local`

### Tally Setup

1. Sign up at [tally.so](https://tally.so)
2. Create two forms:
   - Artist questionnaire (see plan for questions)
   - Collector questionnaire (see plan for questions)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in project settings
4. Deploy

```bash
# Or use Vercel CLI
npm install -g vercel
vercel
```

## Design System

https://www.tints.dev/palette/v1:YmVpZ2V8ZTZlNGQ2fDEwMHxwfDB8MHwwfDEwMHxhfmZ1Y2hzaWF8RTZENkUwfDIwMHxwfDB8MHwwfDEwMHxhfm9jZWFufEQ2RDhFNnwyMDB8cHwwfDB8MHwxMDB8YX5qYWRlfEQ2RTZEQ3wxMDB8cHwwfDN8MHwxMDB8YQ

### Colors

- **Beige**: `#e6e4d6` (background)
- **Fuchsia**: `#E6D6E0` (tertiary accent)
- **Ocean**: `#D6D8E6` (primary accent)
- **Jade**: `#D6E6DC` (secondary accent)

### Typography

- **Serif**: Crimson Pro (headlines, emphasis)
- **Sans**: DM Sans (body, UI)

## Content Management

All copy is centralized in `lib/constants.ts`. Update content there to modify:
- Headlines and CTAs
- How It Works steps
- Benefits lists
- FAQ items

## License

All rights reserved.
