import db from './db.js';

function getQuote(client, req) {
    let pipeline;
    let error_message;

    if (req.query.quote) {
      // TODO fix quote links
      let id = req.query.quote;
      if (!isNaN(id)) {
        id = parseInt(id);
      }
      pipeline = [
        {
          '$match': {
            'timeline.mark': 'upload',
            'timeline.link': id
          }
        }, {
          '$project': {
            '_id': 0,
            'quote': {
              '$filter': {
                'input': '$timeline',
                'as': 'quote',
                'cond': {
                  '$and': [
                    {
                      '$eq': [
                        '$$quote.mark', 'upload'
                      ]
                    }, {
                      '$eq': [
                        '$$quote.link', id
                      ]
                    }
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
      error_message = 'No quote with this id.';
    } else {
      pipeline = [
        {
          '$project': {
            'quote': '$uploaded',
            '_id': 0
          }
        }, {
          '$unwind':  '$quote'
        }
      ];
      // TODO unmatch solved quotes
      // if (req.user) {
      //   own_quotes = { '$match': { '_id': { '$ne': req.user._id } } };
      //   pipeline.unshift(own_quotes);
      // }
      error_message = 'Empty result returned from MongoDB.';
    }

    return db.aggregate(client, pipeline);
}

function getProfile(client, req) {
    let pipeline = [
      { $match: { '_id': req.user._id } },
      {
        $project: {
          username: 1, email: 1, timeline: 1,
          solved: { $size: { $filter: { input: '$timeline', as: 'line', cond: { $eq: ['$$line.mark', 'quote'] } } } },
          uploaded: { $size: { $filter: { input: '$timeline', as: 'line', cond: { $eq: ['$$line.mark', 'upload'] } } } }
        }
      }];
    return db.aggregate(client, pipeline);
}

export default { getQuote, getProfile };