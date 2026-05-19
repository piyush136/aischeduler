# Detailed Project Report: AI Smart Scheduling System

## 1. Project Overview

The AI Smart Scheduling System is a full-stack task, calendar, reminder, and team productivity application. It allows users to manage personal tasks, collaborate with teams, connect Google Calendar, receive reminders, and interact with an AI assistant through natural language chat and voice input.

The project is designed around three main services:

1. Frontend: React, Vite, and Tailwind CSS user interface.
2. Backend: Node.js, Express, MongoDB, and Mongoose API layer.
3. MCP Server: AI orchestration layer that connects Gemini LLM function calling to backend tools.

The system supports traditional form-based task management and AI-first scheduling commands such as:

- "Add a task tomorrow at 9 AM."
- "Create three tasks for my project."
- "Move my meeting task to today."
- "Show overdue tasks."
- "Create a team and invite a member."
- "Find a free slot tomorrow afternoon."
- "Set a reminder for this task."

## 2. Project Objectives

The main objectives of the project are:

- Provide an intelligent scheduling system that understands natural language.
- Reduce manual task entry using AI-driven task creation and updates.
- Support personal and team task management in one workspace.
- Integrate tasks with calendar workflows.
- Provide reminders and notifications for upcoming work.
- Offer a modern, responsive, and user-friendly dashboard.
- Build a modular architecture where AI logic is separated from core business APIs.

## 3. Technology Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React icons
- date-fns
- Leaflet and React Leaflet
- Vite PWA plugin

### Backend

- Node.js
- Express 5
- MongoDB
- Mongoose
- JSON Web Token authentication
- bcryptjs password hashing
- Google APIs and Google Auth Library
- node-cron scheduler
- Nodemailer email service

### AI / MCP Layer

- Node.js
- Express
- Google Gemini REST API
- Gemini function calling
- Custom MCP-style tool registry
- chrono-node for date/time parsing support
- Axios for backend communication

### Database

- MongoDB
- Mongoose schemas and indexes

## 4. High-Level Architecture

```text
User
  |
  v
Frontend: React Dashboard
  |
  | REST API calls with JWT token
  v
Backend: Express API
  |
  | Mongoose models and services
  v
MongoDB Database

AI flow:

User
  |
  v
Frontend ChatWidget / Voice Input
  |
  | POST /mcp/chat with message, local date/time, timezone, JWT token
  v
MCP Server
  |
  | System prompt + tool schemas
  v
Gemini LLM
  |
  | Function call decision
  v
MCP Tool Execution
  |
  | Authenticated REST call
  v
Backend API
  |
  v
MongoDB / Calendar / Reminder / Notification services
```

## 5. Service Architecture

### 5.1 Frontend Service

Location: `frontend/`

The frontend is a single-page React application. It handles routing, authentication state, dashboard navigation, task display, calendar views, team workspace views, AI chat, and modals.

Important files:

- `frontend/src/App.jsx`: Defines routes and authentication state.
- `frontend/src/pages/Dashboard.jsx`: Main authenticated workspace.
- `frontend/src/components/TaskList.jsx`: Task list views.
- `frontend/src/components/AddTaskModal.jsx`: Task creation and editing UI.
- `frontend/src/components/ChatWidget.jsx`: AI assistant chat and voice input.
- `frontend/src/components/CalendarView.jsx`: Calendar interface.
- `frontend/src/components/TeamWorkspace.jsx`: Team tasks and messages.
- `frontend/src/components/InboxView.jsx`: Notifications and team invitations.
- `frontend/src/services/NotificationService.js`: Browser notification permission handling.
- `frontend/src/services/TimeNotificationService.js`: Client-side task time notification tracking.

Main frontend routes:

- `/`: Landing page.
- `/login`: Login page.
- `/register`: Registration page.
- `/dashboard`: Main application dashboard.
- `/calendar/callback`: Google Calendar OAuth callback page.

### 5.2 Backend Service

Location: `backend/`

The backend is the main business logic and data persistence layer. It exposes REST APIs for authentication, users, tasks, teams, calendar integration, notifications, and reminders.

Important files:

- `backend/server.js`: Loads environment variables, starts the Express server, and initializes scheduler jobs.
- `backend/app.js`: Configures middleware, database connection, and routes.
- `backend/config/db.js`: MongoDB connection.
- `backend/middleware/auth.middleware.js`: JWT authentication middleware.
- `backend/services/task.service.js`: Core task business logic.
- `backend/services/scheduler.service.js`: Background reminder scheduler.
- `backend/services/calendar.service.js`: Google Calendar integration.
- `backend/services/reminder.service.js`: Reminder persistence and lookup.
- `backend/services/team.service.js`: Team collaboration logic.

Backend default port from source code: `3000`.

### 5.3 MCP / AI Service

Location: `mcp-server/`

The MCP server is the AI orchestration layer. It receives user chat messages, builds a system prompt with current date/time context, sends tool schemas to Gemini, executes selected tools, and returns a natural language reply to the frontend.

Important files:

- `mcp-server/server.js`: Starts the MCP Express server.
- `mcp-server/routes/chat.route.js`: Main `/mcp/chat` endpoint and tool-call chain handling.
- `mcp-server/routes/chat.helpers.js`: System prompt, execution metadata, argument normalization, and tool result summaries.
- `mcp-server/llm/client.js`: Gemini REST API client and function-calling adapter.
- `mcp-server/tools/index.js`: Tool registry.
- `mcp-server/tools/*.tool.js`: Individual AI-callable tools.

MCP default port from source code: `5001`.

## 6. Complete Application Data Flow

### 6.1 Manual Task Creation Flow

```text
User opens Add Task modal
  |
  v
Frontend collects title, date, time, priority, recurrence, subtasks, team fields
  |
  v
POST /tasks with JWT token
  |
  v
Backend auth middleware verifies token
  |
  v
Task controller validates request
  |
  v
Task service normalizes payload and creates task document
  |
  v
MongoDB stores task
  |
  v
Backend returns created task
  |
  v
Frontend refreshes dashboard
```

### 6.2 AI Task Creation Flow

```text
User sends message in ChatWidget
  |
  v
Frontend sends message, local date, time, timezone, history, and JWT token
  |
  v
MCP /mcp/chat route builds system prompt
  |
  v
Gemini receives prompt, conversation history, and tool schemas
  |
  v
Gemini selects tool, for example add_task
  |
  v
MCP normalizes arguments and attaches execution metadata
  |
  v
Tool calls backend /tasks endpoint with the user's JWT token
  |
  v
Backend creates task in MongoDB
  |
  v
Tool returns result to MCP
  |
  v
MCP sends function response back to Gemini
  |
  v
Gemini creates final user-friendly reply
  |
  v
Frontend displays confirmation and refreshes task list
```

### 6.3 Reminder Flow

```text
Backend server starts
  |
  v
Scheduler service initializes node-cron job
  |
  v
Every minute scheduler checks custom reminders and upcoming tasks
  |
  v
Due reminder found
  |
  v
Email service sends reminder email
  |
  v
Reminder status or task email_reminder_sent flag is updated
```

### 6.4 Google Calendar Flow

```text
User clicks Connect Calendar
  |
  v
Frontend requests /calendar/auth
  |
  v
Backend generates Google OAuth URL
  |
  v
User authorizes Google account
  |
  v
Frontend receives callback code
  |
  v
Backend exchanges code for tokens
  |
  v
Tokens are stored on user document
  |
  v
Future tasks can be synced to Google Calendar
```

## 7. AI Layer Architecture: MCP Layer

The AI layer is separated from the backend to keep AI reasoning, prompt design, and tool-calling logic independent from the core application APIs.

### 7.1 MCP Layer Responsibilities

The MCP server is responsible for:

- Receiving chat requests from the frontend.
- Reading the user's local date, time, timezone, and weekday.
- Building a system prompt for Gemini.
- Sending available tool definitions to Gemini.
- Detecting direct intents for simple requests such as overdue tasks.
- Executing one or more tool calls.
- Limiting tool-call chains to avoid infinite loops.
- Normalizing tool arguments.
- Passing the authenticated user token to backend APIs.
- Summarizing tool results.
- Returning a natural language answer to the user.

### 7.2 MCP Request Structure

The chat route accepts:

- `message`: User's natural language command.
- `history`: Previous chat messages.
- `localDate`: Browser-local date.
- `localTimeString`: Browser-local time.
- `userTimezone`: Browser timezone.
- `Authorization`: Bearer JWT token.

### 7.3 System Prompt Design

The system prompt gives Gemini operational instructions, including:

- Current local date and time context.
- Tool usage rules.
- Date and time interpretation rules.
- Scheduling rules.
- Reminder rules.
- Team collaboration rules.
- Error handling behavior.
- Response style.

This is important because scheduling depends heavily on relative phrases such as "today", "tomorrow", "next Monday", "tonight", and "next available slot".

### 7.4 Tool Calling Chain

The MCP server supports chained tool execution. For example:

```text
User: "Assign the design task to Priya in the Marketing team"
  |
  v
Tool 1: list_teams
  |
  v
Tool 2: list_team_members
  |
  v
Tool 3: update_task
  |
  v
Final natural language response
```

The maximum chain length is controlled by `MAX_TOOL_CHAIN = 10`.

### 7.5 MCP Tool Registry

The project registers these AI-callable tools:

- `add_task`: Create a single task.
- `add_multiple_tasks`: Create multiple tasks from one prompt.
- `get_tasks`: List tasks by filters such as today, overdue, recent, completed.
- `search_tasks`: Search tasks by title or query.
- `update_task`: Update title, due date, status, priority, recurrence, team assignment, and assignees.
- `update_multiple_tasks`: Update multiple tasks in one request.
- `delete_task`: Delete a task.
- `postpone_task`: Move a task to another date or available slot.
- `pin_task`: Pin or unpin a task.
- `create_complex_task`: Create complex tasks with multiple details.
- `create_plan`: Generate a multi-day task plan.
- `add_subtask`: Add a subtask to an existing task.
- `update_subtask`: Mark a subtask pending or completed.
- `delete_subtask`: Remove a subtask.
- `analyze_tasks`: Analyze workload, urgency, priority, and productivity advice.
- `find_free_slots`: Find open scheduling slots.
- `list_events`: List local and calendar events.
- `sync_calendar`: Sync future tasks to Google Calendar.
- `disconnect_calendar`: Disconnect Google Calendar.
- `get_weather`: Fetch weather information.
- `set_reminder`: Create or update a reminder.
- `list_reminders`: List reminders.
- `list_notifications`: List inbox notifications.
- `respond_team_invite`: Accept or reject team invitations.
- `copy_task`: Copy personal tasks to team or team tasks to personal workspace.
- `create_team`: Create a team.
- `list_teams`: List teams for the current user.
- `rename_team`: Rename a team.
- `delete_team`: Delete a team.
- `invite_team_member`: Invite a user to a team.
- `list_team_members`: List members of a team.
- `remove_team_member`: Remove a team member.
- `update_member_permissions`: Update team member permissions.
- `get_team_tasks`: List tasks for a team.

### 7.6 AI Safety and Reliability Controls

The AI layer includes these safeguards:

- Requires authenticated token before executing tools.
- Never invents IDs or task results according to the system prompt.
- Asks clarification when a tool returns ambiguous matches.
- Stops chained execution after a fixed limit.
- Returns real tool errors instead of pretending success.
- Uses local date/time metadata to avoid wrong relative-date scheduling.
- Rejects unsafe past scheduling according to prompt and tool behavior.
- Keeps MongoDB as the source of truth; Google Calendar is a mirror.

## 8. Backend Architecture

### 8.1 Backend Route Groups

The backend exposes these main route groups:

- `/auth` and `/api/auth`: Register, login, Google login, Google callback, logout.
- `/user`: User profile operations.
- `/tasks`: Task CRUD, bulk creation, today view, conflict checks, free slots, subtasks, comments, copy actions.
- `/calendar`: Google Calendar auth, connect, sync, disconnect, status, events, delete event.
- `/teams`: Team CRUD, members, permissions, team tasks, team messages, invites.
- `/notifications`: Notifications list, unread count, mark read.
- `/reminders`: Reminder list and upsert.

### 8.2 Backend Layering

```text
Express Route
  |
  v
Auth Middleware
  |
  v
Controller
  |
  v
Service
  |
  v
Mongoose Model
  |
  v
MongoDB
```

Controllers handle HTTP request and response logic. Services contain reusable business logic. Models define database structure and indexes.

## 9. Database Architecture

### 9.1 User Model

Stores:

- Name
- Email
- Password hash
- Google OAuth tokens
- Profile picture
- Phone number
- Created and updated timestamps

### 9.2 Task Model

The task schema is the central data model. It supports personal tasks, team tasks, subtasks, recurrence, calendar sync, comments, location, and postponement tracking.

Important fields:

- `user_id`: Owner of the task.
- `team_id`: Team reference for team tasks.
- `assigned_to`: Team members assigned to the task.
- `created_by`: User who created the task.
- `title`: Task title.
- `description`: Optional task details.
- `due_at`: Scheduled date/time.
- `has_time`: Indicates whether the task has a specific time.
- `priority`: Numeric priority from 1 to 5.
- `status`: `pending`, `in_progress`, or `completed`.
- `isPinned`: Pin state.
- `is_recurring`: Recurrence flag.
- `recurrence`: Advanced recurrence enum.
- `recurrence_pattern`: Human-readable recurrence description.
- `recurrence_end_date`: Recurrence stop date.
- `next_occurrence`: Next recurring occurrence.
- `repeat`: Simple recurrence value: `never`, `daily`, `weekly`, `monthly`, `yearly`.
- `is_complex`: Complex task flag.
- `duration_minutes`: Task duration.
- `tags`: Task labels.
- `location`: Location name, coordinates, and radius.
- `postponed_count`: Number of postponements.
- `original_due_at`: Original due date before postponement.
- `googleEventId`: Google Calendar event ID.
- `email_reminder_sent`: Reminder email state.
- `subtasks`: Embedded subtask list.
- `comments`: Embedded task comments.

Indexes:

- User and due date lookup.
- Unique Google event ID per user when synced.
- Team task lookup.
- User status and due date lookup.

### 9.3 Team Model

Stores:

- Team name
- Creator user reference
- Created and updated timestamps

### 9.4 TeamMember Model

Stores:

- Team reference
- User reference
- Role: `admin` or `member`
- Status: `pending` or `active`
- Permission flags: `can_add_task`, `can_edit_task`
- Joined date

### 9.5 Reminder Model

Stores:

- Task reference
- Reminder date/time
- Offset in minutes
- Status: `scheduled`, `sent`, or `failed`

### 9.6 Notification Model

Stores:

- Receiver user
- Notification type
- Optional task/team reference
- Actor user
- Conversation type
- Message
- Read/unread state

### 9.7 TeamMessage Model

Stores:

- Team reference
- Sender
- Optional recipient
- Conversation type: direct or team
- Message body
- Timestamps

## 10. Feature List

### 10.1 Authentication Features

- User registration.
- User login.
- JWT-based protected routes.
- Google login support.
- Logout route.
- Local frontend token storage.

### 10.2 Dashboard Features

- Responsive authenticated workspace.
- Sidebar navigation.
- Mobile menu support.
- User profile dropdown.
- Search input.
- Workspace sections:
  - Inbox
  - Today
  - Upcoming
  - Calendar
  - Completed
  - Weather
  - Profile
  - Teams
- Add task modal.
- Edit task modal support.
- Refresh-on-update behavior.

### 10.3 Task Management Features

- Create task.
- Edit task.
- Delete task.
- View all personal tasks.
- View today's tasks.
- View upcoming tasks.
- View completed tasks.
- Search tasks.
- Filter task views.
- Priority support.
- Status support.
- Pin/unpin tasks.
- Postpone tasks.
- Track postponed count.
- Preserve original due date.
- Mark tasks as completed.
- Bulk task creation.
- Multi-task update.
- Task comments.
- Task copy actions.

### 10.4 Subtask Features

- Add subtasks while creating a task.
- Add subtasks to an existing task.
- Mark subtasks completed or pending.
- Delete subtasks.
- Store subtasks inside the parent task document.
- Display subtask progress in task UI.

### 10.5 Recurrence Features

- Simple repeat values:
  - Never
  - Daily
  - Weekly
  - Monthly
  - Yearly
- Advanced recurrence values:
  - Daily
  - Weekdays
  - Weekends
  - Every specific weekday
  - Every 2 or 3 days
  - Every week
  - Every 2 weeks
  - Every month
  - Every 3 or 6 months
  - Every year
- Recurrence pattern description.
- Recurrence end date.
- Next occurrence tracking.

### 10.6 AI Assistant Features

- Natural language task creation.
- Natural language bulk task creation.
- Natural language task updates.
- Natural language task deletion.
- Relative date understanding.
- AI task search.
- AI workload analysis.
- AI productivity advice.
- AI free-slot finding.
- AI reminder setup.
- AI calendar actions.
- AI team management.
- AI invite response.
- AI subtask management.
- Multi-step tool chaining.
- Conversation history handling.
- Function response continuation.

### 10.7 Voice Input Features

- Voice input through frontend chat component.
- Spoken commands can be sent to the MCP server.
- Supports natural language task creation and scheduling.

### 10.8 Reminder and Notification Features

- Custom reminder creation.
- Reminder listing.
- Scheduled reminder checks.
- Default upcoming task reminders.
- Email reminder sending.
- Browser notification permission request.
- Client-side time notification sync.
- Inbox notification list.
- Unread notification count.
- Mark notification as read.
- Team invitation notifications.
- Team message notifications.

### 10.9 Calendar Features

- Google Calendar OAuth connection.
- Google Calendar disconnect.
- Calendar connection status.
- Sync future local tasks to Google Calendar.
- List local tasks as calendar events.
- List external Google Calendar events.
- Delete Google Calendar events.
- Conflict check support.
- Free slot lookup.

### 10.10 Team Collaboration Features

- Create team.
- Rename team.
- Delete team.
- Invite team member.
- Accept team invite.
- Reject team invite.
- List teams.
- List team members.
- Remove team member.
- Update member permissions.
- Team task creation.
- Team task assignment.
- Team task listing.
- Copy personal tasks to team.
- Copy team tasks to personal workspace.
- Team messages.
- Direct team-member messages.
- Team notifications.

### 10.11 Weather Features

- Weather view in dashboard.
- AI weather tool support.
- Weather widget component.

### 10.12 PWA and UI Features

- Vite PWA plugin.
- PWA icons.
- Install PWA component.
- Responsive dashboard layout.
- Calendar UI.
- Modal dialogs.
- Action dialog feedback.
- Modern icon-based UI.

## 11. API Summary

### Authentication APIs

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google-login`
- `GET /auth/google/callback`
- `POST /auth/logout`

### Task APIs

- `POST /tasks`
- `POST /tasks/bulk`
- `GET /tasks`
- `GET /tasks/today`
- `PATCH /tasks/:id`
- `PATCH /tasks/:id/postpone`
- `DELETE /tasks/:id`
- `POST /tasks/:id/copy-personal`
- `POST /tasks/:id/copy-team`
- `GET /tasks/check-conflict`
- `GET /tasks/free-slots`
- `POST /tasks/:taskId/subtasks`
- `PATCH /tasks/:taskId/subtasks/:subtaskId`
- `DELETE /tasks/:taskId/subtasks/:subtaskId`
- `POST /tasks/:taskId/comments`

### Calendar APIs

- `GET /calendar/auth`
- `POST /calendar/connect`
- `POST /calendar/sync`
- `POST /calendar/disconnect`
- `GET /calendar/status`
- `GET /calendar/events`
- `DELETE /calendar/events/:id`

### Team APIs

- `POST /teams`
- `PATCH /teams/:teamId`
- `DELETE /teams/:teamId`
- `GET /teams`
- `POST /teams/:teamId/members`
- `GET /teams/:teamId/members`
- `GET /teams/:teamId/tasks`
- `GET /teams/:teamId/messages`
- `POST /teams/:teamId/messages`
- `POST /teams/:teamId/accept-invite`
- `POST /teams/:teamId/reject-invite`
- `DELETE /teams/:teamId/members/:memberId`
- `PATCH /teams/:teamId/members/:memberId/permissions`

### Notification APIs

- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`

### Reminder APIs

- `GET /reminders`
- `POST /reminders`

### MCP APIs

- `GET /mcp/health`
- `POST /mcp/chat`
- `POST /mcp/chat/clear`

## 12. Security Architecture

Security features include:

- JWT token authentication for protected backend routes.
- Password hashing using bcryptjs.
- Auth middleware applied to task, team, reminder, notification, and protected calendar routes.
- MCP server requires bearer token before executing AI tools.
- MCP tools forward the user's token to backend APIs so normal backend permissions still apply.
- Google tokens are stored on the user document for calendar sync.
- Team permissions control member task capabilities.

Security recommendations:

- Never commit `.env` files or API keys.
- Rotate exposed API keys immediately if they were shared.
- Use strong `JWT_SECRET` in production.
- Use HTTPS in production.
- Store production secrets in a secret manager.
- Restrict CORS in production.
- Add rate limiting to auth and AI chat endpoints.
- Encrypt or secure Google OAuth tokens in production.

## 13. Configuration

Typical environment variables:

### Backend

```text
PORT=3000
MONGO_URI=mongodb://localhost:27017/ai-task-manager
JWT_SECRET=your-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/calendar/callback
EMAIL_USER=your-email
EMAIL_PASS=your-email-app-password
```

### MCP Server

```text
PORT=5001
BACKEND_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-flash-latest
```

### Frontend

The frontend uses `frontend/src/config/api.js` to build API URLs.

## 14. Deployment Architecture

For local development:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
MCP:      http://localhost:5001
MongoDB:  localhost or cloud MongoDB URI
```

Root-level scripts:

- `npm install`: Installs root dependency and triggers sub-project installs through `postinstall`.
- `npm start`: Runs backend, MCP server, and frontend together.
- `npm run dev`: Runs all services in development mode.

Production deployment can place each service independently:

- Frontend on Vercel, Netlify, Nginx, or static hosting.
- Backend on Node hosting such as EC2, Render, Railway, or VPS.
- MCP server on a separate Node service.
- MongoDB on MongoDB Atlas.

## 15. Testing and Verification

Existing test-related files include:

- `mcp-server/tests/run.js`
- `mcp-server/tests/run.test.js`
- `mcp-server/tests/tools.test.js`
- `mcp-server/tests/dateTime.test.js`
- `mcp-server/tests/chat.route.test.js`
- `mcp-server/tests/fuzzyTaskSearch.test.js`
- `mcp-server/test-connection.js`
- `test-bulk-tasks.js`

Commands:

```bash
cd mcp-server
npm test
```

Frontend build verification:

```bash
cd frontend
npm run build
```

Backend currently has a placeholder `npm test` script, so backend automated test coverage should be expanded.

## 16. Strengths of the Project

- Clear separation between frontend, backend, and AI orchestration.
- Rich AI tool registry with many real application actions.
- MongoDB source-of-truth design.
- Calendar is treated as a sync target, avoiding data ownership confusion.
- Supports both personal and team workflows.
- Handles subtasks, recurrence, reminders, notifications, and calendar events.
- Uses local browser date/time context for more accurate AI scheduling.
- Supports multi-step AI actions through chained tool calls.

## 17. Limitations and Future Scope

Recommended future improvements:

- Add stronger backend automated tests.
- Add role-based access tests for teams.
- Add rate limiting for login and AI chat endpoints.
- Add centralized logging and monitoring.
- Encrypt Google OAuth tokens before storing.
- Add refresh-token recovery and OAuth token rotation handling.
- Add recurring-task materialization jobs.
- Add real-time notifications with WebSockets.
- Add AI audit logs for tool calls.
- Add admin dashboard for usage and errors.
- Add mobile app or stronger PWA offline support.
- Add conflict resolution UI for schedule overlaps.
- Add full deployment documentation for production.

## 18. Conclusion

The AI Smart Scheduling System is a modular, AI-first productivity platform. It combines a modern React dashboard, an Express/MongoDB backend, and a Gemini-powered MCP tool layer. The architecture makes it possible for users to manage tasks manually or through natural language while preserving backend validation, authentication, and database consistency.

The most important architectural decision is the separation of the MCP server from the backend. This keeps AI reasoning and tool orchestration flexible while allowing the backend to remain the trusted source for permissions, validation, persistence, reminders, teams, and calendar sync.

