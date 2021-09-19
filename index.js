import express from 'express';
import quote_pipeline from './commons/quote_pipeline.js';
import profile_pipeline from './commons/profile_pipeline.js';
import user_pipeline from './commons/user_pipeline.js';
import dateFormat from 'dateformat';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import session from 'express-session';
import Strategy from 'passport-local';
import { v4 as uuidv4 } from 'uuid';
import Firestore from '@google-cloud/firestore';
import mongodb from 'mongodb';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// TODO nodemailer, less, eslint, morgan, 

const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(cookieParser());

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  await setupEnv();
}

app.use(session({ secret: process.env.SESSION, resave: false, saveUninitialized: false }));

const { MongoClient } = mongodb;
const client = new MongoClient(process.env.MONGODB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
client.connect();

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  const user = { email: profile.emails[0].value, username: profile.displayName }
  const db_user = await user_pipeline.get(client, user);
  if (db_user) {
    console.log('User already known: ' + db_user.email);
    done(null, db_user);
  } else {
    const new_id = await user_pipeline.insert(client, user);
    console.log('New user created: ' + user.email + ' with id: ' + new_id);
    done(null, user);
  }
}));

passport.use(new Strategy(async function (username, password, done) {
  const user = await user_pipeline.get(client, { 'username': username, 'password': password });
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
  const user = await user_pipeline.get(client, { _id: new mongodb.ObjectId(_id) });
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Environment variable: ${process.env.NODE_ENV}`);
  console.log(`Server app listening at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.sendFile('public/quotes.html', { root: '.' });
});

app.get('/api/quote', async (req, res) => {

  const quote = await quote_pipeline.get(client, req.user?._id, req.query.quote);

  if (quote == null) {
    return res.send({ error: 'Database connection error.' });
  }

  console.log('Requested quote id: ' + quote.link);
  res.send(quote);
});

app.get('/api/solution', async (req, res) => {
  if (!req.user) return res.status(401).send({ error: 'Not authorized.' })
  const result = await quote_pipeline.solve(client, req.user._id, req.query.quote);
  // TODO add check for valid quote_link
  if (result) return res.send({ success: 'Quote solved.' });
  else return res.send({ error: 'Something went wrong.' })
});

app.get('/profile', (req, res) => {
  res.sendFile('public/profile.html', { root: '.' });
});

app.get('/api/profile', async (req, res) => {
  if (!req.user) return res.send({ error: 'Not logged in.' })
  const result = await profile_pipeline.get(client, req.user._id);
  res.send(result);
});

app.post('/api/submit', async (req, res) => {
  const date_now = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
  const quote = { 'date': date_now, 'quote': req.body.quote, 'author': req.body.author, 'link': uuidv4() };
  let user_id = null; // TODO check this path
  if (req.user) {
    user_id = new mongodb.ObjectId(req.user._id);
  }
  const result = await quote_pipeline.submit(client, user_id, quote);
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
});

app.get('/api/version', (req, res) => {
  res.send({ version: `${process.env.npm_package_version}` })
});


async function setupEnv() {
  const firestore = new Firestore({ projectId: 'deductive-span-313911' });
  const env = await firestore.collection('data').doc('env').get();
  process.env.MONGODB = env.data().mongodb_uri;
  process.env.SESSION = env.data().session_key;
  process.env.CLIENT_ID = env.data().google_client_id;
  process.env.CLIENT_SECRET = env.data().google_client_secret;
}