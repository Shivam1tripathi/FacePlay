import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 18
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 18
    },
    passwordHash: {
      type: String,
      required: true
    },
    passwordSalt: {
      type: String,
      required: true
    },
    highScore: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ highScore: -1, updatedAt: 1 });

export const User = mongoose.model('User', userSchema);
