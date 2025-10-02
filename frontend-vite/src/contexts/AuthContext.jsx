import React, { createContext, useContext, useReducer, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../config/firebase";
import api from "../services/api";

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, loading: true, error: null };
    case "AUTH_SUCCESS":
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case "AUTH_ERROR":
      return {
        ...state,
        loading: false,
        error: action.payload,
        user: null,
        token: null,
      };
    case "LOGOUT":
      return { ...state, user: null, token: null, loading: false, error: null };
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: localStorage.getItem("token"),
  loading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize Google Auth Provider
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope("email");
  googleProvider.addScope("profile");

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const response = await api.get("/auth/me");
          dispatch({
            type: "AUTH_SUCCESS",
            payload: {
              user: response.data.user,
              token: token,
            },
          });
        } catch (error) {
          localStorage.removeItem("token");
          delete api.defaults.headers.common["Authorization"];
          dispatch({ type: "AUTH_ERROR", payload: "Token invalid" });
        }
      } else {
        dispatch({ type: "AUTH_ERROR", payload: null });
      }
    };

    checkAuth();
  }, []);

  const loginWithGoogle = async () => {
    try {
      console.log("🔄 Starting Google login...");
      dispatch({ type: "AUTH_START" });

      // Sign in with Google popup
      const result = await signInWithPopup(auth, googleProvider);
      console.log("✅ Google sign-in successful:", result.user.email);

      const firebaseToken = await result.user.getIdToken();
      console.log("🔑 Firebase token obtained, sending to backend...");

      // Send Firebase token to backend
      const response = await api.post("/auth/firebase-login", {
        firebaseToken,
      });
      console.log("✅ Backend login successful:", response.data);

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      return { success: true };
    } catch (error) {
      console.error("❌ Google login error:", error);
      let message = "Google login failed";

      if (error.code === "auth/popup-closed-by-user") {
        message = "Login cancelled by user";
      } else if (error.code === "auth/popup-blocked") {
        message = "Popup blocked. Please allow popups and try again.";
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }

      dispatch({ type: "AUTH_ERROR", payload: message });
      return { success: false, error: message };
    }
  };

  const loginWithFirebase = async (email, password) => {
    try {
      dispatch({ type: "AUTH_START" });

      // Sign in with Firebase
      const firebaseResult = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseToken = await firebaseResult.user.getIdToken();

      // Send Firebase token to backend
      const response = await api.post("/auth/firebase-login", {
        firebaseToken,
      });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Firebase login failed";
      dispatch({ type: "AUTH_ERROR", payload: message });
      return { success: false, error: message };
    }
  };

  const login = async (email, password, useFirebase = false) => {
    if (useFirebase) {
      return await loginWithFirebase(email, password);
    }

    try {
      dispatch({ type: "AUTH_START" });

      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      dispatch({ type: "AUTH_ERROR", payload: message });
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: "AUTH_START" });

      const response = await api.post("/auth/register", userData);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed";
      dispatch({ type: "AUTH_ERROR", payload: message });
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Sign out from Firebase if user was logged in with Firebase
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (error) {
      console.error("Firebase logout error:", error);
    }

    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    dispatch({ type: "LOGOUT" });
  };

  const updateUser = (userData) => {
    dispatch({ type: "UPDATE_USER", payload: userData });
  };

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    login,
    loginWithFirebase,
    loginWithGoogle,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
