import express from 'express';
import pipeline from './commons/pipeline.js';
import db from './commons/db.js';
import dateFormat from 'dateformat';
import passport from 'passport';
// import GoogleStrategy from 'passport-google-oauth20';
// import cookieSession from 'cookie-session';
import session from 'express-session';
import Strategy from 'passport-local';
import { v4 as uuidv4 } from 'uuid';
import Firestore from '@google-cloud/firestore';
import mongodb from 'mongodb';
import cookieParser from 'cookie-parser';

// setup node express
const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(cookieParser());

// setup environment variables
const firestore = new Firestore({
  projectId: 'deductive-span-313911',
  keyFilename: 'private/credentials.json',
});

let mongodb_uri;
let session_key;
let google_client_id;
let google_client_secret;
let setupEnv;

if (process.env.NODE_ENV === 'dev') {
  setupEnv = setupEnvDev;
} else if (process.env.NODE_ENV === 'production') {
  setupEnv = setupEnvProd;
} else {
  console.log('NODE_ENV variable not defined, stopping the app.')
  process.exit(1);
}


setupEnv().then(() => {

  app.use(session({ secret: session_key, resave: false, saveUninitialized: false }));

  // setup mongodb
  const { MongoClient } = mongodb;
  const client = new MongoClient(mongodb_uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  client.connect();

  // setup passport
  // passport.use(new GoogleStrategy({
  //   clientID: google_client_id,
  //   clientSecret: google_client_secret,
  //   callbackURL: '/auth/google/callback'
  // }, async (accessToken, refreshToken, profile, done) => {
  //   console.log('here');
  //   const email = profile.emails[0].value;
  //   const username = profile.displayName;
  //   let pipeline = [{ $match: { 'email': email } }, { $project: { 'username': 1, 'email': 1 } }];
  //   const user = await db.aggregate(client, pipeline);
  //   if (user) {
  //     console.log('User already known: ' + user.email);
  //     done(null, user);
  //   } else {
  //     pipeline = [{ $sort: { _id: -1 } }, { $project: { 'username': 1, 'email': 1 } }, { $limit: 1 }];
  //     const id_result = await db.aggregate(client, pipeline);
  //     const next_id = id_result._id + 1;
  //     const new_user = { _id: next_id, 'username': username, 'email': email };
  //     const new_id = await insert(client, new_user);
  //     console.log('New user created: ' + new_user.email + ' with id: ' + new_id);
  //     done(null, new_user);
  //   }
  // }));

  passport.use(new Strategy(async function (username, password, done) {
    let pipeline = [{ $match: { 'username': username, 'password': password } }, { $project: { 'username': 1, 'email': 1 } }];
    const user = await db.aggregate(client, pipeline);
    if (user) {
      return done(null, user);
    } else {
      return done(null, false, { message: 'Something went wrong.' });
    }
  }
  ));

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(async function (_id, done) {
    let pipeline = [{ $match: { '_id': _id } }, { $project: { 'username': 1, 'email': 1 } }];
    const user = await db.aggregate(client, pipeline);
    done(null, user);
  });

  // app.use(cookieParser);

  // app.use(cookieSession({
  //   // milliseconds of a day
  //   maxAge: 24 * 60 * 60 * 1000,
  //   keys: session_key
  // }));

  // app.use(session({ secret: session_key, resave: false, saveUninitialized: false, cookie: { maxAge: 60 * 60 * 24 * 1000, secure: false } }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Listen to the App Engine-specified port, or 8080 otherwise
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log('Environment variable: ' + process.env.NODE_ENV)
    console.log(`Server app listening at http://localhost:${PORT}`);
  });

  app.get('/', (req, res) => {
    res.sendFile('public/quotes.html', { root: '.' });
  });

  app.get('/api/quote', async (req, res) => {

    const quote = await pipeline.get_quote(client, req.user?._id, req.query.quote);

    if (quote == '') {
      console.log(error_message);
      res.send({ error: error_message });
    }

    console.log('Requested quote id: ' + quote.quote.link);
    res.send(quote);
  });

  app.get('/api/solution', async (req, res) => {
    if (!req.user) return res.status(401).send({ error: 'Not authorized.' })
    const result = await pipeline.solve_quote(client, req.user._id, req.query.quote);
    // TODO add check for valid quote_link
    if (result) return res.send({ success: 'Quote solved.' });
    else return res.send({ error: 'Something went wrong.' })
  });

  app.get('/profile', (req, res) => {
    res.sendFile('public/profile.html', { root: '.' });
  });

  app.get('/api/profile', async (req, res) => {
    if (!req.user) return res.send({ error: 'Not logged in.' })
    const result = await pipeline.get_profile(client, req.user._id);
    res.send(result);
  });

  app.post('/api/submit', async (req, res) => {
    var date_now = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
    let quote = { 'insert_date': date_now, 'content': req.body.quote, 'addition': req.body.author, 'link': uuidv4(), 'mark': 'upload' };
    let user_id = 1;
    if (req.user) {
      user_id = req.user._id;
    }
    const result = await db.update(client, user_id, quote);
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
      console.log('Session esablished')
      res.send(req.user);
    } else {
      console.log('No session')
      res.send({ error: 'unauthorized' });
    }
  });

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
    console.log('User \'' + req.user.email + '\' logged in.');
    res.redirect('/');
  });

  app.post('/api/login', passport.authenticate('local'), function (req, res) {
    if (!req.user) { return res.redirect('/login'); }
    res.send({ 'login': 'success' });
  });

  app.get('/api/logout', async (req, res) => {
    console.log('User \'' + req.user.email + '\' logged out.');
    req.logout();
    res.redirect('/');
    // TODO not working
  });
});


async function setupEnvProd() {
  const env = await firestore.collection('data').doc('env').get();
  mongodb_uri = env.data().mongodb_uri;
  session_key = env.data().session_key;
  google_client_id = env.data().google_client_id;
  google_client_secret = env.data().google_client_secret;
}

async function setupEnvDev() {
  mongodb_uri = 'mongodb://localhost:27017';
  session_key = 'local_session_key'
  google_client_id = 'n/a';
  google_client_secret = 'n/a';
}