// create views in mongodb
print('Creating required views');
db = db.getSiblingDB('quotes');

if (!db.getCollectionNames().includes('users')) {
  print('Creating users collection');
  db.createCollection('users');
}

if (!db.getCollectionNames().includes('all_quotes')) {
  print('Creating users view');
  db.createView(
    "all_quotes",
    "users",
    [
      // project only 'uploaded' field from the db
      { $project: { uploaded: 1 } },
      // simple unwind of uploaded quotes array to separate quote documents
      { $unwind: { path: '$uploaded' } },
      // add detached '_id' field inside the quotes object
      { $addFields: { 'uploaded._id': '$_id' } },
      // replace 'uploaded' root with only quote objects
      { $replaceRoot: { newRoot: '$uploaded' } }
    ]
  );
  print('Created view successfully');
} else {
  print('View already exists.');
}
