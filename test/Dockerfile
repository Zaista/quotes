FROM cypress/included:7.6.0

COPY ./cypress ./cypress
COPY ./cypress.json .

RUN ["npm", "run", "parallel"]