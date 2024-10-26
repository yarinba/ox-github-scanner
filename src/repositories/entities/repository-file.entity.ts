import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RepositoryFile {
  @Field(() => String)
  path: string;

  @Field(() => String)
  content: string;
}
