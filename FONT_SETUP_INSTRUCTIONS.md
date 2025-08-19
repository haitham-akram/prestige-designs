# Custom Font Setup for Prestige Designs

## 📁 Step 1: Place Your Font Files

Put your font files in the `public/fonts/` directory. Supported formats:

- `.woff2` (recommended - best performance)
- `.woff` (fallback)
- `.ttf` (fallback)

Example:

```
public/fonts/
├── my-custom-font.woff2
├── my-custom-font.woff
└── my-custom-font.ttf
```

## 🎨 Step 2: Add Font Declaration to globals.css

Add this at the **TOP** of `src/app/globals.css` (before existing imports):

```css
@font-face {
  font-family: 'MyCustomFont';
  src: url('/fonts/my-custom-font.woff2') format('woff2'), url('/fonts/my-custom-font.woff') format('woff'),
    url('/fonts/my-custom-font.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap; /* Improves loading performance */
}

/* If you have bold/italic variants */
@font-face {
  font-family: 'MyCustomFont';
  src: url('/fonts/my-custom-font-bold.woff2') format('woff2');
  font-weight: bold;
  font-style: normal;
  font-display: swap;
}
```

## 🔧 Step 3: Option A - Use in CSS Classes

Create CSS classes to use your font:

```css
/* Add to globals.css */
.custom-font {
  font-family: 'MyCustomFont', 'Arial', sans-serif;
}

.custom-font-bold {
  font-family: 'MyCustomFont', 'Arial', sans-serif;
  font-weight: bold;
}
```

Then use in your components:

```jsx
<h1 className="custom-font">مرحباً بكم في بريستيج ديزاينز</h1>
<p className="custom-font-bold">النص العريض</p>
```

## 🚀 Step 3: Option B - Use with Next.js localFont (Recommended)

Update `src/app/layout.tsx`:

```tsx
import localFont from 'next/font/local'

const customFont = localFont({
  src: [
    {
      path: '../public/fonts/my-custom-font.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/my-custom-font-bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-custom',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable} ${customFont.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

Then use the CSS variable:

```css
.my-element {
  font-family: var(--font-custom);
}
```

## 🌍 Step 4: Use for Arabic/RTL Text

For Arabic websites, make sure your font supports Arabic characters:

```css
.arabic-text {
  font-family: 'MyCustomFont', 'Amiri', 'Noto Sans Arabic', sans-serif;
  direction: rtl;
  text-align: right;
}
```

## 📱 Step 5: Test Different Sizes

Test your font at different sizes:

```css
.heading-large {
  font-size: 2rem;
}
.heading-medium {
  font-size: 1.5rem;
}
.body-text {
  font-size: 1rem;
}
.small-text {
  font-size: 0.875rem;
}
```

## ⚡ Performance Tips

1. **Use woff2 format** - 30% smaller than woff
2. **Add font-display: swap** - Shows fallback font while loading
3. **Preload important fonts** in `layout.tsx`:

```tsx
export default function RootLayout() {
  return (
    <html>
      <head>
        <link rel="preload" href="/fonts/my-custom-font.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>...</body>
    </html>
  )
}
```

## 🔍 Troubleshooting

**Font not loading?**

- Check file path is correct
- Ensure font files are in `public/fonts/`
- Check browser developer tools for 404 errors
- Verify font formats are supported

**Arabic text issues?**

- Make sure font supports Arabic/RTL
- Add proper fallback fonts
- Test with different Arabic text lengths

## 📁 Your Files Should Look Like:

```
prestige-designs/
├── public/
│   └── fonts/
│       ├── your-font.woff2
│       └── your-font.woff
├── src/
│   └── app/
│       ├── globals.css (updated)
│       └── layout.tsx (optional update)
```

That's it! Your custom font is now ready to use throughout your website. 🎨
