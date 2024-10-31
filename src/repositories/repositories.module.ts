import { Module } from '@nestjs/common';
import { RepositoriesService } from './repositories.service.js';
import { RepositoriesResolver } from './repositories.resolver.js';
import { OcktokitProvider } from './ocktokit.provider.js';

@Module({
  providers: [OcktokitProvider, RepositoriesResolver, RepositoriesService],
})
export class RepositoriesModule {}
