/**
 * Data model — mirrors the ISIP class diagram (Experiment 5):
 * User, Role, Startup, StartupMember, Mentor, MentorAssignment, Milestone, MilestoneUpdate,
 * Meeting, MeetingRequest, Document, Workshop, WorkshopRegistration,
 * Notification, Feedback — plus Report and AuditLog from the SRS database list / NFRs,
 * and the Investor module (Investor, InvestmentInterest, InvestorMeeting).
 * Funding happens only between founders and investors (InvestmentInterest); the Incubation Cell
 * reviews each accepted deal and can clear it, put it on hold or cancel it.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const { STRING, TEXT, INTEGER, FLOAT, DECIMAL, BOOLEAN, DATE, DATEONLY } = DataTypes;
const oneOf = (...values) => ({ type: STRING(30), allowNull: false, defaultValue: values[0], validate: { isIn: [values] } });

export const STARTUP_STATUSES = ['draft', 'pending', 'approved', 'incubated', 'rejected'];
export const DEFAULT_MILESTONES = [
  { name: 'Idea Validation', description: 'Validate the problem and solution with potential users.' },
  { name: 'Prototype', description: 'Build a working prototype demonstrating the core idea.' },
  { name: 'MVP', description: 'Launch a minimum viable product with essential features.' },
  { name: 'Customer Testing', description: 'Test the MVP with real customers and collect feedback.' },
  { name: 'Revenue', description: 'Generate first revenue from paying customers.' },
  { name: 'Funding', description: 'Secure external funding or investment.' },
];

export const Role = sequelize.define('Role', {
  roleName: { type: STRING(30), allowNull: false, unique: true },
  description: STRING,
});

export const User = sequelize.define('User', {
  name: { type: STRING(100), allowNull: false },
  email: { type: STRING(150), allowNull: false, unique: true, validate: { isEmail: { msg: 'Please enter a valid email address' } } },
  password: { type: STRING, allowNull: false },
  phone: {
    type: STRING(512),
    get() { return decrypt(this.getDataValue('phone')); },
    set(v) { this.setDataValue('phone', encrypt(v)); },
  },
  status: oneOf('pending', 'active', 'inactive'),
  emailVerified: { type: BOOLEAN, defaultValue: false },
  verifyToken: STRING,
  resetToken: STRING,
  resetTokenExpires: DATE,
  // Public profile
  headline: STRING(160),
  about: TEXT,
  skills: STRING(400), // comma-separated
  linkedin: STRING(200),
  website: STRING(200),
});

/** Profile columns added after the first release — created on existing databases at startup. */
export const USER_PROFILE_COLUMNS = ['headline', 'about', 'skills', 'linkedin', 'website'];
User.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  delete values.password;
  delete values.verifyToken;
  delete values.resetToken;
  delete values.resetTokenExpires;
  return values;
};

export const Startup = sequelize.define('Startup', {
  startupName: { type: STRING(150), allowNull: false },
  industry: { type: STRING(80), allowNull: false },
  description: TEXT,
  problemStatement: TEXT,
  solution: TEXT,
  businessModel: TEXT,
  technologyStack: STRING(300),
  status: oneOf(...STARTUP_STATUSES),
  adminRemarks: TEXT,
  progress: { type: INTEGER, defaultValue: 0 },
  rating: { type: FLOAT, defaultValue: 0 },
  submittedAt: DATE,
});

export const StartupMember = sequelize.define('StartupMember', {
  name: { type: STRING(100), allowNull: false },
  email: { type: STRING(150), validate: { isEmail: { msg: 'Please enter a valid team member email' } } },
  role: STRING(80),
});

export const Mentor = sequelize.define('Mentor', {
  expertise: STRING(200),
  bio: TEXT,
  availability: STRING(120),
  rating: { type: FLOAT, defaultValue: 0 },
});

export const MentorAssignment = sequelize.define('MentorAssignment', {
  assignedDate: { type: DATE, defaultValue: DataTypes.NOW },
  status: oneOf('assigned', 'accepted', 'removed'),
});

export const Milestone = sequelize.define('Milestone', {
  name: { type: STRING(120), allowNull: false },
  description: TEXT,
  status: oneOf('pending', 'in_progress', 'submitted', 'completed'),
  dueDate: DATEONLY,
  order: { type: INTEGER, defaultValue: 0 },
  completedAt: DATE,
});

export const MilestoneUpdate = sequelize.define('MilestoneUpdate', {
  status: oneOf('submitted', 'approved', 'rejected'),
  comments: { type: TEXT, allowNull: false },
  mentorComments: TEXT,
  reviewedAt: DATE,
});

export const MeetingRequest = sequelize.define('MeetingRequest', {
  requestedDate: { type: DATEONLY, allowNull: false },
  requestedTime: { type: STRING(5), allowNull: false },
  agenda: TEXT,
  location: STRING(300),
  status: oneOf('pending', 'accepted', 'rejected', 'rescheduled', 'expired'),
  mentorNote: TEXT,
});

export const Meeting = sequelize.define('Meeting', {
  date: { type: DATEONLY, allowNull: false },
  time: { type: STRING(5), allowNull: false },
  agenda: TEXT,
  location: STRING(300),
  scheduledBy: STRING(10), // 'mentor' when scheduled directly by the mentor
  status: oneOf('scheduled', 'completed', 'cancelled', 'missed'),
  notes: TEXT,
  checkedInAt: DATE,
});

export const Document = sequelize.define('Document', {
  fileName: { type: STRING(200), allowNull: false }, // logical name — versions share it
  originalName: STRING(255),
  fileType: STRING(20),
  category: STRING(40),
  filePath: { type: STRING(400), allowNull: false },
  size: INTEGER,
  version: { type: INTEGER, defaultValue: 1 },
  uploadedAt: { type: DATE, defaultValue: DataTypes.NOW },
});

export const Workshop = sequelize.define('Workshop', {
  title: { type: STRING(150), allowNull: false },
  description: TEXT,
  date: { type: DATEONLY, allowNull: false },
  time: STRING(5),
  venue: STRING(150),
  type: { type: STRING(30), defaultValue: 'workshop', validate: { isIn: [['workshop', 'hackathon', 'training']] } },
  capacity: { type: INTEGER, validate: { min: { args: [1], msg: 'Capacity must be at least 1' } } },
  status: oneOf('upcoming', 'completed', 'cancelled'),
});

export const WorkshopRegistration = sequelize.define('WorkshopRegistration', {
  registrationDate: { type: DATE, defaultValue: DataTypes.NOW },
  attendanceStatus: oneOf('registered', 'present', 'absent'),
});

export const Notification = sequelize.define('Notification', {
  message: { type: TEXT, allowNull: false },
  type: { type: STRING(30), defaultValue: 'info' },
  link: STRING(200),
  isRead: { type: BOOLEAN, defaultValue: false },
});

export const Feedback = sequelize.define('Feedback', {
  comments: { type: TEXT, allowNull: false },
  rating: { type: INTEGER, validate: { min: 1, max: 5 } },
});

export const Report = sequelize.define('Report', {
  reportType: { type: STRING(40), allowNull: false },
  data: {
    type: TEXT,
    get() { const raw = this.getDataValue('data'); return raw ? JSON.parse(raw) : null; },
    set(v) { this.setDataValue('data', JSON.stringify(v)); },
  },
});

// ---------------- Investor module ----------------
export const INVESTOR_TYPES = ['Angel', 'Angel Network', 'Venture Capital', 'Corporate', 'Government / Grant', 'Family Office'];
export const INSTRUMENTS = ['Equity', 'Convertible Note', 'SAFE', 'Debt', 'Grant'];

export const Investor = sequelize.define('Investor', {
  firmName: STRING(150),
  investorType: { type: STRING(30), defaultValue: 'Angel', validate: { isIn: [INVESTOR_TYPES] } },
  focusIndustries: STRING(300), // comma-separated industries
  ticketMin: DECIMAL(14, 2),
  ticketMax: DECIMAL(14, 2),
  bio: TEXT,
  website: STRING(200),
});

/** An investor's offer to a startup ("show investment interest"). Accepted = finance committed. */
/** Admin review of an accepted deal: under_review → cleared | on_hold | cancelled (on_hold → cleared | cancelled). */
export const CLEARANCE = ['under_review', 'on_hold', 'cleared', 'cancelled'];

export const InvestmentInterest = sequelize.define('InvestmentInterest', {
  amount: { type: DECIMAL(14, 2), allowNull: false },
  equity: FLOAT, // percent of equity asked, if any
  instrument: { type: STRING(30), defaultValue: 'Equity', validate: { isIn: [INSTRUMENTS] } },
  message: TEXT,
  status: oneOf('pending', 'accepted', 'declined', 'withdrawn'),
  founderNote: TEXT,
  respondedAt: DATE,
  // Incubation Cell review of an accepted deal; only a cleared deal counts as secured finance.
  clearance: { type: STRING(20), allowNull: true, validate: { isIn: [CLEARANCE] } },
  clearanceNote: TEXT,
  reviewedAt: DATE,
});

export const MEETING_KINDS = ['pitch', 'intro', 'due_diligence', 'follow_up'];

export const InvestorMeeting = sequelize.define('InvestorMeeting', {
  date: { type: DATEONLY, allowNull: false },
  time: { type: STRING(5), allowNull: false },
  agenda: TEXT,
  kind: { type: STRING(20), defaultValue: 'intro', validate: { isIn: [MEETING_KINDS] } },
  awaiting: STRING(10), // 'founder' | 'investor' — who must confirm while pending
  askAmount: DECIMAL(14, 2), // founder's funding ask for pitch meetings
  location: STRING(300), // meeting link or venue
  status: oneOf('pending', 'accepted', 'rejected', 'completed', 'cancelled', 'expired', 'missed'),
  note: TEXT,
  checkedInAt: DATE,
});

export const AuditLog = sequelize.define('AuditLog', {
  action: STRING(200),
  method: STRING(10),
  path: STRING(300),
  statusCode: INTEGER,
  ip: STRING(60),
});

// Every STRING(n) column gets a readable length check, so over-long input is a 400 — never a database error.
const label = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
for (const model of Object.values(sequelize.models)) {
  for (const [field, attr] of Object.entries(model.rawAttributes)) {
    const max = attr.type?.options?.length;
    if (attr.type?.key !== 'STRING' || !max || attr.validate?.len || attr.validate?.isIn) continue;
    attr.validate = { ...attr.validate, len: { args: [0, max], msg: `${label(field)} must be at most ${max} characters` } };
  }
  model.refreshAttributes();
}

// ---------------- Associations (see class diagram) ----------------
const cascade = { onDelete: 'CASCADE', hooks: true };

Role.hasMany(User, { foreignKey: 'roleId' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

User.hasMany(Startup, { foreignKey: 'createdById', as: 'startups' });
Startup.belongsTo(User, { foreignKey: 'createdById', as: 'founder' });

Startup.hasMany(StartupMember, { foreignKey: 'startupId', as: 'members', ...cascade });
StartupMember.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });

User.hasOne(Mentor, { foreignKey: 'userId', as: 'mentorProfile', ...cascade });
Mentor.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Startup.hasMany(MentorAssignment, { foreignKey: 'startupId', as: 'assignments', ...cascade });
MentorAssignment.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });
Mentor.hasMany(MentorAssignment, { foreignKey: 'mentorId', as: 'assignments', ...cascade });
MentorAssignment.belongsTo(Mentor, { foreignKey: 'mentorId', as: 'mentor' });

Startup.hasMany(Milestone, { foreignKey: 'startupId', as: 'milestones', ...cascade });
Milestone.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });
Milestone.hasMany(MilestoneUpdate, { foreignKey: 'milestoneId', as: 'updates', ...cascade });
MilestoneUpdate.belongsTo(Milestone, { foreignKey: 'milestoneId', as: 'milestone' });
MilestoneUpdate.belongsTo(User, { foreignKey: 'submittedById', as: 'submittedBy' });

Startup.hasMany(Document, { foreignKey: 'startupId', as: 'documents', ...cascade });
Document.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });
Document.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });

Startup.hasMany(MeetingRequest, { foreignKey: 'startupId', as: 'meetingRequests', ...cascade });
MeetingRequest.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });
MeetingRequest.belongsTo(Mentor, { foreignKey: 'mentorId', as: 'mentor' });
MeetingRequest.belongsTo(User, { foreignKey: 'requestedById', as: 'requestedBy' });
MeetingRequest.hasOne(Meeting, { foreignKey: 'meetingRequestId', as: 'meeting', ...cascade });
Meeting.belongsTo(MeetingRequest, { foreignKey: 'meetingRequestId', as: 'request' });
Startup.hasMany(Meeting, { foreignKey: 'startupId', as: 'meetings', ...cascade });
Meeting.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });
Meeting.belongsTo(Mentor, { foreignKey: 'mentorId', as: 'mentor' });

Workshop.hasMany(WorkshopRegistration, { foreignKey: 'workshopId', as: 'registrations', ...cascade });
WorkshopRegistration.belongsTo(Workshop, { foreignKey: 'workshopId', as: 'workshop' });
User.hasMany(WorkshopRegistration, { foreignKey: 'userId', as: 'registrations', ...cascade });
WorkshopRegistration.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Workshop.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', ...cascade });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Mentor.hasMany(Feedback, { foreignKey: 'mentorId', as: 'feedback', ...cascade });
Feedback.belongsTo(Mentor, { foreignKey: 'mentorId', as: 'mentor' });
Startup.hasMany(Feedback, { foreignKey: 'startupId', as: 'feedback', ...cascade });
Feedback.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });

User.hasOne(Investor, { foreignKey: 'userId', as: 'investorProfile', ...cascade });
Investor.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Investor.hasMany(InvestmentInterest, { foreignKey: 'investorId', as: 'interests', ...cascade });
InvestmentInterest.belongsTo(Investor, { foreignKey: 'investorId', as: 'investor' });
Startup.hasMany(InvestmentInterest, { foreignKey: 'startupId', as: 'investmentInterests', ...cascade });
InvestmentInterest.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });
Investor.hasMany(InvestorMeeting, { foreignKey: 'investorId', as: 'meetings', ...cascade });
InvestorMeeting.belongsTo(Investor, { foreignKey: 'investorId', as: 'investor' });
Startup.hasMany(InvestorMeeting, { foreignKey: 'startupId', as: 'investorMeetings', ...cascade });
InvestorMeeting.belongsTo(Startup, { foreignKey: 'startupId', as: 'startup' });
InvestorMeeting.belongsTo(Document, { foreignKey: 'deckId', as: 'deck', onDelete: 'SET NULL' });

Report.belongsTo(User, { foreignKey: 'generatedById', as: 'generatedBy' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

export { sequelize };
