const addTask = require('./addTask.tool');
const getTodayTasks = require('./getTodayTasks.tool');

const tools = [
  addTask,
  getTodayTasks,
  require('./listEvents.tool'),
  require('./deleteTask.tool'),
  require('./updateTask.tool')
];

const toolMap = tools.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {});

module.exports = {
  tools,
  toolMap
};
