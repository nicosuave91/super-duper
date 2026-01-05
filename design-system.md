# UI Design System – Implementation Rules

## Source of truth
- Engineering tokens: `packages/config/tokens/colors.json`
- Runtime variables: `packages/config/tokens/colors.css`
- Tailwind mapping: `packages/config/tailwind/preset.cjs`

## Non-negotiable rules
1. **No raw hex** in app code (`apps/**`)
   - Only allowed in `packages/config/tokens/**`
2. **No new Tailwind grays** in app code
   - Avoid `text-gray-*`, `bg-gray-*`, `border-gray-*`
3. **Only one primary CTA per view/step**
4. **Destructive actions must use danger styling and confirmation**
5. **Status badges use soft backgrounds by default**

## Token utility mapping (examples)
- Primary CTA:
  - `bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-pressed`
- Surfaces:
  - `bg-surface`, `bg-surface-alt`
- Text:
  - `text-text-strong`, `text-text-default`, `text-text-muted`
- Borders:
  - `border-border-subtle`
- Semantic:
  - `text-success bg-success-bg`
  - `text-warning bg-warning-bg`
  - `text-danger bg-danger-bg`
  - `text-info bg-info-bg`

## Migration order (stable rollout)
1. App shell/layout
2. Navigation + header
3. Primary buttons + links
4. Status badges/callouts
5. Tables/forms

## Local audit
- `pnpm lint:colors` (find raw hex in apps)
- `pnpm lint:grays` (find Tailwind gray usage in apps)
