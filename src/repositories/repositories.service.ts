import { Inject, Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/core';
import type { paginateGraphQLInterface } from '@octokit/plugin-paginate-graphql';
import type { PaginateInterface as PaginateRestInterface } from '@octokit/plugin-paginate-rest';
import type { User as GithubUser } from '@octokit/graphql-schema';

import { OCKTOKIT_CLIENT } from '../providers/ocktokit.provider.js';
import { RepositoryWebhook } from './entities/repository-webhook.entity.js';

@Injectable()
export class RepositoriesService {
  constructor(
    @Inject(OCKTOKIT_CLIENT)
    private readonly octokit: Octokit &
      paginateGraphQLInterface & { paginate: PaginateRestInterface },
  ) {}

  async findAll() {
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
  }

  async findOne({ owner, repo }: { owner: string; repo: string }) {
    const { data: repoData } = await this.octokit.request(
      'GET /repos/{owner}/{repo}',
      { owner, repo },
    );

    return repoData;
  }

  async retrieveActiveWebhooks({
    owner,
    repo,
  }: {
    owner: string;
    repo: string;
  }): Promise<RepositoryWebhook[]> {
    const webhooks: RepositoryWebhook[] = [];

    let page = 1;
    let hasNextPage = true;

    try {
      while (hasNextPage) {
        const { data, headers } = await this.octokit.request(
          'GET /repos/{owner}/{repo}/hooks',
          {
            owner,
            repo,
            per_page: 100,
            page,
            headers: { accept: 'application/vnd.github+json' },
          },
        );

        const activeWebhooks = data
          .filter((hook) => hook.active)
          .map((hook) => ({
            id: hook.id,
            name: hook.name,
            url: hook.config.url,
          }));

        webhooks.push(...activeWebhooks);

        // Check if there are more pages
        const linkHeader = headers.link;
        hasNextPage = linkHeader && linkHeader.includes('rel="next"');
        page++;
      }

      return webhooks;
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      throw error;
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
    const { data: treeData } = await this.octokit.request(
      'GET /repos/{owner}/{repo}/git/trees/{tree_sha}',
      { owner, repo, tree_sha: defaultBranch, recursive: 'true' },
    );

    const files = treeData.tree.filter((file) => file.type === 'blob');

    return files;
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
    const { data } = await this.octokit.request(
      'GET /repos/{owner}/{repo}/contents/{path}',
      { owner, repo, path },
    );

    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error('invariant violation: file type mismatch');
    }

    const base64Content = data.content;

    const content = Buffer.from(base64Content, 'base64').toString('utf-8');

    return content;
  }
}
