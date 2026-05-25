# Lead Scraper Web UI

This directory contains the React-based web interface for browsing and managing leads.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling (with custom Twitter-inspired dark theme)
- **Framer Motion** - Smooth animations and transitions
- **Vite 8** - Fast build tool and dev server

## Features

### UI/UX Improvements

1. **Modern Design**
   - Dark theme inspired by Twitter/X
   - Smooth animations with Framer Motion
   - Responsive grid layout
   - Hover effects and transitions

2. **Better Loading States**
   - Skeleton loaders for stats
   - Spinning loader for leads
   - Optimistic UI updates

3. **Enhanced Interactions**
   - Modal dialogs for actions (with keyboard support)
   - Hover effects on cards and buttons
   - Scale animations on button clicks
   - Backdrop blur on modals

4. **Improved Components**
   - Reusable component architecture
   - Type-safe props with TypeScript
   - Modular and maintainable code
   - Better separation of concerns

## Development

### Install Dependencies

```bash
pnpm install
```

### Development Mode

Run the Vite dev server with hot module replacement:

```bash
pnpm run web:ui:dev
```

This starts the UI on `http://localhost:3000` and proxies API requests to `http://localhost:3100`.

Make sure the API server is running:

```bash
# In another terminal
pnpm run web:dev  # or pnpm run web for production
```

### Build for Production

```bash
pnpm run web:build
```

This builds the optimized production bundle to `../public-react/`.

## Usage

### Start the Server with React UI

```bash
# Development database
pnpm run web:dev

# Production database  
pnpm run web
```

The server will automatically serve the React build from `public-react/`.

### Start the Server with Legacy UI

If you want to use the old vanilla HTML/JS interface:

```bash
# Development database
pnpm run web:legacy:dev

# Production database
pnpm run web:legacy
```

## Project Structure

```
web-ui/
├── src/
│   ├── components/       # React components
│   │   ├── Badge.tsx
│   │   ├── FilterBar.tsx
│   │   ├── LeadCard.tsx
│   │   ├── Modal.tsx
│   │   ├── PainPoint.tsx
│   │   ├── StatCard.tsx
│   │   └── StatsGrid.tsx
│   ├── api.ts           # API client
│   ├── types.ts         # TypeScript types
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles + Tailwind
├── public/              # Static assets
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.js  # Tailwind configuration
└── postcss.config.js   # PostCSS configuration
```

## Components

### `<App />`
Main application component that manages state and orchestrates all other components.

### `<StatsGrid />`
Displays the statistics dashboard with animated stat cards.

### `<FilterBar />`
Provides filtering and sorting controls for leads.

### `<LeadCard />`
Individual lead card with badges, pain points, and action buttons.

### `<Modal />`
Reusable modal dialog with keyboard support and backdrop.

### `<Badge />`, `<PainPoint />`, `<StatCard />`
Small, reusable UI components for displaying specific types of content.

## API Integration

The UI communicates with the Express API server running on port 3100. All API calls are defined in `src/api.ts`:

- `GET /api/stats` - Fetch statistics
- `GET /api/leads` - Fetch leads with filtering
- `POST /api/leads/:id/contact` - Mark lead as contacted
- `POST /api/leads/:id/irrelevant` - Mark lead as irrelevant
- `DELETE /api/leads/:id/irrelevant` - Unmark lead as irrelevant

## Environment Variables

The React UI respects the same environment variables as the API server:

- `DATABASE_URL` - PostgreSQL connection string (from `.env` or `.env.dev`)
- `PORT` - API server port (default: 3100)
- `USE_REACT` - Set to "true" to serve React UI (set automatically by `web` and `web:dev` scripts)

## Keyboard Shortcuts

- `Escape` - Close any open modal

## Browser Support

Supports all modern browsers (Chrome, Firefox, Safari, Edge) with ES2020+ support.

## Performance

- Code splitting with Vite/Rolldown
- Tree-shaking for smaller bundle sizes
- Optimized production build (~330KB JS, ~5KB CSS)
- Lazy loading and virtualization for large lists

## Contributing

When adding new features:

1. Create new components in `src/components/`
2. Add TypeScript types to `src/types.ts`
3. Update API client in `src/api.ts` if needed
4. Use Tailwind classes for styling
5. Add Framer Motion for animations
6. Test with `pnpm run web:ui:dev`
7. Build with `pnpm run web:build`

## Migration from Legacy UI

The React UI provides the same functionality as the legacy vanilla HTML/JS interface but with improved UX:

- ✅ Stats dashboard (with animations)
- ✅ Lead filtering and sorting
- ✅ Lead cards with badges
- ✅ Pain points display
- ✅ Mark as contacted (with modal)
- ✅ Mark as irrelevant (with modal)
- ✅ Unmark as irrelevant
- ✅ Open post in new tab
- ✅ Auto-refresh stats every 30s
- ✅ Responsive design

Additional improvements:
- 🎨 Better visual design
- ✨ Smooth animations
- 🔄 Better loading states
- ⌨️ Keyboard shortcuts
- 🧩 Component-based architecture
- 📦 Type-safe code
