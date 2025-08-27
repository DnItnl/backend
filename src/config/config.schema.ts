import Joi from 'joi';

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  // Google OAuth (пока опциональные)
  // GOOGLE_CLIENT_ID: Joi.string().optional(),
  // GOOGLE_CLIENT_SECRET: Joi.string().optional(),
});
