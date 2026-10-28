import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aiko_mobile/core/theme.dart';
import 'package:aiko_mobile/features/progress/consistency_calendar.dart';
import 'package:aiko_mobile/features/progress/progress_repository.dart';

void main() {
  test('desplaza meses y arma las celdas empezando en lunes', () {
    expect(shiftMonth('2026-10', -1), '2026-09');
    expect(shiftMonth('2026-01', -1), '2025-12');
    expect(shiftMonth('2026-12', 1), '2027-01');
    // Octubre 2026 empieza en jueves: tres huecos (L, M, M).
    final cells = monthCells('2026-10');
    expect(cells.take(3), [null, null, null]);
    expect(cells[3], 1);
    expect(cells.whereType<int>().length, 31);
  });

  testWidgets('muestra el mes, los días seguidos y permite ir al anterior',
      (tester) async {
    final requested = <String>[];
    final october = Consistency.fromJson({
      'mes': '2026-10',
      'hoy': '2026-10-28',
      'dias_activos': ['2026-10-26', '2026-10-27', '2026-10-28'],
      'racha_actual': 3,
      'mejor_racha': 5,
      'ejercicios_semana': 7,
    });
    await tester.pumpWidget(MaterialApp(
      theme: buildAikoTheme(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: true),
        child: child!,
      ),
      home: Scaffold(
        body: SingleChildScrollView(
          child: ConsistencyCalendar(
            initial: october,
            load: (month) async {
              requested.add(month);
              return Consistency.fromJson({
                'mes': month,
                'hoy': '2026-10-28',
                'dias_activos': <String>[],
              });
            },
          ),
        ),
      ),
    ));
    await tester.pump();
    expect(find.text('Octubre 2026'), findsOneWidget);
    expect(find.text('días seguidos'), findsOneWidget);
    expect(find.text('Mejor racha: 5'), findsOneWidget);
    expect(find.text('7'), findsWidgets);
    // No se puede avanzar más allá del mes actual.
    final next = tester.widget<IconButton>(find.widgetWithIcon(IconButton, Icons.chevron_right_rounded));
    expect(next.onPressed, isNull);

    await tester.tap(find.byTooltip('Mes anterior'));
    await tester.pumpAndSettle();
    expect(requested, ['2026-09']);
    expect(find.text('Septiembre 2026'), findsOneWidget);
  });
}
