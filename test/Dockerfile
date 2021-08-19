FROM cypress/included:8.3.0

COPY ./cypress ./cypress
COPY ./cypress.json .
COPY ./package.json .

RUN ["npm", "install"]

ENTRYPOINT ["npm", "run", "parallel"]