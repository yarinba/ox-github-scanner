## Description

The `ox-github-scanner` is a NestJS-based application designed to interact with GitHub's API. It provides a GraphQL interface to efficiently retrieve and manage information about GitHub repositories. The application offers the following functionalities:

- Retrieve All Repositories: Fetch a list of repositories with basic details such as ID, name, owner, and size.
- Retrieve Repository Details: Get comprehensive information about a specific repository, including:
  - Whether the repository is private or public.
  - The number of files in the repository.
  - A random .yml file from the repository, if available.
  - A list of active webhooks associated with the repository.

## Project Setup

```bash
$ npm install
```

### Environment Variables

To run this application, you need to set up environment variables as described in the `.env.example` file.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```
