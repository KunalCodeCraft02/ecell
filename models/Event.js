const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:           { type: String, required: true, trim: true },
  description:     { type: String, required: true },
  eventDate:       { type: Date, required: true },   // stored as Date object
  time:            { type: String, default: '' },
  venue:           { type: String, default: '' },
  fee:             { type: Number, default: 0 },
  maxParticipants: { type: Number, default: 0 },
  image:           { type: String, default: null },  // path like /uploads/event-xxx.jpg
  status: {
    type:    String,
    enum:    ['draft', 'upcoming', 'live', 'completed'],
    default: 'draft',
  },
  eventPublished: { type: Boolean, default: false },
  formPublished:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);