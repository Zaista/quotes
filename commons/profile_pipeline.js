import db from './db.js';

function get(client, user_id) {

    // TODO no more timeline
    // let pipeline = [
    //     { $match: { '_id': user_id } },
    //     {
    //         $project: {
    //             username: 1, email: 1, timeline: 1,
    //             solved: { $size: { $filter: { input: '$timeline', as: 'line', cond: { $eq: ['$$line.mark', 'quote'] } } } },
    //             uploaded: { $size: { $filter: { input: '$timeline', as: 'line', cond: { $eq: ['$$line.mark', 'upload'] } } } }
    //         }
    //     }];
    // return db.aggregate(client, pipeline);
}

export default { get };