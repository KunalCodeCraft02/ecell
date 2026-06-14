const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  eventId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, trim: true, lowercase: true },
  phone:            { type: String, required: true, trim: true },
  college:          { type: String, trim: true, default: '' },
  branch:           { type: String, trim: true, default: '' },
  year:             { type: String, trim: true, default: '' },
  prn:              { type: String, trim: true, default: '' },
  department:       { type: String, trim: true, default: '' },
  paymentId:        { type: String, default: null },
  orderId:          { type: String, default: null },
  amount:           { type: Number, default: 0 },
  paymentStatus:    { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  registrationTime: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);