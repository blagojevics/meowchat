import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  firebaseLogin: (firebaseToken) =>
    api.post("/auth/firebase-login", { firebaseToken }),
};

// Chat API methods
export const chatAPI = {
  getChats: () => api.get("/chats"),
  createChat: (chatData) => api.post("/chats", chatData),
  getChat: (chatId) => api.get(`/chats/${chatId}`),
  updateChat: (chatId, updateData) => api.put(`/chats/${chatId}`, updateData),
  addParticipants: (chatId, participants) =>
    api.post(`/chats/${chatId}/participants`, { participants }),
  removeParticipant: (chatId, userId) =>
    api.delete(`/chats/${chatId}/participants/${userId}`),
};

// Message API methods
export const messageAPI = {
  getMessages: (chatId, page = 1, limit = 50) =>
    api.get(`/messages/${chatId}?page=${page}&limit=${limit}`),
  sendMessage: (chatId, messageData) =>
    api.post(`/messages/${chatId}`, messageData),
  editMessage: (messageId, content) =>
    api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  addReaction: (messageId, emoji) =>
    api.post(`/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (messageId) => api.delete(`/messages/${messageId}/reactions`),
};

// User API methods (for future extensions)
export const userAPI = {
  searchUsers: (query) => api.get(`/users/search?q=${query}`),
  getUserProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (userData) => api.put("/users/profile", userData),
};

export default api;
