import express from 'express';
import pipeline from './commons/pipeline.js';
import db from './commons/db.js';
import dateFormat from 'dateformat';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import cookieSession from "cookie-session";
import { v4 as uuidv4 } from 'uuid';
import Firestore from '@google-cloud/firestore';
import mongodb from 'mongodb';

// setup node express
const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

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
}
if (process.env.NODE_ENV === 'prod') {
  setupEnv = setupEnvProd;
}

setupEnv().then(() => {

  // setup mongodb
  const { MongoClient } = mongodb;
  const client = new MongoClient(mongodb_uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
  });

  // setup passport
  passport.use(new GoogleStrategy({
    clientID: google_client_id,
    clientSecret: google_client_secret,
    callbackURL: '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    const username = profile.displayName;
    let pipeline = [{ $match: { 'email': email } }, { $project: { 'username': 1, 'email': 1 } }];
    const user = await db.aggregate(client, pipeline);
    if (user) {
      console.log('User already known: ' + user.email);
      done(null, user);
    } else {
      pipeline = [{ $sort: { _id: -1 } }, { $project: { 'username': 1, 'email': 1 } }, { $limit: 1 }];
      const id_result = await db.aggregate(client, pipeline);
      const next_id = id_result._id + 1;
      const new_user = { _id: next_id, 'username': username, 'email': email };
      const new_id = await insert(client, new_user);
      console.log('New user created: ' + new_user.email + ' with id: ' + new_id);
      done(null, new_user);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    let pipeline = [{ $match: { '_id': id } }, { $project: { 'username': 1, 'email': 1 } }];
    const user = await db.aggregate(client, pipeline);
    done(null, user);
  });

  app.use(cookieSession({
    // milliseconds of a day
    maxAge: 24 * 60 * 60 * 1000,
    keys: session_key
  }));

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

  app.get('/profile', (req, res) => {
    res.sendFile('public/profile.html', { root: '.' });
  });

  app.get('/api/quote', async (req, res) => {

    const quote = await pipeline.getQuote(client, req);

    if (quote == '') {
      console.log(error_message);
      res.send({ error: error_message });
    }

    console.log('Requested quote id: ' + quote.quote.link);
    res.send(quote);
  });

  app.get('/api/profile', async (req, res) => {
    const result = await pipeline.getProfile(client, req);
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

  app.post('/api/login', function (req, res) {
    res.send({ error: 'not implemented' });
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