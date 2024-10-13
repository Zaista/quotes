import db from './db.js';

async function get(client, user) {
  let pipeline = [];

  let stage_1;
  if (user.email) {
    // google or local login
    stage_1 = { $match: { email: user.email } };
  } else if (user._id) {
    // session check
    stage_1 = { $match: { _id: user._id } };
  }

  const stage_2 = { $project: { username: 1, email: 1, password: 1 } };

  pipeline.push(stage_1, stage_2);
  const result = await db.aggregate_users(client, pipeline);
  return result[0];
}

async function insert(client, user) {
  return await db.insert(client, user);
}

export default { get, insert };
