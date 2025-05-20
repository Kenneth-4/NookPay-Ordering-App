import React, { createContext, useContext, ReactNode } from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { Colors, Fonts } from '../constants/theme';

// Create a custom theme based on our existing colors and fonts
const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    error: Colors.error,
    background: Colors.background,
    surface: Colors.white,
    onSurface: Colors.text.primary,
    onSurfaceVariant: Colors.text.secondary,
    surfaceVariant: Colors.lightGray,
    outline: Colors.gray,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    regular: {
      fontFamily: Fonts.primary,
      fontWeight: Fonts.weights.regular,
    },
    medium: {
      fontFamily: Fonts.primary,
      fontWeight: Fonts.weights.medium,
    },
    light: {
      fontFamily: Fonts.primary,
      fontWeight: Fonts.weights.light,
    },
    thin: {
      fontFamily: Fonts.primary,
      fontWeight: Fonts.weights.light,
    },
  },
};

interface ThemeContextType {
  theme: typeof paperTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <ThemeContext.Provider value={{ theme: paperTheme }}>
      <PaperProvider theme={paperTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};