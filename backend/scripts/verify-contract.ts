import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

type OpenApiOperation = { parameters?: { name?: string; in?: string }[] };
type OpenApiDocument = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
};
type Route = { method: string; path: string; parameterNames: string[] };
type ContractOperation = Route;
type YamlModule = { load(source: string): unknown };

const yaml = require('js-yaml') as YamlModule;
const httpMethods = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);

function getDecorators(node: ts.Node) {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

function decoratorCall(
  decorators: readonly ts.Decorator[],
  allowed: Set<string>,
) {
  for (const decorator of decorators) {
    if (!ts.isCallExpression(decorator.expression)) continue;
    const expression = decorator.expression.expression;
    if (!ts.isIdentifier(expression) || !allowed.has(expression.text)) continue;
    const argument = decorator.expression.arguments[0];
    return {
      name: expression.text,
      value: argument && ts.isStringLiteral(argument) ? argument.text : '',
    };
  }
  return undefined;
}

function parameterNames(routePath: string) {
  return [...routePath.matchAll(/\{([^/{}]+)\}|:([^/]+)/g)].map(
    (match) => match[1] ?? match[2],
  );
}

function normalizePath(routePath: string) {
  const withoutVersion = routePath.replace(/^\/?v1(?=\/|$)/, '');
  const normalized = `/${withoutVersion}`
    .replace(/\/+/g, '/')
    .replace(/:([^/]+)/g, '{$1}')
    .replace(/\/$/, '');
  return normalized || '/';
}

function routeShape(routePath: string) {
  return normalizePath(routePath).replace(/\{[^/{}]+\}/g, '{}');
}

function collectControllerRoutes(sourceFile: ts.SourceFile): Route[] {
  const routes: Route[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node)) {
      const prefix =
        decoratorCall(getDecorators(node), new Set(['Controller']))?.value ??
        '';
      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member)) continue;
        const routeDecorator = decoratorCall(
          getDecorators(member),
          new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options']),
        );
        if (!routeDecorator) continue;
        const routePath = [prefix, routeDecorator.value]
          .filter(Boolean)
          .join('/')
          .replace(/\/+/g, '/');
        const decoratedParameters = member.parameters.flatMap((parameter) => {
          const decorator = decoratorCall(
            getDecorators(parameter),
            new Set(['Param']),
          );
          return decorator ? [decorator.value] : [];
        });
        routes.push({
          method: routeDecorator.name.toLowerCase(),
          path: normalizePath(routePath),
          parameterNames: decoratedParameters,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return routes;
}

function controllerFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return controllerFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.controller.ts')
      ? [fullPath]
      : [];
  });
}

function loadControllerRoutes(root: string): Route[] {
  const sourceDirectory = path.join(root, 'src', 'modules');
  return controllerFiles(sourceDirectory).flatMap((file) => {
    const sourceFile = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    return collectControllerRoutes(sourceFile);
  });
}

function contractOperations(document: OpenApiDocument): ContractOperation[] {
  return Object.entries(document.paths ?? {}).flatMap(
    ([routePath, operations]) =>
      Object.entries(operations)
        .filter(([method]) => httpMethods.has(method.toLowerCase()))
        .map(([method, operation]) => ({
          method: method.toLowerCase(),
          path: normalizePath(routePath),
          parameterNames: (operation.parameters ?? [])
            .filter((parameter) => parameter.in === 'path')
            .map((parameter) => parameter.name ?? ''),
        })),
  );
}

function main() {
  const root = process.cwd();
  const candidates = process.argv[2]
    ? [path.resolve(root, process.argv[2])]
    : [
        path.join(root, 'aiko-openapi__1_.yaml'),
        path.join(root, '..', 'aiko-openapi__1_.yaml'),
      ];
  const contractPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!contractPath) {
    throw new Error(
      `No se encontró aiko-openapi__1_.yaml. Rutas revisadas: ${candidates.join(', ')}`,
    );
  }
  const document = yaml.load(
    fs.readFileSync(contractPath, 'utf8'),
  ) as OpenApiDocument;
  const contract = contractOperations(document);
  const implemented = loadControllerRoutes(root);
  const missing = contract.filter(
    (operation) =>
      !implemented.some(
        (route) =>
          route.method === operation.method &&
          routeShape(route.path) === routeShape(operation.path),
      ),
  );
  const undocumented = implemented.filter(
    (route) =>
      !contract.some(
        (operation) =>
          operation.method === route.method &&
          routeShape(operation.path) === routeShape(route.path),
      ),
  );
  const parameterMismatches = contract.flatMap((operation) => {
    const route = implemented.find(
      (candidate) =>
        candidate.method === operation.method &&
        routeShape(candidate.path) === routeShape(operation.path),
    );
    if (!route) return [];
    const contractNames = parameterNames(operation.path);
    const routeNames = parameterNames(route.path);
    return contractNames.length === routeNames.length &&
      contractNames.some((name, index) => name !== routeNames[index])
      ? [
          `${operation.method.toUpperCase()} ${operation.path}: YAML [${contractNames.join(', ')}], controlador [${routeNames.join(', ')}]`,
        ]
      : [];
  });

  console.log(`Operaciones YAML: ${contract.length}`);
  console.log(`Rutas del YAML no implementadas (${missing.length}):`);
  missing.forEach((operation) =>
    console.log(`  ${operation.method.toUpperCase()} ${operation.path}`),
  );
  console.log(`Rutas implementadas no documentadas (${undocumented.length}):`);
  undocumented.forEach((route) =>
    console.log(`  ${route.method.toUpperCase()} ${route.path}`),
  );
  console.log(
    `Parámetros de ruta con nombres distintos (${parameterMismatches.length}):`,
  );
  parameterMismatches.forEach((mismatch) => console.log(`  ${mismatch}`));
}

main();
