import db from './db.js';

function get(client, user_id, quote_link) {
    let pipeline = [];

    if (quote_link) {

        const stage_1 = { '$match': { link: quote_link } };
        pipeline.push(stage_1);

    } else {

        const stage_1 = { $sample: { size: 1 } };
        pipeline.push(stage_1);

        if (user_id) {
            const stage_0 = { '$match': { '_id': { '$ne': user_id } } };
            pipeline.unshift(stage_0);
        }

        // TODO filter out solved quotes
    }

    return db.aggregate_quotes(client, pipeline);
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