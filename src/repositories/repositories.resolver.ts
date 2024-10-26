import {
  Resolver,
  Query,
  Args,
  Context,
  Parent,
  ResolveField,
  Int,
} from '@nestjs/graphql';
import { RepositoriesService } from './repositories.service.js';
import { Repository } from './entities/repository.entity.js';
import { RepositoryFile } from './entities/repository-file.entity.js';
import { RepositoryContext } from './dto/repository-context.dto.js';
import { RepositoryWebhook } from './entities/repository-webhook.entity.js';

@Resolver(() => Repository)
export class RepositoriesResolver {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Query(() => [Repository])
  async repositories(): Promise<Repository[]> {
    const res = await this.repositoriesService.findAll();

    return res.map((repo) => ({
      id: repo.databaseId,
      name: repo.name,
      owner: repo.owner.login,
      size: repo.diskUsage,
    }));
  }

  @Query(() => Repository)
  async repository(
    @Args('owner') owner: string,
    @Args('repo') repo: string,
    @Context() context: { repository: RepositoryContext },
  ): Promise<Repository> {
    const githubRepositoryData = await this.repositoriesService.findOne({
      owner,
      repo,
    });

    const githubRepositoryFiles = await this.repositoriesService.retrieveFiles({
      owner,
      repo,
      defaultBranch: githubRepositoryData.default_branch,
    });

    context.repository = new RepositoryContext(
      githubRepositoryData,
      githubRepositoryFiles,
    );

    return {
      id: githubRepositoryData.id,
      name: githubRepositoryData.name,
      owner: githubRepositoryData.owner.login,
      size: githubRepositoryData.size,
    };
  }

  @ResolveField(() => Boolean, {
    description:
      'Wheter this repository is private or public. *** This field is only available for a single repository query ***',
  })
  isPrivate(
    @Parent() parent: Repository,
    @Context() context: { repository: RepositoryContext },
  ): boolean {
    if (!(context.repository instanceof RepositoryContext)) {
      throw new Error(
        'repository context not found, please use the single repository query',
      );
    }

    if (parent.id !== context.repository.data.id) {
      throw new Error('invariant violation: repository id mismatch');
    }

    return context.repository.data.private;
  }

  @ResolveField(() => Int, {
    description:
      'The number of files in this repository. *** This field is only available for a single repository query ***',
  })
  filesCount(
    @Parent() parent: Repository,
    @Context() context: { repository: RepositoryContext },
  ): number {
    if (!(context.repository instanceof RepositoryContext)) {
      throw new Error(
        'repository context not found, please use the single repository query',
      );
    }

    if (parent.id !== context.repository.data.id) {
      throw new Error('invariant violation: repository id mismatch');
    }

    return context.repository.files.length;
  }

  @ResolveField(() => RepositoryFile, {
    nullable: true,
    description:
      'Random `.yml` file that appears in this repository (if any). *** This field is only available for a single repository query ***',
  })
  async ymlFile(
    @Parent() parent: Repository,
    @Context() context: { repository: RepositoryContext },
  ): Promise<RepositoryFile | null> {
    if (!(context.repository instanceof RepositoryContext)) {
      throw new Error(
        'repository data not found, please use the single repository query',
      );
    }

    const ymlFile = context.repository.files.find((file) =>
      file.path.endsWith('.yml'),
    );

    const ymlFilePath = ymlFile?.path;

    if (!ymlFilePath) {
      return null;
    }

    const fileContent = await this.repositoriesService.retrieveFileContent({
      owner: parent.owner,
      repo: parent.name,
      path: ymlFilePath,
    });

    return {
      path: ymlFilePath,
      content: fileContent,
    };
  }

  @ResolveField(() => [RepositoryWebhook], {
    description:
      'List of active webhooks for this repository. *** This field is only available for a single repository query ***',
  })
  async activeWebhooks(
    @Parent() parent: Repository,
    @Context() context: { repository: RepositoryContext },
  ): Promise<RepositoryWebhook[]> {
    if (!(context.repository instanceof RepositoryContext)) {
      throw new Error(
        'repository data not found, please use the single repository query',
      );
    }

    const webhooks = await this.repositoriesService.retrieveActiveWebhooks({
      owner: parent.owner,
      repo: parent.name,
    });

    return webhooks;
  }
}
