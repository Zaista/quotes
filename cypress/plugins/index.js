const mongo = require('cypress-mongodb');

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  mongo.setConfig(on);
};
