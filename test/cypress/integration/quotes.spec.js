describe('Game of Quotes', () => {
    it('Open quotes site', () => {
        cy.visit('/')
        cy.get('h5').contains('Game of sQuotes')
    })
})