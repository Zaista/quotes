import quote from '../fixtures/quote.json'
import user from '../fixtures/user.json'

describe('Login tests', () => {
  it('Login', () => {
    cy.fixture('user.json').then((user) => {
      cy.request('POST', 'api/login', user).should((response) => {
        expect(response.body).to.have.property('login', 'success');
      });
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
    cy.fixture('user.json').then((user) => {
      cy.request('POST', 'api/login', user);
      cy.request({url: 'api/logout', followRedirect: false}).should(
        (response) => {
          expect(response.status).to.eq(302);
        }
      );
    });
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

  it('Quote', () => {
    cy.request('GET', 'api/quote').should((response) => {
      expect(response.body).to.have.property('date');
      expect(response.body).to.have.property('quote');
      expect(response.body).to.have.property('author');
      expect(response.body).to.have.property('link');
      expect(response.body).to.have.property('_id');
    });
  });

  it('Quote - specific', function () {
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
    cy.request('POST', 'api/register', user).should((response) => {
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
