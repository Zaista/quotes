FROM cypress/included:8.3.0

COPY ../.git .git
COPY cypress cypress
COPY cypress.json .
COPY package.json .
COPY package-lock.json .

ENV CYPRESS_API_URL=https://cypress-director-gp34ticnkq-ey.a.run.app

RUN ["npm", "ci"]

RUN ["npm", "run", "ci"]