describe('API tests', () => {
    it('Login', () => {
        cy.fixture('user.json').then((user) => {
            cy.request('POST', 'api/login', user).should((response) => {
                expect(response.body).to.have.property('login', 'success');
            });
        });
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

    it('Version', () => {
        cy.request('GET', 'api/version').should((response) => {
            expect(response.body).to.have.property('version');
        });
    });

    it('Profile - not logged in', () => {
        cy.request('GET', 'api/profile').should((response) => {
            expect(response.body).to.have.property('error', 'Not logged in.');
        });
    });

    it('Profile - logged in', () => {
        cy.fixture('user.json').then((user) => {
            cy.request('POST', 'api/login', user);
            cy.request('GET', 'api/profile').should((response) => {
                expect(response.body[0]).to.have.property('email', user.email);
                expect(response.body[0]).to.have.property('mark', 'user');
            });
        });
    });
});