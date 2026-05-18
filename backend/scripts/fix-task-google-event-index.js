const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const tasks = mongoose.connection.collection('tasks');

  const unsetResult = await tasks.updateMany(
    { googleEventId: null },
    { $unset: { googleEventId: '' } }
  );
  console.log(`Unset null googleEventId on ${unsetResult.modifiedCount} task(s).`);

  const indexes = await tasks.indexes();
  const oldIndex = indexes.find(index => (
    index.key &&
    index.key.user_id === 1 &&
    index.key.googleEventId === 1 &&
    !index.partialFilterExpression
  ));

  if (oldIndex) {
    await tasks.dropIndex(oldIndex.name);
    console.log(`Dropped old index ${oldIndex.name}.`);
  } else {
    console.log('No old googleEventId index found.');
  }

  await tasks.createIndex(
    { user_id: 1, googleEventId: 1 },
    {
      unique: true,
      name: 'user_id_1_googleEventId_1',
      partialFilterExpression: { googleEventId: { $type: 'string' } }
    }
  );
  console.log('Created partial unique googleEventId index.');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
