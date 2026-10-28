import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:aiko_mobile/core/app_settings.dart';
import 'package:aiko_mobile/core/theme.dart';
import 'package:aiko_mobile/features/companion/companion.dart';
import 'package:aiko_mobile/features/progress/achievements_screen.dart';
import 'package:aiko_mobile/features/settings/personalize_screen.dart';

void main() {
  test('nombre de archivo de cada insignia', () {
    expect(badgeSlug('Primer paso'), 'primer_paso');
    expect(badgeSlug('Precisión'), 'precision');
    expect(badgeSlug('  Gran Explorador! '), 'gran_explorador');
  });

  test('saludo del día cambia por fecha', () {
    expect(companionGreetings, contains(greetingOfTheDay(DateTime(2026, 10, 28))));
    expect(greetingOfTheDay(DateTime(2026, 10, 28)), isNot(greetingOfTheDay(DateTime(2026, 10, 29))));
  });

  test('accesorio, saludo y descanso se guardan en el teléfono', () async {
    SharedPreferences.setMockInitialValues({});
    final settings = AppSettings();
    await settings.load();
    final day = DateTime(2026, 10, 28, 9);
    expect(settings.accessory, AikoAccessory.base);
    expect(settings.greetedToday(day), isFalse);

    await settings.setAccessory(AikoAccessory.gafas);
    await settings.markGreeted(day);
    await settings.markRestShown(day);

    final reloaded = AppSettings();
    await reloaded.load();
    expect(reloaded.accessory, AikoAccessory.gafas);
    expect(reloaded.greetedToday(DateTime(2026, 10, 28, 20)), isTrue);
    expect(reloaded.greetedToday(DateTime(2026, 10, 29)), isFalse);
    expect(reloaded.restShownToday(day), isTrue);
  });

  testWidgets('personalizar guarda el accesorio elegido', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({});
    final settings = AppSettings();
    await settings.load();
    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: settings,
      child: MaterialApp(
        theme: buildAikoTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: child!,
        ),
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const PersonalizeScreen()),
                ),
                child: const Text('abrir'),
              ),
            ),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('abrir'));
    await tester.pumpAndSettle();
    final option = find.bySemanticsLabel('Audífonos');
    await tester.ensureVisible(option);
    await tester.pumpAndSettle();
    await tester.tap(option);
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Guardar'));
    await tester.pumpAndSettle();
    expect(settings.accessory, AikoAccessory.audifonos);
  });
}
