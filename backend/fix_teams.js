const mongoose = require('mongoose');
const TeamMember = require('./models/teamMember.model');
require('dotenv').config({path: './.env'});

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    const result = await TeamMember.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
    console.log('Updated existing team members to active:', result);
    
    const nullResult = await TeamMember.updateMany({ status: null }, { $set: { status: 'active' } });
    console.log('Updated null team members to active:', nullResult);

    const pendingAdmins = await TeamMember.updateMany({ role: 'admin', status: 'pending' }, { $set: { status: 'active' } });
    console.log('Updated pending admins to active:', pendingAdmins);

    mongoose.connection.close();
})
.catch(err => console.error(err));
