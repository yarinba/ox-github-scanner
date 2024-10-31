import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RepositoryWebhook {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  url: string;
}
