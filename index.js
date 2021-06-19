const express = require('express');
var dateFormat = require('dateformat');
const app = express()

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
const { MongoClient } = require('mongodb');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./private/config.js');
const cookieSession = require("cookie-session");
const { v4: uuidv4 } = require('uuid');

passport.use(new GoogleStrategy({
  clientID: config.google.clientID,
  clientSecret: config.google.clientSecret,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  const username = profile.displayName;
  let pipeline = [{ $match: { 'email': email } }, { $project: { 'username': 1, 'email': 1 } }];
  const user = await aggregate(pipeline);
  if (user) {
    console.log('User already known: ' + user.email);
    done(null, user);
  } else {
    pipeline = [{ $sort: { _id: -1 } }, { $project: { 'username': 1, 'email': 1 } }, { $limit: 1 }];
    const id_result = await aggregate(pipeline);
    const next_id = id_result._id + 1;
    const new_user = { _id: next_id, 'username': username, 'email': email };
    const new_id = await insert(new_user);
    console.log('New user created: ' + new_user.email + ' with id: ' + new_id);
    done(null, new_user);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  let pipeline = [{ $match: { '_id': id } }, { $project: { 'username': 1, 'email': 1 } }];
  const user = await aggregate(pipeline);
  done(null, user);
});

async function aggregate(pipeline) {
  try {
    await client.connect();
    const query_result = await client.db('quotes').collection('users').aggregate(pipeline).toArray();
    return query_result[0];
  } catch (err) {
    console.log('ERROR: ' + err.stack);
    return null;
  }
}

async function insert(document) {
  try {
    await client.connect();
    const query_result = await client.db('quotes').collection('users').insertOne(document);
    return query_result.insertedId;
  } catch (err) {
    console.log('ERROR: ' + err.stack);
    return null;
  }
}

async function update(user, quote) {
  try {
    await client.connect();
    const query_result = await client.db('quotes').collection('users').update({ '_id': user }, { $push: { 'timeline': quote } });
    return query_result.result.nModified;
  } catch (err) {
    console.log('ERROR: ' + err.stack);
    return null;
  }
}

app.use(cookieSession({
  // milliseconds of a day
  maxAge: 24 * 60 * 60 * 1000,
  keys: [config.session.cookieKey]
}));

app.use(passport.initialize());
app.use(passport.session());

const client = new MongoClient(config.mongodb.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server app listening at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/quotes.html');
});

app.get('/profile', (req, res) => {
  res.sendFile(__dirname + '/public/profile.html');
});

app.get('/api/quote', async (req, res) => {
  let pipeline;
  let error_message;
  
  if (req.query.quote) {
    // TODO fix quote links
    let id = req.query.quote;
    if (!isNaN(id)) {
      id = parseInt(id);
      // TODO fix quotes from 1-13, 15-43 to uploaded from user 1
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
          '_id': 0,
          'quote': {
            '$filter': {
              'input': '$timeline',
              'as': 'item',
              'cond': { '$eq': ['$$item.mark', 'quote'] }
            }
          }
        }
      },
      { '$unwind': { 'path': '$quote' } },
      { '$sample': { 'size': 1 } }
    ];
    if (req.user) {
      own_quotes = { '$match': { '_id': { '$ne': req.user._id } } };
      pipeline.unshift(own_quotes);
    }
    error_message = 'Empty result returned from MongoDB.';
  }

  const quote = await aggregate(pipeline);

  if (quote == '') {
    console.log(error_message);
    res.send({ error: error_message });
  }

  console.log('Requested quote id: ' + quote.link);
  res.send(quote);
});

app.get('/api/profile', async (req, res) => {
  let pipeline = [
    { $match: { '_id': req.user._id } },
    {
      $project: {
        username: 1, email: 1, timeline: 1,
        solved: { $size: { $filter: { input: '$timeline', as: 'line', cond: { $eq: ['$$line.mark', 'quote'] } } } },
        uploaded: { $size: { $filter: { input: '$timeline', as: 'line', cond: { $eq: ['$$line.mark', 'upload'] } } } }
      }
    }];
  const result = await aggregate(pipeline);
  res.send(result);
});

app.post('/api/submit', async (req, res) => {
  var date_now = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
  let quote = { 'insert_date': date_now, 'content': req.body.quote, 'addition': req.body.author, 'link': uuidv4(), 'mark': 'upload' };
  let user_id = 1;
  if (req.user) {
    user_id = req.user._id;
  }
  const result = await update(user_id, quote);
  if (result) {
    console.log('Quote submited');
    res.send({ 'result': 'success' });
  } else {
    console.log('Error submitting quote');
    res.send({ 'error': 'something went wrong.' });
  }
});

app.get('/api/status', (req, res) => {
  if (req.user) {
    res.send(req.user);
  } else {
    res.send({ error: 'unauthorized' });
  }
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
  console.log('User \'' + req.user.email + '\' logged in.');
  res.redirect('/');
});

app.get('/api/login', function (req, res) {
  res.send({ error: 'not implemented' });
});

app.get('/api/logout', async (req, res) => {
  console.log('User \'' + req.user.email + '\' logged out.');
  req.logout();
  res.redirect('/');
  // TODO not working
});
