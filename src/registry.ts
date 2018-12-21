import { readFile } from 'fs';
import { join } from 'path';
import { DepGraph } from 'dependency-graph';

export interface Package {
  name: string;
  version: string;
  dependencies?: {
    [name: string]: string;
  };
  devDependencies?: {
    [name: string]: string;
  };
  peerDependencies?: {
    [name: string]: string;
  };
  private?: boolean;
  config?: {
    bru?: {
      hooks?: {
        [hook: string]: string;
      };
    };
  };
}

export interface Dependency {
  [parent: string]: {
    direct?: string;
    peer?: string;
    dev?: string;
  };
}

export interface Registry {
  [location: string]: Package;
}

export type DependencyGraph = DepGraph<Dependency>;

export function connect(registry: Registry): DependencyGraph {
  const graph = new DepGraph<Dependency>({
    circular: false,
  });

  for (const location in registry) {
    if (registry.hasOwnProperty(location)) {
      graph.addNode(registry[location].name, {});
    }
  }

  for (const location in registry) {
    if (registry.hasOwnProperty(location)) {
      const pkg = registry[location];

      const deps = Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      });

      deps.forEach(dep => {
        const current: Dependency = {
          [pkg.name]: {
            direct: pkg.dependencies && pkg.dependencies[dep],
            peer: pkg.peerDependencies && pkg.peerDependencies[dep],
            dev: pkg.devDependencies && pkg.devDependencies[dep],
          },
        };

        if (graph.hasNode(dep)) {
          // extend existing node
          const node = graph.getNodeData(dep);

          graph.setNodeData(dep, {
            ...current,
            ...node,
          });
        } else {
          graph.addNode(dep, current);
        }

        graph.addDependency(pkg.name, dep);
      });
    }
  }

  return graph;
}

/**
 * Creates a registry of packages
 * @param locations should be absolute
 */
export async function createRegistry(locations: string[]): Promise<Registry> {
  const registry: Registry = {};
  const packages = await Promise.all(locations.map(readPackage));

  packages.forEach((pkg, i) => {
    registry[locations[i]] = pkg;
  });

  return registry;
}

export async function readPackage(location: string): Promise<Package> {
  return new Promise<Package>((resolve, reject) => {
    readFile(
      join(location, 'package.json'),
      { encoding: 'utf-8' },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          const pkg = JSON.parse(data);

          resolve({
            name: pkg.name,
            version: pkg.version,
            dependencies: pkg.dependencies,
            devDependencies: pkg.devDependencies,
            peerDependencies: pkg.peerDependencies,
            private: !!pkg.private,
          });
        }
      },
    );
  });
}
