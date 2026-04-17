// Clear Google Calendar Tokens from Database
// Run this to remove old/invalid Google tokens from all users

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/user.model');

async function clearTokens() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Remove google_tokens from all users
        const result = await User.updateMany(
            { google_tokens: { $exists: true } },
            { $unset: { google_tokens: 1 } }
        );

        console.log(`✓ Cleared Google tokens from ${result.modifiedCount} user(s)`);
        console.log('All users disconnected from Google Calendar');
        
        await mongoose.connection.close();
        console.log('✓ Database connection closed');
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

clearTokens();
