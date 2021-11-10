import db from './db.js';

async function get(client, user_id) {
  // get only user document
  const stage_1 = { $match: { _id: user_id } };

  // unwind solved quotes as seperate documents
  const stage_2 = { $unwind: { path: '$solved' } };

  // lookup quote data from all_quotes view, join by link
  const stage_3 = {
    $lookup: {
      from: 'all_quotes',
      localField: 'solved.link',
      foreignField: 'link',
      as: 'quote',
    },
  };

  // add when quote was solved and mark to quote data
  const stage_4 = {
    $addFields: {
      'quote.timestamp': { $toDate: '$solved.date' },
      'quote.mark': 'quote',
    },
  };

  // after lookup. quote data is in array, unwind it
  const stage_5 = { $unwind: { path: '$quote' } };

  // pull out quote data as document root
  const stage_6 = { $replaceRoot: { newRoot: '$quote' } };

  // add a user uploaded quotes
  const stage_7 = {
    $unionWith: {
      coll: 'all_quotes',
      pipeline: [
        { $match: { _id: user_id } },
        { $project: { _id: 0 } },
        { $addFields: { mark: 'upload', timestamp: { $toDate: '$date' } } },
      ],
    },
  };

  // add a user registered card
  const stage_8 = {
    $unionWith: {
      coll: 'users',
      pipeline: [
        {
          $match: {
            _id: user_id,
          },
        },
        {
          $project: {
            timestamp: { $toDate: '$_id' },
            mark: 'user',
            email: 1,
            solved: { $size: '$solved' },
            uploaded: { $size: '$uploaded' },
          },
        },
      ],
    },
  };

  // finally, sort by timestamp
  const stage_9 = { $sort: { timestamp: -1 } };

  const pipeline = [];
  pipeline.push(
    stage_1,
    stage_2,
    stage_3,
    stage_4,
    stage_5,
    stage_6,
    stage_7,
    stage_8,
    stage_9
  );
  const result = await db.aggregate_users(client, pipeline);
  return result;
}

export default { get };
