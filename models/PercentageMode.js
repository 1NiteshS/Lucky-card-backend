//New

import mongoose from 'mongoose';

const percentageModeSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['automatic', 'manual'],
    default: 'automatic'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('PercentageMode', percentageModeSchema);