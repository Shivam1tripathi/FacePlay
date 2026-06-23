import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 18
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 18
    },
    highScore: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    collection: 'accounts'
  }
);

accountSchema.index({ highScore: -1, updatedAt: 1 });

export const Account = mongoose.model('Account', accountSchema);
