async function aggregate_users(client, pipeline) {
    try {
        const result = await client.db('quotes').collection('users').aggregate(pipeline).toArray();
        return result;
    } catch (err) {
        console.log('ERROR: ' + err.stack);
        return null;
    }
}

async function aggregate_quotes(client, pipeline) {
    try {
        const result = await client.db('quotes').collection('all_quotes').aggregate(pipeline).toArray();
        return result[0];
    } catch (err) {
        console.log('ERROR: ' + err.stack);
        return null;
    }
}

async function insert(client, document) {
    try {
        const query_result = await client.db('quotes').collection('users').insertOne(document);
        return query_result.insertedId;
    } catch (err) {
        console.log('ERROR: ' + err.stack);
        return null;
    }
}

async function update(client, query, pipeline) {
    try {
        const query_result = await client.db('quotes').collection('users').updateOne(query, pipeline);
        return query_result.result.nModified;
    } catch (err) {
        console.log('ERROR: ' + err.stack);
        return null;
    }
}

export default { aggregate_users, aggregate_quotes, insert, update };