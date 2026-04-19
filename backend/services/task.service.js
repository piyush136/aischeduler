const Task = require('../models/task.model');
const mongoose = require('mongoose');
const TeamMember = require('../models/teamMember.model');
const { getTaskDurationMinutes, normalizeDate } = require('../utils/taskDate');

function normalizeSubtasks(subtasks = []) {
  return subtasks.map(subtask => ({
    _id: new mongoose.Types.ObjectId(),
    title: subtask.title || subtask,
    status: subtask.status || 'pending'
  }));
}

function normalizeTaskPayload(taskData, userId) {
  const payload = {
    ...taskData,
    user_id: userId,
    created_by: taskData.created_by || userId,
    team_id: taskData.team_id || null,
    assigned_to: Array.isArray(taskData.assigned_to) ? taskData.assigned_to : (taskData.assigned_to ? [taskData.assigned_to] : []),
    subtasks: Array.isArray(taskData.subtasks) ? normalizeSubtasks(taskData.subtasks) : []
  };

  if (!payload.title || !String(payload.title).trim()) {
    throw new Error('Title is required');
  }
  payload.title = String(payload.title).trim();

  if (payload.due_at) {
    const dueAt = normalizeDate(payload.due_at);
    if (!dueAt) {
      throw new Error('Invalid due_at value');
    }
    payload.due_at = dueAt;
  }

  return payload;
}

class TaskService {
  async create(taskData, userId) {
    if (taskData && (taskData.source === 'google' || taskData.isGoogleEvent === true)) {
      throw new Error('Creating tasks from Google Calendar is not allowed. Use local task creation and sync to Google.');
    }

    const task = new Task(normalizeTaskPayload(taskData, userId));
    return task.save();
  }

  async getById(taskId, userId) {
    return Task.findOne({ _id: taskId, user_id: userId });
  }

  async getAll(userId) {
    return Task.find({ user_id: userId, team_id: null }).sort({ due_at: 1, created_at: -1 });
  }

  async getUpcoming(userId) {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return Task.find({
      user_id: userId,
      team_id: null,
      due_at: { $gt: endOfDay }
    }).sort({ due_at: 1 });
  }

  async getToday(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return Task.find({
      user_id: userId,
      team_id: null,
      due_at: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ due_at: 1 });
  }

  async update(taskId, userId, updates) {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.due_at) {
      const dueAt = normalizeDate(normalizedUpdates.due_at);
      if (!dueAt) {
        throw new Error('Invalid due_at value');
      }
      normalizedUpdates.due_at = dueAt;
      normalizedUpdates.email_reminder_sent = false;
    }

    return Task.findOneAndUpdate(
      { _id: taskId, user_id: userId },
      { $set: normalizedUpdates },
      { new: true }
    );
  }

  async delete(taskId, userId) {
    return Task.findOneAndDelete({ _id: taskId, user_id: userId });
  }

  async addSubtask(taskId, userId, subtaskTitle) {
    const subtask = {
      _id: new mongoose.Types.ObjectId(),
      title: subtaskTitle,
      status: 'pending'
    };

    return Task.findOneAndUpdate(
      { _id: taskId, user_id: userId },
      { $push: { subtasks: subtask } },
      { new: true }
    );
  }

  async updateSubtask(taskId, userId, subtaskId, updates) {
    return Task.findOneAndUpdate(
      { _id: taskId, user_id: userId, 'subtasks._id': subtaskId },
      { $set: { 'subtasks.$.status': updates.status } },
      { new: true }
    );
  }

  async deleteSubtask(taskId, userId, subtaskId) {
    return Task.findOneAndUpdate(
      { _id: taskId, user_id: userId },
      { $pull: { subtasks: { _id: subtaskId } } },
      { new: true }
    );
  }

  async canAccessTask(task, userId) {
    if (!task) return false;
    if (String(task.user_id) === String(userId) || String(task.created_by) === String(userId)) {
      return true;
    }
    if (!task.team_id) return false;

    const membership = await TeamMember.findOne({
      team_id: task.team_id,
      user_id: userId,
      status: 'active'
    });
    if (!membership) return false;

    const assignees = Array.isArray(task.assigned_to) ? task.assigned_to : [];
    if (assignees.length === 0) return true;
    return assignees.some(assigneeId => String(assigneeId) === String(userId));
  }

  async addComment(taskId, userId, body) {
    const task = await Task.findById(taskId);
    const canAccess = await this.canAccessTask(task, userId);
    if (!canAccess) return null;

    const comment = {
      _id: new mongoose.Types.ObjectId(),
      user_id: userId,
      body: String(body || '').trim(),
      created_at: new Date()
    };

    task.comments.push(comment);
    await task.save();

    return Task.findById(taskId)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('comments.user_id', 'name email profile_picture');
  }

  async createBulk(tasksData, userId) {
    const created = [];
    const failed = [];

    for (let index = 0; index < tasksData.length; index += 1) {
      const taskData = tasksData[index];
      if (taskData && (taskData.source === 'google' || taskData.isGoogleEvent === true)) {
        failed.push({
          index,
          title: taskData.title || `Task ${index + 1}`,
          error: 'Google Calendar source tasks cannot be created'
        });
        continue;
      }

      try {
        const task = new Task(normalizeTaskPayload(taskData, userId));
        created.push(await task.save());
      } catch (error) {
        failed.push({
          index,
          title: taskData.title || `Task ${index + 1}`,
          error: error.message
        });
      }
    }

    return {
      total: tasksData.length,
      created,
      failed
    };
  }

  async checkConflict(userId, startTime, durationMinutes = 60) {
    const start = normalizeDate(startTime);
    if (!start) return null;

    const windowEnd = new Date(start);
    windowEnd.setMinutes(windowEnd.getMinutes() + durationMinutes);

    const candidateTasks = await Task.find({
      user_id: userId,
      status: { $ne: 'completed' },
      has_time: { $ne: false },
      due_at: {
        $gte: new Date(start.getTime() - 24 * 60 * 60 * 1000),
        $lte: new Date(windowEnd.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    return candidateTasks.find(task => {
      const taskStart = normalizeDate(task.due_at);
      const taskEnd = new Date(taskStart);
      taskEnd.setMinutes(taskEnd.getMinutes() + getTaskDurationMinutes(task, 60));
      return taskStart < windowEnd && taskEnd > start;
    }) || null;
  }

  async getTasksInRange(userId, start, end) {
    return Task.find({
      user_id: userId,
      has_time: { $ne: false },
      due_at: {
        $gte: normalizeDate(start),
        $lte: normalizeDate(end)
      }
    }).sort({ due_at: 1 });
  }

  async postpone(taskId, userId, newDate) {
    const task = await Task.findOne({ _id: taskId, user_id: userId });
    if (!task) return { error: 'Task not found', status: 404 };

    if (task.status === 'completed') {
      return { error: 'Cannot postpone a completed task', status: 400 };
    }

    const targetDate = normalizeDate(newDate);
    if (!targetDate) {
      return { error: 'Invalid date format', status: 400 };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (targetDate < startOfToday) {
      return { error: 'Cannot postpone to a past date', status: 400 };
    }

    if (task.due_at && task.has_time !== false) {
      const originalTime = new Date(task.due_at);
      targetDate.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), 0);
    }

    const updates = {
      due_at: targetDate,
      postponed_count: (task.postponed_count || 0) + 1,
      email_reminder_sent: false
    };

    if (!task.original_due_at) {
      updates.original_due_at = task.due_at || new Date();
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, user_id: userId },
      { $set: updates },
      { new: true }
    );

    return { task: updatedTask };
  }
}

module.exports = new TaskService();
