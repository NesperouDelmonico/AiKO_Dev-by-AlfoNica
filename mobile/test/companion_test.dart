import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:aiko_mobile/core/api_client.dart';
import 'package:aiko_mobile/core/app_settings.dart';
import 'package:aiko_mobile/core/session.dart';
import 'package:aiko_mobile/core/theme.dart';
import 'package:aiko_mobile/core/wallet.dart';
import 'package:aiko_mobile/features/companion/companion.dart';
import 'package:aiko_mobile/features/progress/achievements_screen.dart';
import 'package:aiko_mobile/features/settings/personalize_screen.dart';

http.Response _json(Object body) => http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

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

  testWidgets('la tienda compra y le pone el accesorio al osito', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    final settings = AppSettings();
    await settings.load();

    var wallet = <String, dynamic>{
      'monedas': 15,
      'accesorio': 'base',
      'accesorios': ['base'],
      'potenciador_xp_restante': 0,
      'salvadores_racha': 1,
    };
    final calls = <String>[];
    final client = MockClient((request) async {
      final path = request.url.path;
      calls.add('${request.method} $path');
      if (path.endsWith('/tienda')) {
        return _json([
          {'id': 'potenciador_xp', 'nombre': 'Potenciador de XP ×2', 'descripcion': 'XP doble', 'precio': 4, 'tipo': 'potenciador'},
          {'id': 'salvador_racha', 'nombre': 'Salvador de racha', 'descripcion': 'Protege tu racha', 'precio': 6, 'tipo': 'salvador'},
          {'id': 'audifonos', 'nombre': 'Audífonos', 'descripcion': 'Para escuchar', 'precio': 10, 'tipo': 'accesorio'},
        ]);
      }
      if (path.endsWith('/compras')) {
        wallet = {
          ...wallet,
          'monedas': 5,
          'accesorios': ['base', 'audifonos'],
        };
        return _json(wallet);
      }
      if (path.endsWith('/accesorio')) {
        wallet = {...wallet, 'accesorio': 'audifonos'};
        return _json(wallet);
      }
      return _json(wallet);
    });
    final session = Session(ApiClient(client: client))
      ..user = {'id': 'u1', 'nombre': 'Ana', 'rol': 'Paciente', 'paciente_id': 'p1'};
    final store = WalletStore(session, settings);

    await tester.pumpWidget(MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: settings),
        ChangeNotifierProvider.value(value: store),
      ],
      child: MaterialApp(
        theme: buildAikoTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: child!,
        ),
        home: const PersonalizeScreen(),
      ),
    ));
    await tester.pumpAndSettle();
    expect(find.text('Tienda de AiKO'), findsOneWidget);
    final list = find.byType(Scrollable).first;
    await tester.scrollUntilVisible(find.text('Tienes 1 de 3'), 300, scrollable: list);
    expect(find.text('Tienes 1 de 3'), findsOneWidget);

    final option = find.bySemanticsLabel(RegExp('^Audífonos, 10 monedas'));
    await tester.scrollUntilVisible(option, -300, scrollable: list);
    await tester.tap(option);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.textContaining('Comprar por'), -200, scrollable: list);
    await tester.tap(find.textContaining('Comprar por'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Comprar'));
    await tester.pumpAndSettle();
    expect(calls, contains(matches(r'^POST .*/pacientes/p1/compras$')));
    expect(store.wallet!.monedas, 5);

    await tester.tap(find.text('Ponérselo'));
    await tester.pumpAndSettle();
    expect(calls, contains(matches(r'^PUT .*/pacientes/p1/accesorio$')));
    expect(settings.accessory, AikoAccessory.audifonos);
    expect(find.text('Lo lleva puesto'), findsOneWidget);
  });

  test('el monedero entiende la respuesta del servidor', () {
    final wallet = Wallet.fromJson({
      'monedas': 75,
      'accesorio': 'corona',
      'accesorios': ['base', 'corona', 'desconocido'],
      'potenciador_xp_restante': 2,
      'salvadores_racha': 3,
    });
    expect(wallet.monedas, 75);
    expect(wallet.accesorio, AikoAccessory.corona);
    expect(wallet.owns(AikoAccessory.corona), isTrue);
    expect(wallet.owns(AikoAccessory.gafas), isFalse);
    expect(wallet.owns(AikoAccessory.base), isTrue);
    expect(wallet.potenciadorXpRestante, 2);
    expect(wallet.salvadoresRacha, Wallet.maxSavers);
  });
}
