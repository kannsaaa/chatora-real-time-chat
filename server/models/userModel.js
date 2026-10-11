const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    bio: { type: String, trim: true, maxlength: 160, default: "" },
    verified: { type: Boolean, default: false },
    verificationLinkSent: { type: Boolean, default: false },
    avatarLink: { type: String },
  },
  { timestamps: true }
);

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      username: this.username,
    },
    process.env.JWTPRIVATEKEY,
    { expiresIn: "7d" }
  );
  return token;
};

const User = mongoose.models.user || mongoose.model("user", userSchema);
try {
  if (!mongoose.models.User) {
    mongoose.model("User", userSchema);
  }
} catch (_) {}

const validateRegister = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().trim().required().label("First Name"),
    lastName: Joi.string().trim().required().label("Last Name"),
    username: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9_]{3,20}$/)
      .required()
      .messages({
        "string.pattern.base":
          "Username can only contain letters, numbers, and underscores (3-20 characters).",
        "string.min": "Username must be at least 3 characters.",
        "string.max": "Username cannot exceed 20 characters.",
        "any.required": "Username is required.",
      })
      .label("Username"),
    email: Joi.string().email().trim().lowercase().required().label("Email"),
    password: passwordComplexity().required().label("Password"),
    bio: Joi.string().trim().max(160).allow("").optional().label("Bio"),
  });
  return schema.validate(data);
};

const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().trim().lowercase().required().label("Email"),
    password: Joi.string().required().label("Password"),
  });
  return schema.validate(data);
};

module.exports = { User, validateRegister, validateLogin };

