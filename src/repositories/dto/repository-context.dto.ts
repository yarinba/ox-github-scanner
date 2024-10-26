import { RepositoriesService } from '../repositories.service.js';

type RepositoryData = Awaited<
  ReturnType<typeof RepositoriesService.prototype.findOne>
>;
type RepositoryFiles = Awaited<
  ReturnType<typeof RepositoriesService.prototype.retrieveFiles>
>;

export class RepositoryContext {
  data: RepositoryData;
  files: RepositoryFiles;

  constructor(
    repositoryData: RepositoryData,
    repositoryFiles: RepositoryFiles,
  ) {
    this.data = repositoryData;
    this.files = repositoryFiles;
  }
}
