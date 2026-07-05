# 📖 Design System Implementation Guide

## Fase 1: Setup (Esta rama)

### Archivos Creados

```
design-system/
├── tokens/
│   ├── colors.json
│   ├── typography.json
│   ├── spacing.json
│   ├── shadows.json
│   ├── radius.json
│   └── index.json
│
├── components/
│   ├── BUTTONS.md
│   ├── CARDS.md
│   ├── INPUTS.md (próximo)
│   ├── BADGES.md (próximo)
│   └── HEADERS.md (próximo)
│
└── IMPLEMENTATION_GUIDE.md
```

## Integración Frontend (V/)

### Step 1: CSS Variables Setup

Crear `V/src/styles/design-system.css`:

```css
/* ======================
   COLOR TOKENS
   ====================== */
:root {
  /* Primary */
  --color-primary-50: #F0F5F3;
  --color-primary-600: #0E3B2E;
  --color-primary-700: #0A2D23;
  --color-primary-800: #061F18;
  
  /* Accent */
  --color-accent-500: #F9A825;
  --color-accent-600: #E8941B;
  
  /* Teal */
  --color-teal-500: #00B4D8;
  --color-teal-600: #0099BE;
  
  /* Semantic */
  --color-success: #2ECC71;
  --color-warning: #F39C12;
  --color-error: #E74C3C;
  
  /* Neutral */
  --color-neutral-50: #F8F9FA;
  --color-neutral-200: #E8EBEF;
  --color-neutral-400: #B0B8C1;
  --color-neutral-900: #1A1A1A;
  
  /* ======================
     TYPOGRAPHY
     ====================== */
  --font-family-primary: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-secondary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* ======================
     SPACING (8px base)
     ====================== */
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  
  /* ======================
     RADIUS
     ====================== */
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* ======================
     SHADOWS
     ====================== */
  --shadow-md: 0px 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0px 4px 16px rgba(0, 0, 0, 0.12);
}
```

### Step 2: Base Styles

Crear `V/src/styles/base.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: var(--font-family-secondary);
  font-size: var(--font-size-lg);
  line-height: 1.6;
  color: var(--color-neutral-900);
  background: var(--color-neutral-50);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-family-primary);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

h1 { font-size: 48px; }
h2 { font-size: 40px; }
h3 { font-size: 32px; }
h4 { font-size: 24px; }

button, input, textarea, select {
  font-family: inherit;
  font-size: inherit;
}
```

### Step 3: Component Library

Crear `V/src/components/Button.jsx`:

```jsx
export function Button({ 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  className = '',
  children,
  ...props 
}) {
  const baseClasses = 'btn btn--' + variant + ' btn--' + size;
  const allClasses = `${baseClasses} ${className}`;
  
  return (
    <button 
      className={allClasses} 
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}
```

Con estilos en `V/src/styles/components/button.css`:

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all 200ms ease;
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.btn:focus-visible {
  outline-color: var(--color-teal-500);
}

.btn--primary {
  background-color: var(--color-primary-600);
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-700);
  box-shadow: var(--shadow-lg);
}

.btn--primary:disabled {
  background-color: var(--color-neutral-200);
  color: var(--color-neutral-400);
  cursor: not-allowed;
  opacity: 0.6;
}

.btn--md {
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--font-size-lg);
}

.btn--lg {
  padding: var(--spacing-4) var(--spacing-6);
  font-size: var(--font-size-xl);
}
```

## Próximos Pasos

### Fase 2 (Próxima rama)

1. **Componentes React**
   - Input
   - Select
   - Card
   - Badge
   - Header
   - Navigation

2. **Layouts**
   - Dashboard
   - Trip Detail
   - Forms
   - Tables

3. **Validación Visual**
   - Responsive testing
   - Accessibility check
   - Cross-browser testing

### Estructura de Carpetas Recomendada

```
V/src/
├── components/
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Input.jsx
│   ├── Select.jsx
│   ├── Badge.jsx
│   ├── Header.jsx
│   └── index.js (barrel export)
│
├── styles/
│   ├── design-system.css      # Tokens
│   ├── base.css                # Reset + typography
│   ├── components/
│   │   ├── button.css
│   │   ├── card.css
│   │   ├── input.css
│   │   └── index.css
│   └── index.css
│
├── layouts/
│   ├── Dashboard.jsx
│   ├── TripsLayout.jsx
│   └── FormLayout.jsx
│
└── pages/
    ├── LoginPage.jsx
    ├── DashboardPage.jsx
    ├── TripsPage.jsx
    └── TripDetailPage.jsx
```

## Validación Checklist

- [ ] Tokens JSON bien formados
- [ ] CSS Variables correctas
- [ ] Componentes renderean sin errores
- [ ] Responsive en mobile/tablet/desktop
- [ ] Accesibilidad básica (focus, contrast)
- [ ] Sin conflictos de importaciones
- [ ] Build correcto
- [ ] Documentación clara

## Referencias

- [Design System Structure](https://www.designsystems.com/)
- [CSS Variables Best Practices](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Component Library Patterns](https://www.storybook.js.org/)

---

**Status:** Ready for Fase 2  
**Última actualización:** 2026-07-05
