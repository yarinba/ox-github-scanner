import { Inject, Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/core';
import type { paginateGraphQLInterface } from '@octokit/plugin-paginate-graphql';
import type { PaginateInterface as PaginateRestInterface } from '@octokit/plugin-paginate-rest';
import type {
  User as GithubUser,
  Repository as GithubRepository,
} from '@octokit/graphql-schema';
import { GraphQLError } from 'graphql';

import { OCKTOKIT_CLIENT } from './ocktokit.provider.js';
import { RepositoryWebhook } from './entities/repository-webhook.entity.js';

@Injectable()
export class RepositoriesService {
  constructor(
    @Inject(OCKTOKIT_CLIENT)
    private readonly octokit: Octokit &
      paginateGraphQLInterface & { paginate: PaginateRestInterface },
  ) {}

  async findAll() {
    try {
      const query = `
        query AllRepositories($cursor: String) {
            viewer {
                repositories(first: 100, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
                    nodes {
                        databaseId
                        name
                        diskUsage
                        owner {
                            login
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }
    `;

      const { viewer } = await this.octokit.graphql.paginate<{
        viewer: GithubUser;
      }>(query);

      return viewer.repositories.nodes;
    } catch (error) {
      throw new GraphQLError('Failed to fetch repositories', {
        extensions: {
          code: 'GITHUB_API_ERROR',
          originalError: error.message,
        },
      });
    }
  }

  async findOne({ owner, repo }: { owner: string; repo: string }) {
    try {
      const query = `
        query Repository($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
                databaseId
                name
                diskUsage
                owner {
                  login
                }
                isPrivate
                defaultBranchRef {
                  name
                }
            }
        }
    `;

      const { repository } = await this.octokit.graphql<{
        repository: Pick<
          GithubRepository,
          | 'databaseId'
          | 'name'
          | 'diskUsage'
          | 'owner'
          | 'isPrivate'
          | 'defaultBranchRef'
        >;
      }>(query, { owner, repo });

      if (!repository) {
        throw new GraphQLError(`Repository not found: ${owner}/${repo}`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return repository;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError('Failed to fetch repository details', {
        extensions: {
          code: 'GITHUB_API_ERROR',
          originalError: error.message,
        },
      });
    }
  }

  async retrieveActiveWebhooks({
    owner,
    repo,
  }: {
    owner: string;
    repo: string;
  }): Promise<RepositoryWebhook[]> {
    try {
      const repositoryWebhooks = await this.octokit.paginate(
        'GET /repos/{owner}/{repo}/hooks',
        { owner, repo, per_page: 100 },
      );

      const activeWebhooks: RepositoryWebhook[] = repositoryWebhooks
        .filter((hook) => hook.active)
        .map((hook) => ({
          id: hook.id,
          name: hook.name,
          url: hook.config.url,
        }));

      return activeWebhooks;
    } catch (error) {
      throw new GraphQLError('Failed to fetch repository webhooks', {
        extensions: {
          code: 'GITHUB_API_ERROR',
          originalError: error.message,
        },
      });
    }
  }

  async retrieveFiles({
    owner,
    repo,
    defaultBranch,
  }: {
    owner: string;
    repo: string;
    defaultBranch: string;
  }) {
    try {
      const { data: treeData } = await this.octokit.request(
        'GET /repos/{owner}/{repo}/git/trees/{tree_sha}',
        { owner, repo, tree_sha: defaultBranch, recursive: 'true' },
      );

      if (!treeData.tree) {
        throw new GraphQLError(`Repository tree not found: ${owner}/${repo}`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const files = treeData.tree.filter((file) => file.type === 'blob');
      return files;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError('Failed to fetch repository files', {
        extensions: {
          code: 'GITHUB_API_ERROR',
          originalError: error.message,
        },
      });
    }
  }

  async retrieveFileContent({
    owner,
    repo,
    path,
  }: {
    owner: string;
    repo: string;
    path: string;
  }) {
    try {
      const { data } = await this.octokit.request(
        'GET /repos/{owner}/{repo}/contents/{path}',
        { owner, repo, path },
      );

      if (Array.isArray(data) || data.type !== 'file') {
        throw new GraphQLError(`Invalid file type for path: ${path}`);
      }

      const base64Content = data.content;
      const content = Buffer.from(base64Content, 'base64').toString('utf-8');
      return content;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError('Failed to fetch file content', {
        extensions: {
          code: 'GITHUB_API_ERROR',
          originalError: error.message,
        },
      });
    }
  }
}
