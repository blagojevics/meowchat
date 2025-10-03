import React from "react";
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
  const { user, loading } = useAuth();

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
          sx={{ height: "100vh", bgcolor: "background.default" }}
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
