const Joi = require("joi");

const SongPayloadSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  year: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear())
    .required(),
  genre: Joi.string().trim().required(),
  performer: Joi.string().trim().required(),
  duration: Joi.number().integer().positive().allow(null).optional(),
  albumId: Joi.string().allow(null).optional(),
});

module.exports = { SongPayloadSchema };
