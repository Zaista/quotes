import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import user_pipeline from "../utils/user_pipeline.js";
import LocalStrategy from "passport-local";
import bcrypt from "bcrypt";
import mongodb from "mongodb";
import {getLogger} from "../utils/logger.js";

export function configureSessionRouter(sessionRouter, client) {

  const log = getLogger('session');

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
          log.info('User already known: ' + db_user.email);
          done(null, db_user);
        } else {
          const new_id = await user_pipeline.insert(client, user);
          log.info('New google user registered: ' + user.email + ' with id: ' + new_id);
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
    if (user === undefined) {
      done(null, null, { error: 'User not found' });
    } else {
      done(null, user);
    }
  });

  sessionRouter.use(passport.initialize());
  sessionRouter.use(passport.session());

  // register regenerate & save until passport v0.6 is fixed
  sessionRouter.use(function (request, response, next) {
    if (request.session && !request.session.regenerate) {
      request.session.regenerate = (cb) => {
        cb();
      };
    }
    if (request.session && !request.session.save) {
      request.session.save = (cb) => {
        cb();
      };
    }
    next();
  });

  sessionRouter.post('/api/register', async (req, res) => {
    let user = await user_pipeline.get(client, { email: req.body.email });
    if (user) {
      return res.status(409).send({ error: 'Email already in use.' });
    } else {
      const hash = await bcrypt.hash(req.body.password, 10);
      user = { email: req.body.email, password: hash, solved: [], uploaded: [] };
      const new_id = await user_pipeline.insert(client, user);
      log.info('New user registered: ' + user.email + ' with id: ' + new_id);
      req.login(user, function (err) {
        if (err) {
          return next(err);
        }
        return res.send({ success: 'Email registered.' });
      });
    }
  });

  sessionRouter.get('/api/status', (req, res) => {
    if (req.user) {
      log.info('Session established');
      res.send(req.user);
    } else {
      log.info('No session');
      res.send({ error: 'unauthorized' });
    }
  });

  sessionRouter.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  sessionRouter.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', failureMessage: true }),
    (req, res) => {
      log.info(`User '${req.user.email}' logged in.`);
      res.redirect('/');
    }
  );

  sessionRouter.post('/api/login', passport.authenticate('local'), function (req, res) {
    res.send({ login: 'success' });
  });

  sessionRouter.get('/api/logout', async (req, res) => {
    if (req.user) {
      log.info("User '" + req.user.email + "' logged out.");
      req.logout(function(err) {
        if (err) { return next(err); }
        return res.redirect('/');
      });
    } else {
      return res.redirect('/');
    }
  });
}
