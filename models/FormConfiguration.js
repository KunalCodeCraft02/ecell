const mongoose = require('mongoose');

const formConfigSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
  fields:  {
    type:    [String],
    // Allowed field keys
    enum:    ['name', 'email', 'phone', 'college', 'branch', 'year', 'prn', 'department'],
    default: ['name', 'email', 'phone'],
  },
}, { timestamps: true });

module.exports = mongoose.model('FormConfiguration', formConfigSchema);