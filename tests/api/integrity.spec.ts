import { resolve } from 'path';
import { setCWD } from '../../src/consts';
import { scan } from '../../src/scanner';
import { createRegistry } from '../../src/registry';
import { checkIntegrity, hasIntegrity } from '../../src/api/integrity';

describe('integrity', () => {
  ['lerna', 'yarn'].forEach(manager => {
    test(manager, async () => {
      const cwd = resolve(__dirname, `../../example/${manager}`);

      setCWD(cwd);

      const locations = await scan();
      const registry = await createRegistry(locations);

      // integrity of a single package
      const graphqlResult = await checkIntegrity({
        name: 'graphql',
        registry,
      });

      expect(graphqlResult.graphql.integrity).toEqual(true);
      expect(graphqlResult.graphql.parents).toHaveProperty('@example/core');
      expect(graphqlResult.graphql.parents).toHaveProperty('@example/react');
      expect(graphqlResult.graphql.parents).toHaveProperty('@example/angular');
      expect(graphqlResult.graphql.parents).toHaveProperty(
        `${manager}-example`,
      );
      expect(hasIntegrity(graphqlResult)).toEqual(true);

      // integrity of an unused package
      const unusedResult = await checkIntegrity({
        name: '@example/angular',
        registry,
      });

      expect(unusedResult['@example/angular'].integrity).toEqual(true);

      // integrity of a package that is used once
      const onceResult = await checkIntegrity({
        name: 'react',
        registry,
      });

      expect(onceResult['react'].integrity).toEqual(true);

      // integrity of all packages
      const {
        graphql,
        ['@example/angular']: exampleAngular,
        react,
      } = await checkIntegrity({
        registry,
      });

      // graphql
      expect(graphql.integrity).toEqual(true);
      expect(graphql.parents).toHaveProperty('@example/core');
      expect(graphql.parents).toHaveProperty('@example/react');
      expect(graphql.parents).toHaveProperty('@example/angular');
      expect(graphql.parents).toHaveProperty(`${manager}-example`);
      // angular
      expect(exampleAngular.integrity).toEqual(true);
      // react
      expect(react.integrity).toEqual(true);
    });
  });
});
