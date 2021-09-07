import db from './db.js';

function get_quote(client, user_id, quote_link) {
    let pipeline;

    if (quote_link) {
        pipeline = [
            {
                '$match': {
                    'uploaded.link': quote_link
                }
            }, {
                '$project': {
                    '_id': 0,
                    'quote': {
                        '$filter': {
                            'input': '$uploaded',
                            'as': 'quote',
                            'cond': {
                                '$eq': [
                                    '$$quote.link', quote_link
                                ]
                            }
                        }
                    }
                }
            }, {
                '$unwind': {
                    'path': '$quote'
                }
            }
        ];
    } else {
        pipeline = [
            {
                '$project': {
                    'quote': '$uploaded',
                    '_id': 0
                }
            }, {
                '$unwind': '$quote'
            }
        ];
        if (user_id) {
          let own_quotes = { '$match': { '_id': { '$ne': user_id } } };
          pipeline.unshift(own_quotes);
        }
        // TODO filter out solved quotes
    }

    return db.aggregate(client, pipeline);
}

function get_profile(client, user_id) {

    // TODO no more timeline
    let pipeline = [
        { $match: { '_id': user_id } },
        {
            $project: {
                username: 1, email: 1, timeline: 1,
                solved: { $size: { $filter: { input: '$timeline', as: 'line', cond: { $eq: ['$$line.mark', 'quote'] } } } },
                uploaded: { $size: { $filter: { input: '$timeline', as: 'line', cond: { $eq: ['$$line.mark', 'upload'] } } } }
            }
        }];
    return db.aggregate(client, pipeline);
}

function solve_quote(client, user_id, quote_link) {
    const query = { '_id': user_id }
    const pipeline = { $push: { 'solved': quote_link } };
    return db.update(client, query, pipeline);
}

export default { get_quote, get_profile, solve_quote };