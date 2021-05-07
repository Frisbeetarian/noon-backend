import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();
  // app.get('/', (_, res) => {
  //   res.send('hello');
  // });

  const apolloServer = new ApolloServer({
    // schema: 
  });

  app.listen(4020, () => {
    console.log('server start on localhost:4020');
  });

  // const post = orm.em.create(Post, {title: 'my first post'});
  // console.log('---------------sql 2--------------');
  // await orm.em.persistAndFlush(post);

  // const posts = await orm.em.find(Post, {});
  // console.log(posts);
};

main().catch((err) => {
  console.error(err);
});