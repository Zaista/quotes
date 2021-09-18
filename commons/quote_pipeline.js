import db from './db.js';

function get(client, user_id, quote_link) {
    let pipeline = [];

    if (quote_link) {
        // match a document that contains the requested quote
        const stage1 = {
            '$match': {
                'uploaded.link': quote_link
            }
        };

        // filter out only the the requested quote
        const stage2 = {
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
        };

        // unwind the quote from the resto of the document
        const stage3 = {
            '$unwind': {
                'path': '$quote'
            }
        };

        pipeline.push(stage1, stage2, stage3);
    } else {

        // project only quotes from the documents
        const stage1 = {
            '$project': {
                'quote': '$uploaded',
                '_id': 0
            }
        };

        // unwind each quote in seperate document
        const stage2 = {
            '$unwind': '$quote'
        };

        pipeline.push(stage1, stage2);

        // unmatch user id document if logged in
        if (user_id) {
            const stage0 = { '$match': { '_id': { '$ne': user_id } } };
            pipeline.unshift(stage0);
        }

        // TODO filter out solved quotes
    }

    return db.aggregate(client, pipeline);
}

function solve(client, user_id, quote_link) {
    const query = { '_id': user_id }
    const pipeline = { $push: { 'solved': { 'date': new Date(Date.now()), 'link': quote_link } } };
    return db.update(client, query, pipeline);
}

function submit(client, user_id, quote) {
    const query = { '_id': user_id }
    const pipeline = { $push: { 'uploaded': quote } };
    return db.update(client, query, pipeline);
}

export default { get, solve, submit };