/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
            colors: {
                brand: {
                    400: 'rgb(var(--brand-400) / <alpha-value>)',
                    500: 'rgb(var(--brand-500) / <alpha-value>)',
                },
                app: {
                    surface: 'var(--app-surface)',
                    border: 'var(--app-border)',
                    text: 'var(--app-text)',
                    'text-muted': 'var(--app-text-muted)',
                    'text-faint': 'var(--app-text-faint)',
                }
            },
        },
    },
    plugins: [],
}
