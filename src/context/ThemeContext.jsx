import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
    CUTE: 'cute',
    SUMMER: 'summer'
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(THEMES.CUTE);

    const toggleTheme = () => {
        setTheme(prev => prev === THEMES.CUTE ? THEMES.SUMMER : THEMES.CUTE);
    };

    useEffect(() => {
        const root = document.documentElement;
        if (theme === THEMES.SUMMER) {
            document.body.classList.add('theme-summer');
        } else {
            document.body.classList.remove('theme-summer');
        }
    }, [theme]);

    const value = {
        theme,
        toggleTheme,
        isCute: theme === THEMES.CUTE,
        isSummer: theme === THEMES.SUMMER
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
