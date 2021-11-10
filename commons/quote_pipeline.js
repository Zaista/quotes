import db from './db.js';

async function get(client, user_id, quote_link) {
  let pipeline = [];

  if (quote_link) {
    const stage_1 = { $match: { link: quote_link } };
    pipeline.push(stage_1);
  } else {
    const stage_1 = { $sample: { size: 1 } };
    pipeline.push(stage_1);

    if (user_id) {
      const stage_0 = { $match: { _id: { $ne: user_id } } };
      pipeline.unshift(stage_0);
    }

    // TODO filter out solved quotes
  }

  const result = await db.aggregate_quotes(client, pipeline);
  return result;
}

async function solve(client, user_id, quote_link) {
  const query = { _id: user_id };
  const pipeline = {
    $push: { solved: { date: new Date(Date.now()), link: quote_link } },
  };
  const result = await db.update(client, query, pipeline);
  return result;
}

async function submit(client, user_id, quote) {
  const query = { _id: user_id };
  const pipeline = { $push: { uploaded: quote } };
  const result = await db.update(client, query, pipeline);
  return result;
}

export default { get, solve, submit };
