import db from './db.js';

function get(client, user_id) {
    const pipeline = [];

    // get only user document
    const stage_1 = { $match: { '_id': user_id } };

    // unwind solved quotes as seperate documents
    const stage_2 = { $unwind: { path: '$solved' } };

    // lookup quote data from all_quotes view, join by link
    const stage_3 = { $lookup: { from: 'all_quotes', localField: 'solved.link', foreignField: 'link', as: 'quote' } };

    // add when quote was solved and mark to quote data
    const stage_4 = { $addFields: { 'quote.solved': '$solved.date', 'quote.mark': 'quote' } };

    // after lookup. quote data is in array, unwind it
    const stage_5 = { $unwind: { path: '$quote' } };

    // pull out quote data as document root
    const stage_6 = { $replaceRoot: { newRoot: '$quote' } };

    // // finally, sort by solved date
    // const stage_7 = { $sort: { solved: 1 } };

    pipeline.push(stage_1, stage_2, stage_3, stage_4, stage_5, stage_6);
    return db.aggregate_users(client, pipeline);
}

export default { get };