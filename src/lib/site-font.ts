import localFont from 'next/font/local'

/** Fonte única do site — Exo 2 (ficheiro local em src/fonts, sem qualquer dependência da Google). */
export const siteFont = localFont({
  src: [
    { path: '../fonts/exo2-variable.woff2', weight: '100 900', style: 'normal' },
    { path: '../fonts/exo2-variable-italic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-exo2',
  display: 'swap',
})

export const siteFontFamily = "'Exo 2', sans-serif"
