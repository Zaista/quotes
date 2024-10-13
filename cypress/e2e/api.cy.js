import quote from '../fixtures/quote.json'
import {faker} from "@faker-js/faker";

const user = {
  email: faker.internet.email(),
  password: 'test'
}

before(() => {
  cy.request('POST', 'api/register', user);
});

describe('Login tests', () => {
  it('Login', () => {
    cy.request('POST', 'api/login', user).should((response) => {
      expect(response.body).to.have.property('login', 'success');
    });
  });

  it('Logout - already logged out', () => {
    cy.request({url: 'api/logout', followRedirect: false}).should(
      (response) => {
        expect(response.status).to.eq(302);
      }
    );
  });

  it('Logout - logged in', () => {
    cy.request('POST', 'api/login', user);
    cy.request({url: 'api/logout', followRedirect: false}).should(
      (response) => {
        expect(response.status).to.eq(302);
      }
    );
  });
});

describe('Quote tests', () => {

  before(() => {
    cy.request('POST', 'api/login', user);
    cy.request('POST', 'api/submit', quote).then((response) => {
      cy.wrap(response.body.link).as('quoteLink');
    });
    cy.request({url: 'api/logout', followRedirect: false});
  });

  it('Quote - get any', () => {
    cy.request('GET', 'api/quote').should((response) => {
      expect(response.body).to.have.property('date');
      expect(response.body).to.have.property('quote');
      expect(response.body).to.have.property('author');
      expect(response.body).to.have.property('link');
      expect(response.body).to.have.property('_id');
    });
  });

  it('Quote - get specific', function () {
    cy.request(
      'GET',
      `api/quote?quote=${this.quoteLink}`
    ).should((response) => {
      expect(response.body).to.have.property('date');
      expect(response.body).to.have.property('quote', quote.quote);
      expect(response.body).to.have.property('author', quote.author);
      expect(response.body).to.have.property('link', this.quoteLink);
      expect(response.body).to.have.property('_id');
    });
  });

  it('Quote - solve, logged in out', function () {
    cy.request({
        method: 'GET',
        url: `api/solution?quote=${this.quoteLink}`,
        failOnStatusCode: false
      }
    ).then((response) => {
      expect(response.body).to.have.property('error', 'Unauthorized');
    });
  });

  it('Quote - solve, logged in, no quote link', function () {
    cy.request('POST', 'api/login', user);
    cy.request({
        method: 'GET',
        url: 'api/solution',
        failOnStatusCode: false
      }
    ).then((response) => {
      expect(response.body).to.have.property('error', 'Quote link mandatory');
    });
  });

  it('Quote - solve, logged in, bad quote link', function () {
    cy.request('POST', 'api/login', user);
    cy.request({
        method: 'GET',
        url: 'api/solution?quote=12345',
        failOnStatusCode: false
      }
    ).then((response) => {
      expect(response.body).to.have.property('error', 'Unknown quote link');
    });
  });

  it('Quote - solve, logged in, good quote link', function () {
    cy.request('POST', 'api/login', user);
    cy.request({
        method: 'GET',
        url: `api/solution?quote=${this.quoteLink}`
      }
    ).then((response) => {
      expect(response.body).to.have.property('success', 'Quote solved');
    });
  });

  it('Quote - submit, logged out', function () {
    cy.request('POST', 'api/submit', quote).then((response) => {
      expect(response.body).to.have.property('error', 'User not logged in');
    });
  });

  it('Quote - submit, logged in', function () {
    cy.request('POST', 'api/login', user);
    cy.request('POST', 'api/submit', quote).then((response) => {
      expect(response.body).to.have.property('result', 'success');
      expect(response.body).to.have.property('link');
    });
  });
});

describe('Profile tests', () => {
  it('Profile - not logged in', () => {
    cy.request('GET', 'api/profile').should((response) => {
      expect(response.body).to.have.property('error', 'Not logged in.');
    });
  });

  it('Profile - logged in', () => {
    cy.request('POST', 'api/login', user);
    cy.request('GET', 'api/profile').should((response) => {
      const lastEntry = response.body.length - 1;
      expect(response.body[lastEntry]).to.have.property('email', user.email);
      expect(response.body[lastEntry]).to.have.property('mark', 'user');
    });
  });

  it('Register - email in use', () => {
    cy.request({method: 'POST', url: 'api/register', body: user, failOnStatusCode: false}).should((response) => {
      expect(response.body).to.have.property(
        'error',
        'Email already in use.'
      );
    });
  });
});

describe('Status tests', () => {
  it('Status - logged out', () => {
    cy.request('GET', 'api/status').should((response) => {
      expect(response.body).to.have.property('error', 'unauthorized');
    });
  });

  it('Status - logged in', () => {
    cy.request('POST', 'api/login', user);
    cy.request('GET', 'api/status').should((response) => {
      expect(response.body).to.have.property('_id');
      expect(response.body).to.have.property('password');
      expect(response.body).to.have.property('email', user.email);
    });
  });

  it('Version', () => {
    cy.request('GET', 'api/version').should((response) => {
      expect(response.body).to.have.property('version');
    });
  });
});
