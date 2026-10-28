import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aiko_mobile/core/island_theme.dart';
import 'package:aiko_mobile/core/models.dart';
import 'package:aiko_mobile/core/theme.dart';
import 'package:aiko_mobile/features/home/day_screen.dart';

RouteExercise item(String id, String tipo, {int dia = 1, String estado = RouteExercise.pending}) =>
    RouteExercise(
      id: id,
      orden: 1,
      dia: dia,
      estado: estado,
      ejercicio: Exercise(
        id: 'e-$id',
        nombre: 'Ejercicio $id',
        categoria: 'Memoria',
        instrucciones: '',
        nivel: 1,
        tipo: tipo,
      ),
    );

RouteDay day(List<RouteExercise> items, {int numero = 1}) =>
    RouteDay(numero: numero, dia: items.first.dia, ejercicios: items);

void main() {
  test('la isla toma el tipo de ejercicio dominante del día', () {
    expect(
      IslandTheme.forDay(day([
        item('a', Exercise.logic),
        item('b', Exercise.logic),
        item('c', Exercise.reaction),
      ])),
      IslandTheme.logica,
    );
    // Empate de dos tipos (mitad y mitad): gana el primero que llega a la mitad.
    expect(
      IslandTheme.forDay(day([item('a', Exercise.reaction), item('b', Exercise.logic)])),
      isIn([IslandTheme.reaccion, IslandTheme.logica]),
    );
    // Tres tipos distintos: isla mixta.
    expect(
      IslandTheme.forDay(day([
        item('a', Exercise.reaction),
        item('b', Exercise.logic),
        item('c', Exercise.completeWords),
      ])),
      IslandTheme.mixta,
    );
    // Tipo sin juego propio: se usa la categoría.
    expect(IslandTheme.forDay(day([item('a', 'desconocido')])), IslandTheme.memoria);
  });

  test('estado de la isla según la agenda', () {
    const today = RouteAgenda(diaActual: 2, disponible: true);
    const waiting = RouteAgenda(diaActual: 2, disponible: false, disponibleDesde: '2026-10-29');
    final done = day([item('a', Exercise.logic, estado: RouteExercise.completed)]);
    final second = day([item('b', Exercise.logic, dia: 2)], numero: 2);
    final third = day([item('c', Exercise.logic, dia: 3)], numero: 3);

    expect(islandState(done, today), IslandState.done);
    expect(islandState(second, today), IslandState.today);
    expect(islandState(second, waiting), IslandState.waiting);
    expect(islandState(third, today), IslandState.locked);
  });

  testWidgets('el panel del día muestra el progreso y los ejercicios', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final route = ActiveRoute(
      id: 'r1',
      agenda: const RouteAgenda(diaActual: 1),
      ejercicios: [
        item('a', Exercise.logic, estado: RouteExercise.completed),
        item('b', Exercise.logic),
        item('c', Exercise.reaction),
      ],
    );
    await tester.pumpWidget(MaterialApp(
      theme: buildAikoTheme(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: true),
        child: child!,
      ),
      home: DayScreen(
        route: route,
        day: route.days.first,
        totalDays: 7,
        reload: () async => route,
      ),
    ));
    await tester.pump();
    expect(find.text('Isla de Cristal'), findsOneWidget);
    expect(find.text('1/3'), findsOneWidget);
    expect(find.text('Ejercicio b'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Continuar'), findsOneWidget);
  });
}
