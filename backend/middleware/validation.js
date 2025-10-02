const { body, validationResult } = require('express-validator');

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const messageValidation = [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message content cannot exceed 1000 characters'),
  
  body('type')
    .optional()
    .isIn(['text', 'image', 'file', 'emoji'])
    .withMessage('Invalid message type')
];

const chatValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Chat name cannot exceed 50 characters'),
  
  body('type')
    .isIn(['private', 'group'])
    .withMessage('Chat type must be either private or group'),
  
  body('participants')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array()
    });
  }
  
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  messageValidation,
  chatValidation,
  handleValidationErrors
};