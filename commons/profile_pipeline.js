import db from './db.js';

function get(client, user_id) {
    const pipeline = [];

    const stage_1 = { $match: { '_id': user_id } };

    const stage_2 = {
        $project: {
            username: 1, email: 1,
            timeline: [{ insert_date: '2017-05-24 22:41:09', content: 'joca', addition: null, link: null, mark: 'user' }],
            solved: { $size: '$solved' },
            uploaded: { $size: '$uploaded' }
        }
    };

    pipeline.push(stage_1, stage_2);
    return db.aggregate(client, pipeline);
}

export default { get };