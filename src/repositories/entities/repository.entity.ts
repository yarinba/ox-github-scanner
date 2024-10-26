import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RepositoryLean {
  @Field(() => ID, {
    description: 'Identifies the primary key from github database.',
  })
  id: number;

  @Field(() => String, { description: 'The name of the repository' })
  name: string;

  @Field(() => String, {
    description: 'The User owner of the repository',
  })
  owner: string;

  @Field(() => Int, {
    description: 'The number of kilobytes this repository occupies on disk.',
  })
  size: number;
}

@ObjectType()
export class Repository extends RepositoryLean {
  defaultBranch: string;

  isPrivate: boolean;
}
