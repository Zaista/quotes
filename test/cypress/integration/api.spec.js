describe('API tests', () => {
    it('Login', () => {
        cy.fixture('user.json').then((user) => {
            cy.request('POST', 'api/login', user).should((response) => {
                expect(response.body).to.have.property('login', 'success');
            });
        });
    });
});