import { defineConfig } from "cypress";
import { configurePlugin } from 'cypress-mongodb';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    env: {
      mongodb: {
        uri: 'mongodb://localhost:27017',
        database: 'database_name',
        collection: 'collection_name'
      }
    },
    setupNodeEvents(on, config) {
      configurePlugin(on);
    },
  },
});
