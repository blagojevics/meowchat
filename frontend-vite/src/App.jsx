import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Box } from "@mui/material";
import { useAuth } from "./contexts/AuthContext";
import { CustomThemeProvider } from "./contexts/ThemeContext";

// Import components
import Login from "./components/Login";
import ChatApp from "./components/ChatApp";

function App() {
  const { user, loading, loginWithToken } = useAuth();

  useEffect(() => {
    const handleAuthMessage = (event) => {
      // SECURITY: Crucial to verify the message is from a trusted source
      if (event.origin !== "https://meowgram.online") {
        console.warn("Message received from untrusted origin:", event.origin);
        return;
      }

      // Check if the message contains the auth token
      const { type, token } = event.data;
      if (type === "AUTH_TOKEN" && token) {
        // Use the token to authenticate the user in this app
        loginWithToken(token);
      }
    };

    // Set up the listener
    window.addEventListener("message", handleAuthMessage);

    // Clean up the listener when the app closes to prevent memory leaks
    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, [loginWithToken]); // The dependency array ensures this setup runs only once

  if (loading) {
    return (
      <CustomThemeProvider>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          Loading...
        </Box>
      </CustomThemeProvider>
    );
  }

  return (
    <CustomThemeProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Box
          className="App"
          sx={{
            height: "100vh",
            bgcolor: "background.default",
            overflow: "hidden",
          }}
        >
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" /> : <Login />}
            />
            <Route
              path="/"
              element={user ? <ChatApp /> : <Navigate to="/login" />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Box>
      </Router>
    </CustomThemeProvider>
  );
}

export default App;
