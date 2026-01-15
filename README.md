# AI-First Task Management System

A production-grade task management system featuring a chat-based AI assistant, MongoDB persistence, and a modern React UI.

## 🚀 Features

- **AI Assistant**: Chat naturally to create tasks ("Remind me to buy milk tomorrow at 5pm").
- **Task Management**: Create, read, update, and delete tasks.
- **Reminders**: Background scheduler checks for due tasks every minute.
- **Modern UI**: Built with React, Vite, and Tailwind CSS.
- **Scalable Architecture**: Separated concerns via MCP (Model Context Protocol).

## 🛠️ Architecture

The system consists of three distinct services:

1.  **Backend (Port 3000)**: Node.js/Express + MongoDB. Handles data, auth, and scheduling.
2.  **MCP Server (Port 4000)**: AI Orchestration layer. Connects LLMs to the Backend tools.
3.  **Frontend (Port 5173)**: React application for the user interface.

## 🏁 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **MongoDB** (Running locally on default port `27017` OR Cloud URI in `.env`)

### 1. Backend Setup

```bash
cd backend
npm install
# Ensure .env has valid MONGO_URI
npm start
```
*Runs on http://localhost:3000*

### 2. MCP Server Setup

```bash
cd mcp-server
npm install
# Ensure .env has GEMINI_API_KEY (from Google AI Studio)
npm start
```
*Runs on http://localhost:4000*

**Required Environment Variables:**
- `GEMINI_API_KEY`: Your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `GEMINI_MODEL`: (Optional) Model to use, defaults to `gemini-1.5-pro`
- `BACKEND_URL`: URL of the backend server (default: http://localhost:3000)

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
*Runs on http://localhost:5173*

## 🧪 Testing

- **Backend API**: Run `node backend/test-api.js`
- **MCP Integration**: Run `node mcp-server/test-mcp.js`

## 🤖 AI Integration

The MCP Server now uses **Google Gemini API** for natural language processing:
- **Conversation Memory**: The LLM maintains conversation history for smooth, context-aware interactions
- **Tool Integration**: Automatically calls MCP tools (add_task, list_events, etc.) based on user requests
- **Function Calling**: Properly handles function responses and generates natural language summaries

## 🔮 Future Improvements

- **Google Calendar**: Complete the OAuth flow in `backend/services/calendar.service.js`.
- **Email Notifications**: Connect `nodemailer` to the scheduler.
