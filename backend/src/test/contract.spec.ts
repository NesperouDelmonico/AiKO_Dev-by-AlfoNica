import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Schema = {
  $ref?: string;
  allOf?: Schema[];
  items?: Schema;
  minLength?: number;
  properties?: Record<string, Schema>;
  required?: string[];
};
type Operation = {
  parameters?: { $ref?: string; name?: string; in?: string }[];
  requestBody?: {
    content?: Record<string, { schema?: Schema }>;
  };
  responses?: Record<string, unknown>;
};
type Contract = {
  paths: Record<string, Record<string, Operation>>;
  components?: {
    parameters?: Record<string, { name?: string; in?: string }>;
    schemas?: Record<string, Schema>;
  };
};
type YamlModule = { load(source: string): unknown };

const yaml = require('js-yaml') as YamlModule;
const contract = yaml.load(
  readFileSync(resolve(process.cwd(), 'docs/aiko-openapi__1_.yaml'), 'utf8'),
) as Contract;

describe('OpenAPI contract', () => {
  it('keeps 59 operations and documents the searched-patient pagination shape', () => {
    const operationCount = Object.values(contract.paths).reduce(
      (count, path) =>
        count +
        Object.keys(path).filter((method) =>
          ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(
            method,
          ),
        ).length,
      0,
    );
    const search = contract.paths['/pacientes/buscar'].get;
    const queryParameters = search.parameters?.map((parameter) => {
      if (!parameter.$ref) return parameter;
      const reference = parameter.$ref.split('/').at(-1);
      return reference ? contract.components?.parameters?.[reference] : undefined;
    })
      .filter((parameter) => parameter?.in === 'query')
      .map((parameter) => parameter?.name);
    const responseSchema = (
      search.responses?.['200'] as {
        content?: { 'application/json'?: { schema?: Schema } };
      }
    ).content?.['application/json']?.schema;
    const listingSchema = responseSchema?.allOf?.find(
      (schema) => schema.properties?.data,
    );

    expect(operationCount).toBe(59);
    expect(queryParameters).toEqual(
      expect.arrayContaining(['page', 'limit', 'q', 'estado', 'nivel']),
    );
    expect(listingSchema?.properties?.data?.items?.$ref).toBe(
      '#/components/schemas/PacienteListado',
    );
    expect(
      contract.components?.schemas?.Paciente?.required,
    ).toEqual(expect.arrayContaining([
      'nombre',
      'correo',
      'cedula',
      'estado',
      'fecha_nacimiento',
      'edad',
    ]));
    expect(
      contract.components?.schemas?.PacienteListado?.allOf?.[1]?.required,
    ).toEqual(expect.arrayContaining(['alertas_activas', 'progreso_ruta']));
  });

  it('documents the implemented access, conflict, and delivery error responses', () => {
    expect(
      contract.paths['/pacientes/{id}'].get.responses?.['403'],
    ).toBeDefined();
    for (const path of [
      '/pacientes',
      '/usuarios/especialistas',
      '/usuarios/administradores',
    ]) {
      expect(contract.paths[path].post.responses?.['409']).toBeDefined();
      expect(contract.paths[path].post.responses?.['503']).toBeDefined();
    }
  });

  it('documents the enforced minimum lengths for observation and incident text', () => {
    const observationCreate =
      contract.paths['/pacientes/{id}/observaciones'].post;
    const observationUpdate = contract.paths['/observaciones/{id}'].put;
    const incidentCreate = contract.paths['/incidencias'].post;

    expect(
      observationCreate.requestBody?.content?.['application/json']?.schema
        ?.properties?.texto?.minLength,
    ).toBe(5);
    expect(
      observationUpdate.requestBody?.content?.['application/json']?.schema
        ?.properties?.texto?.minLength,
    ).toBe(5);
    expect(
      incidentCreate.requestBody?.content?.['application/json']?.schema
        ?.properties?.descripcion?.minLength,
    ).toBe(10);
  });
});
