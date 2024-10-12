import { defineConfig } from "cypress";
import { configurePlugin } from 'cypress-mongodb';

export default defineConfig({
  projectId: "tfo3ms",
  e2e: {
    baseUrl: 'http://localhost:8080',
    env: {
      mongodb: {
        uri: 'mongodb://localhost:27017?quotes'
      }
    },
    setupNodeEvents(on) {
      configurePlugin(on);
    },
  },
});
