import mongoose from 'mongoose';

const usernameSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 24
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'usernames'
  }
);

usernameSchema.index({ active: 1, label: 1 });

export const Username = mongoose.model('Username', usernameSchema);
