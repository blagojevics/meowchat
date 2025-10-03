import React, { createContext, useContext, useState, useEffect } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

const ThemeContext = createContext();

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
};

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0095f6",
      light: "#42a5f5",
      dark: "#0077c2",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#212529",
      light: "#495057",
      dark: "#000000",
      contrastText: "#ffffff",
    },
    background: {
      default: "#fafafa", // Softer off-white instead of pure white
      paper: "#f8f9fa", // Gentle warm white
    },
    text: {
      primary: "#212529",
      secondary: "#6c757d",
    },
    divider: "#e9ecef", // Slightly softer divider
    action: {
      hover: "#f1f3f4", // Mellow hover state
      selected: "#e8f0fe", // Subtle selection color
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#f8f9fa", // Softer header background
          color: "#212529",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.1)",
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#0095f6",
      light: "#42a5f5",
      dark: "#0077c2",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#d4d4d4",
      light: "#ffffff",
      dark: "#b8b8b8",
      contrastText: "#181818",
    },
    background: {
      default: "#181818",
      paper: "#1f1f1f",
    },
    text: {
      primary: "#d4d4d4",
      secondary: "#b8b8b8",
    },
    divider: "#3a3a3a",
    action: {
      hover: "#2a2a2a",
      selected: "#353535",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1f1f1f",
          color: "#d4d4d4",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.5)",
        },
      },
    },
  },
});

export const CustomThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("meowchat-theme");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("meowchat-theme", newMode ? "dark" : "light");
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{ isDarkMode, toggleTheme, theme: isDarkMode ? "dark" : "light" }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
