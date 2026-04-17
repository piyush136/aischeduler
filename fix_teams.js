const mongoose = require('mongoose');
const TeamMember = require('./backend/models/teamMember.model');
require('dotenv').config({path: './backend/.env'});

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    const result = await TeamMember.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
    console.log('Updated existing team members to active:', result);
    
    // Also explicitly make sure admins are active
    const adminResult = await TeamMember.updateMany({ role: 'admin', status: 'pending' }, { $set: { status: 'active' } });
    console.log('Updated pending admins to active:', adminResult);

    mongoose.connection.close();
})
.catch(err => console.error(err));
