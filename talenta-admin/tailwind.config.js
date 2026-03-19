/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                premium: {
                    // Backgrounds
                    'bg-start': '#212121',
                    'bg-end': '#212121',
                    'bg-alt': '#171717',
                    // Surfaces
                    'surface': '#212121',
                    'surface-light': '#2f2f2f',
                    // Borders
                    'border': '#2f2f2f',
                    'border-light': '#2f2f2f',
                    // Text
                    'text-primary': '#ececec',
                    'text-secondary': '#b4b4b4',
                    'text-muted': '#888888',
                },
                light: {
                    'surface': '#ffffff',
                    'surface-alt': '#f3f4f6',
                }
            },
            backgroundImage: {
                'premium-dark': 'linear-gradient(180deg, #212121 0%, #212121 100%)',
                'premium-surface': 'linear-gradient(180deg, #212121 0%, #212121 100%)',
            },
            boxShadow: {
                'premium': '0 2px 8px rgba(0,0,0,0.4)',
                'premium-card': '0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
                'premium-button': '0 2px 6px rgba(0,0,0,0.3)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
