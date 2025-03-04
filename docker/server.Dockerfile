######## BUILDING THE ANGULAR CLIENT ##########
# Install from the base nodejs image
FROM node:18-bullseye AS blattwerkzeug-client

# Install updates
RUN apt update

WORKDIR /blattwerkzeug

COPY schema/ ./schema
COPY Makefile.common .

WORKDIR /blattwerkzeug/client/

COPY client/package.json client/package-lock.json ./
RUN npm install

# Copy the sorce code.
COPY client/ ./

# Build the angular application.
RUN ["make", "dist"]

######## BUILDING THE RAILS SERVER ############
FROM ruby:3.1.4-bullseye

RUN mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |  gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
  && apt update \
  && apt install -y ca-certificates curl gnupg nodejs libmagic-dev graphviz

# Create the working directories
WORKDIR /blattwerkzeug/rails_app

# The package manager of ruby that is needed to install gem dependencies
RUN gem install bundler

# Copy the source Gemfiles of your application on the new image:
WORKDIR /blattwerkzeug/rails_app/server
COPY server/Gemfile server/Gemfile.lock ./

# Install the gem dependencies defined in the Gemfiles.
RUN bundle install

# Copy the source code of the application
COPY server/ .

# Copy dependency folders
WORKDIR /blattwerkzeug/rails_app

# Copy the built image of the angular client
COPY --from=blattwerkzeug-client /blattwerkzeug/client/dist ./client/dist
COPY --from=blattwerkzeug-client /blattwerkzeug/client/src/vendor ./client/src/vendor

# Copy extra folders that are needed by the application.
COPY schema/ ./schema

# Create the data folder structure for saving data.
RUN mkdir -p data/{dev,prod}/projects

# Copy the seed folder, allowing to populate the database with the necessary seed data.
COPY seed/ ./seed

# Define the port mapping
EXPOSE 9292

# Define the Environment variables:

# Entrypoint script for seeding the database and starting the rails server.
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# Start the rails server
CMD ["rails", "server",  "-p", "9292"]