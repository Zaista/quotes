FROM cypress/included:7.6.0

COPY ./cypress ./cypress
COPY ./cypress.json .
COPY ./package.json .

RUN ["npm", "install"]

CMD ["npm", "run", "parallel"]