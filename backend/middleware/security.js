const validator = require("validator");
const xss = require("xss");

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize all string inputs in body
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === "object") {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    console.error("Input sanitization error:", error);
    res.status(400).json({ error: "Invalid input format" });
  }
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      // Remove XSS attempts and trim whitespace
      sanitized[key] = xss(value.trim());
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      // Sanitize arrays
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? xss(item.trim())
          : typeof item === "object" && item !== null
          ? sanitizeObject(item)
          : item
      );
    } else {
      // Keep non-string values as is
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Validate email format
const validateEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return validator.isEmail(email) && email.length <= 254;
};

// Validate username format
const validateUsername = (username) => {
  if (!username || typeof username !== "string") return false;
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
};

// Validate password strength
const validatePassword = (password) => {
  if (!password || typeof password !== "string") return false;
  return password.length >= 8 && password.length <= 128;
};

// Validate message content
const validateMessage = (content) => {
  if (!content || typeof content !== "string") return false;
  return content.trim().length > 0 && content.length <= 2000;
};

// Validate chat name
const validateChatName = (name) => {
  if (!name || typeof name !== "string") return false;
  return name.trim().length >= 1 && name.length <= 100;
};

// Validation middleware for user registration
const validateRegistration = (req, res, next) => {
  const { username, email, password } = req.body;

  const errors = [];

  if (!validateUsername(username)) {
    errors.push(
      "Username must be 3-30 characters long and contain only letters, numbers, and underscores"
    );
  }

  if (!validateEmail(email)) {
    errors.push("Please provide a valid email address");
  }

  if (!validatePassword(password)) {
    errors.push("Password must be at least 8 characters long");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Validation middleware for user login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!validateEmail(email)) {
    errors.push("Please provide a valid email address");
  }

  if (!password || typeof password !== "string" || password.length === 0) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Validation middleware for chat creation
const validateChatCreation = (req, res, next) => {
  const { name, participants } = req.body;

  const errors = [];

  if (!validateChatName(name)) {
    errors.push("Chat name must be 1-100 characters long");
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    errors.push("At least one participant is required");
  }

  if (participants && participants.length > 50) {
    errors.push("Maximum 50 participants allowed per chat");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Validation middleware for message sending
const validateMessageSending = (req, res, next) => {
  const { content } = req.body;

  if (!validateMessage(content)) {
    return res.status(400).json({
      error: "Message content must be 1-2000 characters long",
    });
  }

  next();
};

module.exports = {
  sanitizeInput,
  validateRegistration,
  validateLogin,
  validateChatCreation,
  validateMessageSending,
  validateEmail,
  validateUsername,
  validatePassword,
  validateMessage,
  validateChatName,
};
