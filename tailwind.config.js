/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep ocean palette
        abyss:    { DEFAULT: '#020b18', 50: '#0a1f35' },
        deep:     { DEFAULT: '#041529', 100: '#071e38', 200: '#0a2847' },
        current:  { DEFAULT: '#0d3d6b', light: '#1a5490' },
        tide:     { DEFAULT: '#0e7490', light: '#0ea5c9' },
        biolume:  { DEFAULT: '#00e5ff', dim: '#00b8d9', glow: '#7fffff' },
        kelp:     { DEFAULT: '#22c55e', dim: '#16a34a' },
        coral:    { DEFAULT: '#f97316', dim: '#ea580c' },
        pearl:    { DEFAULT: '#f0f9ff', dim: '#bae6fd' },
        sand:     { DEFAULT: '#fef3c7', dim: '#fde68a' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'ocean-mesh': `
          radial-gradient(ellipse at 20% 50%, rgba(0, 229, 255, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(14, 116, 144, 0.12) 0%, transparent 40%),
          radial-gradient(ellipse at 60% 80%, rgba(13, 61, 107, 0.2) 0%, transparent 50%)
        `,
        'hero-gradient': 'linear-gradient(180deg, #020b18 0%, #041529 40%, #07213e 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(10,40,71,0.9) 0%, rgba(4,21,41,0.95) 100%)',
        'biolume-glow': 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 9s ease-in-out 1s infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'bubble': 'bubble 8s ease-in infinite',
        'bubble-2': 'bubble 12s ease-in 2s infinite',
        'bubble-3': 'bubble 10s ease-in 5s infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'scan-line': 'scanLine 4s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        bubble: {
          '0%': { transform: 'translateY(100vh) scale(0)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.3' },
          '100%': { transform: 'translateY(-100px) scale(1.2)', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,229,255,0.3), 0 0 60px rgba(0,229,255,0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(0,229,255,0.6), 0 0 100px rgba(0,229,255,0.2)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      boxShadow: {
        'biolume': '0 0 30px rgba(0, 229, 255, 0.3), 0 0 80px rgba(0, 229, 255, 0.1)',
        'biolume-sm': '0 0 15px rgba(0, 229, 255, 0.25)',
        'card': '0 4px 40px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255,255,255,0.05) inset',
        'coral': '0 0 30px rgba(249, 115, 22, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
