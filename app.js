import express from 'express';
import dotenv from 'dotenv';
import {SecretManagerServiceClient} from '@google-cloud/secret-manager';
import quote_pipeline from './commons/quote_pipeline.js';
import profile_pipeline from './commons/profile_pipeline.js';
import user_pipeline from './commons/user_pipeline.js';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import GoogleStrategy from 'passport-google-oauth20';
import session from 'cookie-session';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import mongodb from 'mongodb';
import dateFormat from 'dateformat';
import bcrypt from 'bcrypt';

// TODO nodemailer, less, eslint, morgan,

const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());
app.enable('trust proxy');

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  await setupEnv();
}

app.use(
  session({
    secret: process.env.sessionKey,
    resave: false,
    saveUninitialized: false,
  })
);

// register regenerate & save after the cookieSession middleware initialization
// TODO remove after https://github.com/jaredhanson/passport/issues/904 is fixed
app.use(function(request, response, next) {
    if (request.session && !request.session.regenerate) {
        request.session.regenerate = (cb) => {
            cb()
        }
    }
    if (request.session && !request.session.save) {
        request.session.save = (cb) => {
            cb()
        }
    }
    next()
})

const { MongoClient } = mongodb;
const client = new MongoClient(process.env.mongodbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.clientId,
      clientSecret: process.env.clientSecret,
      callbackURL: '/auth/google/callback',
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      const user = { email: profile.emails[0].value, solved: [], uploaded: [] };
      let db_user = await user_pipeline.get(client, user);
      if (db_user) {
        console.log('User already known: ' + db_user.email);
        done(null, db_user);
      } else {
        const new_id = await user_pipeline.insert(client, user);
        console.log('New user created: ' + user.email + ' with id: ' + new_id);
        done(null, user);
      }
    }
  )
);

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async function (
    email,
    password,
    done
  ) {
    let user = await user_pipeline.get(client, { email: email });
    if (user) {
      const correctPassword = await bcrypt.compare(password, user.password);
      if (correctPassword) return done(null, user);
    }
    return done(null, false);
  })
);

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(async function (_id, done) {
  const user = await user_pipeline.get(client, {
    _id: new mongodb.ObjectId(_id),
  });
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
  const quote = await quote_pipeline.get(
    client,
    req.user?._id,
    req.query.quote
  );

  if (!quote) return res.send({ error: 'Database connection error.' });

  console.log('Requested quote id: ' + quote.link);
  return res.send(quote);
});

app.get('/api/solution', async (req, res) => {
  if (!req.user) return res.status(401).send({ error: 'Unauthorized.' });
  const result = await quote_pipeline.solve(
    client,
    req.user._id,
    req.query.quote
  );
  // TODO add check for valid quote_link
  if (result) return res.send({ success: 'Quote solved.' });
  else return res.send({ error: 'Something went wrong.' });
});

app.get('/profile', (req, res) => {
  res.sendFile('public/profile.html', { root: '.' });
});

app.get('/api/profile', async (req, res) => {
  if (!req.user) return res.send({ error: 'Not logged in.' });
  const result = await profile_pipeline.get(client, req.user._id);
  res.send(result);
});

app.post('/api/submit', async (req, res) => {
  const date_now = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
  const quote = {
    date: date_now,
    quote: req.body.quote,
    author: req.body.author,
    link: uuidv4(),
  };
  let user_id = null; // TODO check this path
  if (req.user) {
    user_id = new mongodb.ObjectId(req.user._id);
  }
  const result = await quote_pipeline.submit(client, user_id, quote);
  if (result) {
    console.log('Quote submited');
    res.send({ result: 'success' });
  } else {
    console.log('Error submitting quote');
    res.send({ error: 'something went wrong' });
  }
});

app.post('/api/register', async (req, res) => {
  let user = await user_pipeline.get(client, { email: req.body.email });
  if (user) {
    res.send({ error: 'Email already in use.' });
  } else {
    const hash = await bcrypt.hash(req.body.password, 10);
    user = { email: req.body.email, password: hash, solved: [], uploaded: [] };
    const new_id = await user_pipeline.insert(client, user);
    console.log('New user created: ' + user.email + ' with id: ' + new_id);
    req.login(user, function (err) {
      if (err) {
        return next(err);
      }
      res.send({ success: 'Email registered.' });
    });
  }
});

app.get('/api/status', (req, res) => {
  if (req.user) {
    console.log('Session esablished');
    res.send(req.user);
  } else {
    console.log('No session');
    res.send({ error: 'unauthorized' });
  }
});

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', failureMessage: true }),
  (req, res) => {
    console.log("User '" + req.user.email + "' logged in.");
    res.redirect('/');
  }
);

app.post('/api/login', passport.authenticate('local'), function (req, res) {
  res.send({ login: 'success' });
});

app.get('/api/logout', async (req, res) => {
  if (req.user) {
    console.log("User '" + req.user.email + "' logged out.");
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  }
  res.redirect('/');
});

app.get('/api/version', (req, res) => {
  res.send({ version: `${process.env.npm_package_version}` });
});

async function setupEnv() {
  let projectId = 'deductive-span-313911';
  const client = new SecretManagerServiceClient();

  const [mongoSecret] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/mongodb-uri/versions/latest`,
  });
  let responsePayload = mongoSecret.payload.data.toString();
  process.env.mongodbUri = responsePayload;

  const [sessionSecret] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/session-cookie-key/versions/latest`,
  });
  responsePayload = sessionSecret.payload.data.toString();
  process.env.sessionKey = responsePayload;

  const [googleClientSecret] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/google-client-secret/versions/latest`,
  });
  responsePayload = googleClientSecret.payload.data.toString();
  process.env.clientSecret = responsePayload;

  const [googleClientIdSecret] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/google-client-id/versions/latest`,
  });
  responsePayload = googleClientIdSecret.payload.data.toString();
  process.env.clientId = responsePayload;
}
