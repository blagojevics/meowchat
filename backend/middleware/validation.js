const { body, validationResult } = require("express-validator");

// Validation rules for login only (no registration allowed)
const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];

const messageValidation = [
  body("content")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Message content cannot exceed 1000 characters"),

  body("type")
    .optional()
    .isIn(["text", "image", "file", "emoji"])
    .withMessage("Invalid message type"),
];

const chatValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Chat name cannot exceed 50 characters"),

  body("type")
    .isIn(["private", "group"])
    .withMessage("Chat type must be either private or group"),

  body("participants")
    .isArray({ min: 1 })
    .withMessage("At least one participant is required"),
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation error",
      errors: errors.array(),
    });
  }

  next();
};

module.exports = {
  loginValidation,
  messageValidation,
  chatValidation,
  handleValidationErrors,
};
