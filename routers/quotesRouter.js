import quote_pipeline from "../utils/quote_pipeline.js";
import {v4 as uuidv4} from "uuid";
import mongodb from "mongodb";
import dateFormat from 'dateformat';
import {getLogger} from "../utils/logger.js";

export function configureQuotesRouter(quotesRouter) {

  const log = getLogger('quotes');

  quotesRouter.get('/api/quote', async (req, res) => {
    const quote = await quote_pipeline.get(
      req.user?._id,
      req.query.quote
    );

    if (!quote) return res.send({ error: 'Invalid quote link' });

    log.info('Requested quote id: ' + quote.link);
    return res.send(quote);
  });

  quotesRouter.get('/api/solution', async (req, res) => {
    if (!req.user) return res.status(401).send({ error: 'Unauthorized' });
    if (!req.query.quote) return res.status(400).send({ error: 'Quote link mandatory' });
    const quote = await quote_pipeline.get(null, req.query.quote);
    if (quote === undefined) return res.status(400).send({ error: 'Unknown quote link' });
    const result = await quote_pipeline.solve(
      req.user._id,
      req.query.quote
    );
    if (result) return res.send({ success: 'Quote solved' });
    else {
      log.error('Error verifying solution', result)
      return res.send({ error: 'Something went wrong' });
    }
  });

  quotesRouter.post('/api/submit', async (req, res) => {
    const date_now = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
    const quote = {
      date: date_now,
      quote: req.body.quote,
      author: req.body.author,
      link: uuidv4(),
    };
    let user_id;
    if (req.user) {
      user_id = new mongodb.ObjectId(req.user._id);
    } else {
      return res.send({ error: 'User not logged in'})
    }
    const result = await quote_pipeline.submit(user_id, quote);
    if (result.acknowledged) {
      log.info('Quote submitted', quote);
      return res.send({ result: 'success', link: quote.link });
    } else {
      log.error('Error submitting quote', result);
      return res.send({ error: 'Something went wrong' });
    }
  });
}
