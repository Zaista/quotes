import express from 'express';
import dotenv from 'dotenv';
import session from 'cookie-session';
import {getLogger} from "./utils/logger.js";
import {configureSessionRouter} from "./routers/sessionRouter.js";
import {configureQuotesRouter} from "./routers/quotesRouter.js";
import {configureProfileRouter} from "./routers/profileRouter.js";

// TODO nodemailer, less, eslint,

const log = getLogger('app');
const app = express();
app.use(express.static('./public', {redirect: false}));
app.use(express.json());
app.use(express.urlencoded({extended: true, limit: '20mb'})); // for parsing application/x-www-form-urlencoded
app.enable('trust proxy');

if (process.env.NODE_ENV !== 'production') {
  log.info('Loading local environment variables')
  dotenv.config();
}

app.use(
  session({
    secret: process.env.sessionKey,
    resave: false,
    saveUninitialized: false,
  })
);

const sessionRouter = express.Router();
configureSessionRouter(sessionRouter);

const quotesRouter = express.Router();
configureQuotesRouter(quotesRouter);

const profileRouter = express.Router();
configureProfileRouter(profileRouter);

app.use('/', [sessionRouter, quotesRouter, profileRouter]);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  log.info(`Server app listening at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.sendFile('public/quotes.html', {root: '.'});
});

app.get('/api/version', (req, res) => {
  res.send({version: `${process.env.npm_package_version}`});
});
