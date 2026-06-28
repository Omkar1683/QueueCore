'use strict';

const Joi = require('joi');
const ApiError = require('../utils/ApiError');

// ---------------------------------------------------------------------------
// Validation middleware factory
// ---------------------------------------------------------------------------

/**
 * Returns an Express middleware that validates req[property] against the
 * provided Joi schema.  On failure it throws ApiError.unprocessable so the
 * global error handler can return a well-shaped 422 response.
 *
 * @param {Joi.Schema} schema   - Joi schema to validate against
 * @param {string}     property - request property to validate ('body' | 'query' | 'params')
 * @returns {Function} Express middleware
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,        // collect ALL errors, not just the first
      allowUnknown: false,      // reject unknown keys
      stripUnknown: true,       // strip unknown keys after validation
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));

      return next(
        ApiError.unprocessable('Validation failed', details)
      );
    }

    // Replace req[property] with the sanitized/stripped value from Joi
    req[property] = value;
    return next();
  };
};

// ---------------------------------------------------------------------------
// Joi Schemas
// ---------------------------------------------------------------------------

const createJobSchema = Joi.object({
  jobType: Joi.string().trim().required().messages({
    'any.required': 'jobType is required',
    'string.base': 'jobType must be a string',
  }),

  payload: Joi.object().optional().default({}),

  priority: Joi.string()
    .valid('critical', 'high', 'medium', 'low')
    .optional()
    .default('medium'),

  delay: Joi.number().min(0).optional().default(0).messages({
    'number.min': 'delay must be >= 0',
  }),

  scheduledAt: Joi.date().iso().optional().allow(null),

  maxAttempts: Joi.number().integer().min(1).max(10).optional().default(3).messages({
    'number.min': 'maxAttempts must be at least 1',
    'number.max': 'maxAttempts cannot exceed 10',
  }),

  cronExpression: Joi.string().trim().optional().allow('', null),

  webhookUrl: Joi.string().uri().optional().allow('', null).messages({
    'string.uri': 'webhookUrl must be a valid URI',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'email must be a valid email address',
    'any.required': 'email is required',
  }),

  password: Joi.string().min(6).required().messages({
    'string.min': 'password must be at least 6 characters',
    'any.required': 'password is required',
  }),
});

const registerSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'name is required',
    'string.base': 'name must be a string',
  }),

  email: Joi.string().email().required().messages({
    'string.email': 'email must be a valid email address',
    'any.required': 'email is required',
  }),

  password: Joi.string().min(6).required().messages({
    'string.min': 'password must be at least 6 characters',
    'any.required': 'password is required',
  }),

  role: Joi.string().valid('admin', 'viewer').optional().default('viewer'),
});

module.exports = {
  validate,
  createJobSchema,
  loginSchema,
  registerSchema,
};
