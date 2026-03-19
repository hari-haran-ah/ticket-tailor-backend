import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ collapsed = false }) {
    const { theme, resolvedTheme, toggleTheme } = useTheme()

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return <Sun className="w-5 h-5" />
            case 'dark':
                return <Moon className="w-5 h-5" />
            case 'system':
                return <Monitor className="w-5 h-5" />
            default:
                return <Moon className="w-5 h-5" />
        }
    }

    const getLabel = () => {
        switch (theme) {
            case 'light':
                return 'Light'
            case 'dark':
                return 'Dark'
            case 'system':
                return 'System'
            default:
                return 'Dark'
        }
    }

    const getButtonStyle = () => {
        // Use light theme button style when in light mode
        if (resolvedTheme === 'light') {
            return {
                background: '#ffffff',
                color: '#000000',
                border: '1px solid #e5e5e5',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }
        }
        // Default to dark theme button style
        return {
            background: '#212121',
            color: '#ffffff',
            border: '1px solid #2f2f2f',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }
    }

    const getHoverStyle = () => {
        if (resolvedTheme === 'light') {
            return {
                background: '#f5f5f5',
                borderColor: '#d4d4d4'
            }
        }
        return {
            background: '#2f2f2f',
            borderColor: '#424242'
        }
    }

    return (
        <button
            onClick={toggleTheme}
            className={`flex items-center justify-center transition-all duration-300 backdrop-blur-sm ${collapsed ? 'p-2 rounded-xl w-10 h-10 mx-auto' : 'gap-2 px-3 py-2 rounded-lg w-full'
                }`}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
                const hoverStyle = getHoverStyle()
                e.currentTarget.style.background = hoverStyle.background
                e.currentTarget.style.borderColor = hoverStyle.borderColor
            }}
            onMouseLeave={(e) => {
                const originalStyle = getButtonStyle()
                e.currentTarget.style.background = originalStyle.background
                e.currentTarget.style.borderColor = originalStyle.border.split(' ')[2] // Extract border color
            }}
            aria-label="Toggle theme"
            title={`Current theme: ${getLabel()}`}
        >
            {getIcon()}
            {!collapsed && <span className="text-sm font-medium">{getLabel()}</span>}
        </button>
    )
}
