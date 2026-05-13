const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/mcp', require('./routes/chat.route'));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
});
