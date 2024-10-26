import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Octokit } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import { paginateRest } from '@octokit/plugin-paginate-rest';

export const OCKTOKIT_CLIENT = 'OCKTOKIT_CLIENT';

export const OcktokitProvider: Provider = {
  provide: OCKTOKIT_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return new (Octokit.plugin(
      throttling,
      retry,
      paginateRest,
      paginateGraphQL,
    ))({
      auth: configService.get('GITHUB_TOKEN'),
      throttle: {
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          octokit.log.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`,
          );

          if (retryCount < 1) {
            // only retries once
            octokit.log.info(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          // does not retry, only logs a warning
          octokit.log.warn(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
          );
        },
      },
    });
  },
};
