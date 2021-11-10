describe('Game of Quotes', () => {
    it('Open quotes site', () => {
        cy.visit('/');
        cy.get('h5').contains('Game of Quotes');

        cy.get('#restart-button').should('exist');
        cy.get('#clear-button').should('exist');

        cy.get('#copy-button').should('exist').click();
        cy.get('#copy-clipboard').should('exist');
        cy.get('#facebook-link').should('exist');
        cy.get('#twitter-link').should('exist');

        cy.get('#support-button').should('exist').click();
        cy.get('p[data-target="#quote-dialog"]').should('exist');
        cy.get('p[data-target="#donate-dialog"]').should('exist');

        cy.get('#about-button').should('exist');
        cy.get('#profile-button').should('exist').should('be.disabled');
        cy.get('#user-button').should('exist');

        cy.get('.underscores').then(($el) => {
            expect($el.get(0)).to.have.attr('highlighted', 'yes');
            expect($el.get(1)).to.have.attr('highlighted', '');

            $el.get(1).click();

            expect($el.get(0)).to.have.attr('highlighted', '');
            expect($el.get(1)).to.have.attr('highlighted', 'yes');
        });
    });
});