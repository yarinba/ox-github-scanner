import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Repository {
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
