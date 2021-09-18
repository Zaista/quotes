import db from './db.js';

function get(client, user) {
    let pipeline = [];

    let stage_1;
    if (user.password) {
        // local login
        stage_1 = { $match: user };
    } else if (user.email) {
        // google login
        stage_1 = { $match: { 'email': user.email } };
    } else if (user._id) {
        // session check
        stage_1 = { $match: { '_id': user._id } };
    }

    // project only username and email
    const stage_2 = { $project: { 'username': 1, 'email': 1 } };

    pipeline.push(stage_1, stage_2);
    return db.aggregate(client, pipeline);
}

function insert(client, user) {
    return db.insert(client, user);
}

export default { get, insert };