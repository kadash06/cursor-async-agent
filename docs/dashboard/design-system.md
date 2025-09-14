# Dashboard Design System

This document outlines the design system for the new Dashboard application, providing a comprehensive foundation for consistent, accessible, and scalable UI components.

## Overview

The Dashboard design system is built on modern web standards with a focus on accessibility, performance, and developer experience. It leverages shadcn/ui as the component foundation, ensuring WCAG AA compliance and internationalization support.

## Design Tokens

### Color Palette

The color system uses a semantic approach with comprehensive light and dark mode support. All colors meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text).

#### Primary Colors
- **Primary**: `#0066cc` (Blue 500) - Main brand actions and CTAs
- **Primary Hover**: `#0052a3` - Interactive states
- **Primary Active**: `#004080` - Pressed states

#### Neutral Colors
- **Background**: `#ffffff` (Light) / `#0f172a` (Dark)
- **Surface**: `#f8fafc` (Light) / `#1e293b` (Dark)
- **Surface Secondary**: `#f1f5f9` (Light) / `#334155` (Dark)
- **Border**: `#e2e8f0` (Light) / `#475569` (Dark)
- **Border Focus**: `#0066cc`
- **Text Primary**: `#0f172a` (Light) / `#f8fafc` (Dark)
- **Text Secondary**: `#475569` (Light) / `#cbd5e1` (Dark)
- **Text Tertiary**: `#64748b` (Light) / `#94a3b8` (Dark)

#### Semantic Colors
- **Success**: `#10b981` - Positive actions and states
- **Warning**: `#f59e0b` - Caution and alerts
- **Error**: `#ef4444` - Errors and destructive actions
- **Info**: `#3b82f6` - Informational content

#### Transparency Scale
- **Overlay**: `rgba(0, 0, 0, 0.5)` (Light) / `rgba(0, 0, 0, 0.7)` (Dark)
- **Modal Backdrop**: `rgba(0, 0, 0, 0.6)` (Light) / `rgba(0, 0, 0, 0.8)` (Dark)

### Typography Scale

Built on Inter font family with a systematic scale ensuring readability across devices.

| Token | Font Size | Line Height | Weight | Usage |
|-------|-----------|-------------|--------|--------|
| `display-2xl` | 4.5rem (72px) | 1.1 | 700 | Hero headings |
| `display-xl` | 3.75rem (60px) | 1.1 | 700 | Page titles |
| `display-lg` | 3rem (48px) | 1.1 | 600 | Section headers |
| `display-md` | 2.25rem (36px) | 1.2 | 600 | Major headings |
| `display-sm` | 1.875rem (30px) | 1.2 | 600 | Subsection headers |
| `heading-xl` | 1.5rem (24px) | 1.3 | 600 | Card titles |
| `heading-lg` | 1.25rem (20px) | 1.4 | 600 | Component headers |
| `heading-md` | 1.125rem (18px) | 1.4 | 600 | Form labels |
| `heading-sm` | 1rem (16px) | 1.5 | 600 | Small headers |
| `body-lg` | 1.125rem (18px) | 1.6 | 400 | Primary content |
| `body-md` | 1rem (16px) | 1.6 | 400 | Secondary content |
| `body-sm` | 0.875rem (14px) | 1.5 | 400 | Tertiary content |
| `caption` | 0.75rem (12px) | 1.4 | 500 | Metadata, captions |

### Spacing Scale

A standardized spacing system based on a 4px base unit for consistent layouts.

| Token | Value | Usage |
|-------|-------|--------|
| `space-0` | 0px | No spacing |
| `space-1` | 4px | Minimal gaps |
| `space-2` | 8px | Small elements |
| `space-3` | 12px | Component padding |
| `space-4` | 16px | Standard padding |
| `space-5` | 20px | Medium spacing |
| `space-6` | 24px | Large padding |
| `space-8` | 32px | Section spacing |
| `space-10` | 40px | Major sections |
| `space-12` | 48px | Page sections |
| `space-16` | 64px | Layout margins |
| `space-20` | 80px | Container spacing |
| `space-24` | 96px | Page margins |

### Border Radius

Consistent corner rounding for various component types.

| Token | Value | Usage |
|-------|-------|--------|
| `radius-none` | 0px | Sharp corners |
| `radius-sm` | 4px | Subtle rounding |
| `radius-md` | 6px | Standard components |
| `radius-lg` | 8px | Cards, dialogs |
| `radius-xl` | 12px | Large surfaces |
| `radius-2xl` | 16px | Hero elements |
| `radius-full` | 9999px | Pills, avatars |

### Elevation (Shadows)

Shadow system for depth and hierarchy using CSS box-shadow.

| Token | Value | Usage |
|-------|-------|--------|
| `shadow-none` | none | Flat elements |
| `shadow-sm` | 0 1px 2px 0 rgba(0,0,0,0.05) | Subtle lift |
| `shadow-md` | 0 4px 6px -1px rgba(0,0,0,0.1) | Cards, panels |
| `shadow-lg` | 0 10px 15px -3px rgba(0,0,0,0.1) | Modals, dropdowns |
| `shadow-xl` | 0 20px 25px -5px rgba(0,0,0,0.1) | Tooltips, popovers |
| `shadow-2xl` | 0 25px 50px -12px rgba(0,0,0,0.25) | High-priority overlays |

## Component Library

### shadcn/ui Foundation

The design system is built on [shadcn/ui](https://ui.shadcn.com/), a modern component library featuring:

- **Radix UI Primitives**: Accessible, unstyled components
- **Tailwind CSS**: Utility-first styling approach
- **TypeScript**: Type-safe component APIs
- **Customizable**: Easy theming and customization
- **Tree-shakable**: Only bundle used components

### Theming Strategy

#### CSS Variables Approach
All design tokens are exposed as CSS custom properties with namespacing:

```css
:root {
  --dashboard-colors-primary: 0 102 204; /* hsl(207, 100%, 40%) */
  --dashboard-colors-background: 0 0 100; /* hsl(0, 0%, 100%) */
  /* ... */
}
```

#### Theme Provider
A React context provider manages theme switching between light/dark modes:

```tsx
<DashboardThemeProvider theme="light">
  <App />
</DashboardThemeProvider>
```

#### Theme Overrides
Components support theme overrides for contextual theming:

```tsx
<Button theme="danger">Delete</Button>
```

### Motion Guidelines

#### Animation Principles
- **Purposeful**: Every animation serves a functional purpose
- **Subtle**: Respect user's motion preferences
- **Consistent**: Standardized easing and timing
- **Performant**: GPU-accelerated transforms

#### Timing Scale
| Token | Duration | Easing | Usage |
|-------|----------|--------|--------|
| `duration-fast` | 150ms | ease-out | Hover states |
| `duration-normal` | 250ms | ease-out | Page transitions |
| `duration-slow` | 350ms | ease-out | Modal animations |

#### Motion Preferences
Respect `prefers-reduced-motion` media query for users who prefer minimal animation.

## Component Inventory

### Atoms (Basic Building Blocks)

#### Button
**Variants**: primary, secondary, outline, ghost, danger
**Sizes**: sm, md, lg
**States**: default, hover, active, disabled, loading

**Usage Guidelines**:
- Primary buttons for main actions
- Limit to one primary button per section
- Use loading state for async operations
- Ensure 44px minimum touch target

#### Input
**Types**: text, email, password, search, number
**Variants**: default, error
**Sizes**: sm, md, lg

**Usage Guidelines**:
- Always include proper labels
- Show validation errors inline
- Support keyboard navigation
- Auto-focus management

#### Icon
**Sizes**: 16px, 20px, 24px, 32px
**Variants**: outlined, filled, custom

**Usage Guidelines**:
- Use consistent iconography (Lucide icons)
- Maintain 4px grid alignment
- Ensure 3:1 contrast ratio

### Molecules (Composite Components)

#### Form Field
Combines: Label + Input + Error Message + Helper Text

**Usage Guidelines**:
- Required field indicators
- Progressive disclosure for complex forms
- Real-time validation feedback
- Accessible error announcements

#### Card
Container with: Header, Content, Actions, optional Media

**Usage Guidelines**:
- Consistent padding and spacing
- Hover states for interactive cards
- Focus management for keyboard users
- Responsive grid layouts

#### Badge
Small status indicators with: Text, Icon, Color variants

**Usage Guidelines**:
- Semantic color coding
- Clear status meanings
- Screen reader support
- Consistent sizing

#### Tooltip
Contextual help with: Trigger, Content, Positioning

**Usage Guidelines**:
- Progressive enhancement
- Keyboard accessible
- Auto-positioning
- Dismissible content

### Organisms (Complex Components)

#### Data Table
Features: Sorting, Filtering, Pagination, Selection, Actions

**Usage Guidelines**:
- Keyboard navigation support
- Screen reader compatibility
- Responsive design (mobile stacks)
- Loading and empty states

#### Navigation Sidebar
Components: Logo, Menu Items, User Profile, Collapsible sections

**Usage Guidelines**:
- Clear hierarchy with icons + labels
- Keyboard shortcuts
- Persistent state management
- Mobile-responsive (drawer pattern)

#### Dashboard Header
Elements: Breadcrumbs, Search, Notifications, User Menu

**Usage Guidelines**:
- Consistent positioning
- Search functionality
- Notification management
- User context awareness

#### Modal/Dialog
Structure: Header, Content, Actions, Backdrop

**Usage Guidelines**:
- Focus trapping
- Escape key handling
- Backdrop click to dismiss
- Responsive sizing
- Accessible labeling

#### Charts and Graphs
Libraries: Recharts integration with custom theming

**Usage Guidelines**:
- Accessible data tables fallback
- High contrast colors
- Responsive scaling
- Loading states

## Accessibility Considerations

### WCAG AA Compliance
- **Color Contrast**: 4.5:1 minimum for text, 3:1 for large text
- **Focus Indicators**: Visible focus rings (2px solid, 2px offset)
- **Color Independence**: No color-only communication
- **Text Alternatives**: Alt text for images, ARIA labels where needed

### Keyboard Navigation
- **Tab Order**: Logical navigation flow
- **Shortcut Keys**: Standard keyboard shortcuts (Ctrl+K for search)
- **Focus Management**: Proper focus trapping in modals
- **Skip Links**: Jump to main content

### Screen Reader Support
- **Semantic HTML**: Proper heading hierarchy, landmarks
- **ARIA Labels**: Enhanced labeling where needed
- **Live Regions**: Dynamic content announcements
- **Form Labels**: Associated labels for all inputs

### Motion and Animation
- **Reduced Motion**: Respects user preferences
- **Essential Animation**: Only functional animations
- **Timing**: Appropriate durations for cognitive processing

## Internationalization (i18n)

### Text Direction Support
- **RTL Languages**: Automatic layout flipping
- **CSS Logical Properties**: margin-inline, padding-block
- **Icon Positioning**: Context-aware icon placement

### Content Adaptation
- **Date Formats**: Localized date/time formatting
- **Number Formatting**: Locale-specific number display
- **Text Expansion**: Accommodate 30%+ text growth

### Component Considerations
- **Button Text**: Allow for longer translated strings
- **Form Layouts**: Flexible for various label lengths
- **Spacing**: Consistent regardless of script

## Implementation Guidelines

### Component API Design
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}
```

### CSS-in-JS Approach
Using styled-components or emotion for theme integration:

```tsx
const StyledButton = styled.button<{ variant: string }>`
  background: ${({ theme, variant }) =>
    theme.colors[variant]?.background || theme.colors.primary.background};
  color: ${({ theme, variant }) =>
    theme.colors[variant]?.text || theme.colors.primary.text};
`;
```

### Responsive Design
- **Mobile-First**: Base styles for mobile, progressive enhancement
- **Breakpoint System**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Fluid Typography**: Clamp() functions for scalable text
- **Touch Targets**: Minimum 44px for interactive elements

This design system provides a solid foundation for building accessible, consistent, and scalable dashboard interfaces. The token-based approach ensures maintainability while the component inventory offers clear guidance for implementation.