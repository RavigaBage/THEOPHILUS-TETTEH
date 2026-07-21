const mongoose = require("mongoose");

const EVENT_TYPES = [
  "Workshop",
  "Seminar",
  "Training Session",
  "Conference",
  "Corporate Meeting",
  "Product Launch",
  "Networking Event",
  "Community Outreach",
  "Religious Gathering",
  "Examination/Assessment",
  "Other"
];

const CATEGORIES = [
  "Educational",
  "Corporate/Business",
  "Government",
  "NGO/Non-Profit",
  "Religious",
  "Social/Community",
  "Health & Wellness",
  "Technology/ICT",
  "Agriculture",
  "Other"
];

const BENEFICIARIES = [
  "Students",
  "Youth",
  "Women",
  "Persons with Disabilities (PWDs)",
  "General Public",
  "Corporate Employees",
  "Government Officials",
  "Farmers",
  "Entrepreneurs/SMEs",
  "Community Members",
  "Children",
  "Other"
];

const ROOMS = [
  "Seminar Room 1",
  "Seminar Room 2",
  "Seminar Room 3",
  "Seminar Room 4",
  "Conference Room",
  "Training Lab"
];

const BOOKING_STATUS = [
  "Booked",
  "Occupied",
  "Completed",
  "Cancelled"
];

const PAYMENT_STATUS = [
  "Unpaid",
  "Paid",
  "Partially Paid"
];

const EventProgramSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    room: {
      type: String,
      enum: ROOMS,
      required: true,
    },
    rate: { type: Number, required: true },
    organizer: {
      type: String,
      required: true,
      trim: true,
    },
    presenter: {
      type: String,
      required: true,
      trim: true,
    },
    programName: {
      type: String,
      required: true,
      trim: true,
    },
    participants: {
      type: Number,
      required: true,
      min: 1,
    },
    eventType: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    beneficiaries: {
      type: [String],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      default: "Unpaid",
    },
    amountDue: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: BOOKING_STATUS,
      default: "Booked",
    },
    createdBy: {
      type: String,
      default: "admin",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.EventProgram || mongoose.model('EventProgram', EventProgramSchema);
