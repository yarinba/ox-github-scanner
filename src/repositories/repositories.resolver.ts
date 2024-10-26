import {
  Resolver,
  Query,
  Args,
  Parent,
  ResolveField,
  Int,
} from '@nestjs/graphql';
import { RepositoriesService } from './repositories.service.js';
import { Repository, RepositoryLean } from './entities/repository.entity.js';
import { RepositoryFile } from './entities/repository-file.entity.js';
import { RepositoryWebhook } from './entities/repository-webhook.entity.js';
import { UseQueue } from '../queue/queue.decorator.js';

@Resolver((of) => Repository)
export class RepositoriesResolver {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Query(() => [RepositoryLean])
  async repositories(): Promise<RepositoryLean[]> {
    const data = await this.repositoriesService.findAll();

    return data.map((repo) => ({
      id: repo.databaseId,
      name: repo.name,
      owner: repo.owner.login,
      size: repo.diskUsage,
    }));
  }

  @Query(() => Repository)
  @UseQueue({ name: 'repository', concurrency: 2, timeout: 5000 })
  async repository(
    @Args('owner') owner: string,
    @Args('repo') repo: string,
  ): Promise<Repository> {
    const githubRepository = await this.repositoriesService.findOne({
      owner,
      repo,
    });

    return {
      id: githubRepository.databaseId,
      name: githubRepository.name,
      owner: githubRepository.owner.login,
      size: githubRepository.diskUsage,
      defaultBranch: githubRepository.defaultBranchRef.name,
      isPrivate: githubRepository.isPrivate,
    };
  }

  @ResolveField(() => Boolean, {
    description: 'Wheter this repository is private or public.',
  })
  isPrivate(@Parent() parent: Repository): boolean {
    return parent.isPrivate;
  }

  @ResolveField(() => Int, {
    description: 'The number of files in this repository.',
  })
  async filesCount(@Parent() parent: Repository): Promise<number> {
    const files = await this.repositoriesService.retrieveFiles({
      owner: parent.owner,
      repo: parent.name,
      defaultBranch: parent.defaultBranch,
    });

    return files.length;
  }

  @ResolveField(() => RepositoryFile, {
    nullable: true,
    description: 'Random `.yml` file that appears in this repository (if any).',
  })
  async ymlFile(@Parent() parent: Repository): Promise<RepositoryFile | null> {
    const files = await this.repositoriesService.retrieveFiles({
      owner: parent.owner,
      repo: parent.name,
      defaultBranch: parent.defaultBranch,
    });

    const ymlFile = files.find((file) => file.path.endsWith('.yml'));

    if (!ymlFile?.path) {
      return null;
    }

    const fileContent = await this.repositoriesService.retrieveFileContent({
      owner: parent.owner,
      repo: parent.name,
      path: ymlFile.path,
    });

    return {
      path: ymlFile.path,
      content: fileContent,
    };
  }

  @ResolveField(() => [RepositoryWebhook], {
    description: 'List of active webhooks for this repository.',
  })
  async activeWebhooks(
    @Parent() parent: Repository,
  ): Promise<RepositoryWebhook[]> {
    return this.repositoriesService.retrieveActiveWebhooks({
      owner: parent.owner,
      repo: parent.name,
    });
  }
}
