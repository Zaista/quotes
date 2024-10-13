import db from './db.js';

async function get(user_id, quote_link) {
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

    // TODO add more functions that will, ie, filter out solved quotes
  }

  return await db.aggregate_quotes(pipeline);
}

async function solve(user_id, quote_link) {
  const query = { _id: user_id };
  const pipeline = {
    $push: { solved: { date: new Date(Date.now()), link: quote_link } },
  };
  // TODO check if quote was already solved before
  return await db.update(query, pipeline);
}

async function submit(user_id, quote) {
  const query = { _id: user_id };
  const pipeline = { $push: { uploaded: quote } };
  return await db.update(query, pipeline);
}

export default { get, solve, submit };
