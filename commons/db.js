async function aggregate(client, pipeline) {
    try {
        await client.connect();
        const query_result = await client.db('quotes').collection('users').aggregate(pipeline).toArray();
        return query_result[0];
    } catch (err) {
        console.log('ERROR: ' + err.stack);
        return null;
    }
}

async function insert(client, document) {
    try {
        await client.connect();
        const query_result = await client.db('quotes').collection('users').insertOne(document);
        return query_result.insertedId;
    } catch (err) {
        console.log('ERROR: ' + err.stack);
        return null;
    }
}

async function update(client, query, pipeline) {
    try {
        await client.connect();
        const query_result = await client.db('quotes').collection('users').update(query, pipeline);
        return query_result.result.nModified;
    } catch (err) {
        console.log('ERROR: ' + err.stack);
        return null;
    }
}

export default { aggregate, insert, update };