const mongoose = require('mongoose');

const EventProgramSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      default: 'Seminar Room',
    },
    eventTitle: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      default: '',
    },
    timeSlot: {
      type: String,
      default: '',
    },
    createdBy: {
      type: String,
      default: 'Staff',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventProgram', EventProgramSchema, 'event_programs');
