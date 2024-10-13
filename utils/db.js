import {getLogger} from "./logger.js";
import mongodb from "mongodb";

const log = getLogger('database');
const {MongoClient} = mongodb;
let client;

process.on('SIGINT', async () => {
  log.info('Closing MongoDB connections');
  if (client !== undefined) {
    await client.close();
  }
  process.exit(0);
});

async function getClient() {
  if (client === undefined || !client.topology || !client.topology.isConnected()) {
    client = new MongoClient(process.env.mongodbUri);
    try {
      await client.connect();
      log.info('Connection to database established');
    } catch (error) {
      log.info('Database connection issues', error);
      await client.close();
    }
  }
  return client.db('quotes')
}

async function aggregate_users(pipeline) {
  try {
    const client = await getClient();
    return await client
      .collection('users')
      .aggregate(pipeline)
      .toArray();
  } catch (err) {
    log.error('aggregate_users', err);
    return null;
  }
}

async function aggregate_quotes(pipeline) {
  try {
    const client = await getClient();
    const result = await client
      .collection('all_quotes')
      .aggregate(pipeline)
      .toArray();
    return result[0];
  } catch (err) {
    log.error('aggregate_quotes', err);
    return null;
  }
}

async function insert(document) {
  try {
    const client = await getClient();
    const query_result = await client
      .collection('users')
      .insertOne(document);
    return query_result.insertedId;
  } catch (err) {
    log.error('insert', err);
    return null;
  }
}

async function update(query, pipeline) {
  try {
    const client = await getClient();
    return await client
      .collection('users')
      .updateOne(query, pipeline);
  } catch (err) {
    log.error('update', err);
    return null;
  }
}

export default { aggregate_users, aggregate_quotes, insert, update };
