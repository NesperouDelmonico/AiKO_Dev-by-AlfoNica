import 'package:flutter_test/flutter_test.dart';

import 'package:aiko_mobile/core/models.dart';

// Respuesta real de GET /pacientes/:id/rutas/activa (abreviada).
const _route = {
  'id': '443d465c',
  'estado': 'Activa',
  'ejercicios': [
    {
      'id': 'b',
      'ejercicio': {
        'id': 'e2',
        'nombre': 'Memoria de secuencias',
        'categoria': 'Memoria',
        'instrucciones': 'Repite la secuencia.',
        'parametros': {'longitud_inicial': 3},
        'nivelDificultad': 1,
        'estado': 'Activo',
      },
      'orden': 2,
      'estado': 'Pendiente',
    },
    {
      'id': 'a',
      'ejercicio': {
        'id': 'e1',
        'nombre': 'Atención sostenida',
        'categoria': 'Atención',
        'instrucciones': 'Toca el círculo.',
        'parametros': {'duracion_segundos': 60},
        'nivelDificultad': 1,
        'estado': 'Activo',
      },
      'orden': 1,
      'estado': 'Completado',
    },
    {
      'id': 'c',
      'ejercicio': {
        'id': 'e3',
        'nombre': 'Reacción rápida',
        'categoria': 'Velocidad',
        'instrucciones': 'Toca el objetivo.',
        'parametros': {'intentos': 10},
        'nivelDificultad': 2,
        'estado': 'Activo',
      },
      'orden': 3,
      'estado': 'Reemplazado',
    },
  ],
  'progreso': {'completados': 1, 'pendientes': 1, 'porcentaje': 50},
};

void main() {
  test('ActiveRoute ordena, oculta reemplazados y calcula el siguiente', () {
    final route = ActiveRoute.fromJson(Map<String, dynamic>.from(_route));
    expect(route.ejercicios.map((e) => e.id), ['a', 'b']);
    expect(route.total, 2);
    expect(route.done, 1);
    expect(route.next?.ejercicio.nombre, 'Memoria de secuencias');
    expect(route.ejercicios.first.ejercicio.nivel, 1);
  });

  test('ActiveRoute sin pendientes no tiene siguiente', () {
    final route = ActiveRoute.fromJson({
      'id': 'r',
      'ejercicios': [
        {
          'id': 'a',
          'orden': 1,
          'estado': 'Completado',
          'ejercicio': {
            'id': 'e',
            'nombre': 'X',
            'categoria': 'Memoria',
            'instrucciones': '',
            'nivelDificultad': 1,
          },
        },
      ],
    });
    expect(route.next, isNull);
  });

  test('AchievementProfile lee nivel y XP', () {
    final profile = AchievementProfile.fromJson(
        {'nivel_actual': 2, 'xp_total': 140, 'insignias': []});
    expect(profile.nivel, 2);
    expect(profile.xp, 140);
  });
}
