// reference to create views in mongodb atlas

async function create_all_quotes_view(client) {

  // project only 'uploaded' field from the db
  const stage_1 = { '$project': { 'uploaded': 1 } };

  // simple unwind of uploaded quotes array to seperate quote documents
  const stage_2 = { '$unwind': { 'path': '$uploaded' } };

  // add detached '_id' field inside the quotes object
  const stage_3 = { '$addFields': { 'uploaded._id': '$_id' } };

  // replace 'uploaded' root with only quote objects
  const stage_4 = { '$replaceRoot': { 'newRoot': '$uploaded' } }

  const pipeline = [];
  pipeline.push(stage_1, stage_2, stage_3, stage_4);
  const query_result = await client.db('quotes').createCollection('all_quotes', { viewOn: 'users', pipeline: pipeline });
  console.log(query_result);
}

export default { create_all_quotes_view };