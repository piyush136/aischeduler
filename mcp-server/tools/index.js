const addTask = require('./addTask.tool');
const addMultipleTasks = require('./addMultipleTasks.tool');
const getTasks = require('./getTodayTasks.tool');
const createComplexTask = require('./createComplexTask.tool');
const addSubtask = require('./addSubtask.tool');
const updateSubtask = require('./updateSubtask.tool');
const updateMultipleTasks = require('./updateMultipleTasks.tool');
const deleteSubtask = require('./deleteSubtask.tool');

// New personal tools
const pinTask = require('./pinTask.tool');
const analyzeTasks = require('./analyzeTasks.tool');
const createPlan = require('./createPlan.tool');
const setReminder = require('./setReminder.tool');
const listReminders = require('./listReminders.tool');
const syncCalendar = require('./syncCalendar.tool');
const disconnectCalendar = require('./disconnectCalendar.tool');
const copyTask = require('./copyTask.tool');
const listNotifications = require('./listNotifications.tool');
const respondTeamInvite = require('./respondTeamInvite.tool');

// Team tools
const createTeam = require('./createTeam.tool');
const listTeams = require('./listTeams.tool');
const renameTeam = require('./renameTeam.tool');
const deleteTeam = require('./deleteTeam.tool');
const inviteTeamMember = require('./inviteTeamMember.tool');
const listTeamMembers = require('./listTeamMembers.tool');
const removeTeamMember = require('./removeTeamMember.tool');
const updateMemberPermissions = require('./updateMemberPermissions.tool');
const getTeamTasks = require('./getTeamTasks.tool');

const tools = [
  addTask,
  addMultipleTasks,
  getTasks,
  createComplexTask,
  require('./searchTasks.tool'),
  require('./listEvents.tool'),
  require('./deleteTask.tool'),
  require('./updateTask.tool'),
  require('./findFreeSlots.tool'),
  require('./getWeather.tool'),
  require('./postponeTask.tool'),
  updateMultipleTasks,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  // New personal tools
  pinTask,
  analyzeTasks,
  createPlan,
  setReminder,
  listReminders,
  syncCalendar,
  disconnectCalendar,
  copyTask,
  listNotifications,
  respondTeamInvite,
  // Team tools
  createTeam,
  listTeams,
  renameTeam,
  deleteTeam,
  inviteTeamMember,
  listTeamMembers,
  removeTeamMember,
  updateMemberPermissions,
  getTeamTasks
];

const toolMap = tools.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {});

module.exports = {
  tools,
  toolMap
};
