import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:aiko_mobile/core/api_client.dart';
import 'package:aiko_mobile/core/session.dart';
import 'package:aiko_mobile/core/theme.dart';
import 'package:aiko_mobile/features/auth/login_screen.dart';
import 'package:aiko_mobile/features/auth/welcome_screen.dart';

void main() {
  test('la frase de bienvenida cambia por día y se repite en ciclo', () {
    final first = phraseOfTheDay(DateTime(2026, 10, 28));
    expect(welcomePhrases, contains(first));
    expect(phraseOfTheDay(DateTime(2026, 10, 28, 23, 59)), first);
    expect(phraseOfTheDay(DateTime(2026, 10, 29)), isNot(first));
    expect(
      phraseOfTheDay(DateTime(2026, 10, 28 + welcomePhrases.length)),
      first,
    );
  });

  testWidgets('la bienvenida muestra la marca y abre el inicio de sesión',
      (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => Session(ApiClient()),
        child: MaterialApp(
          theme: buildAikoTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: child!,
          ),
          home: const WelcomeScreen(),
        ),
      ),
    );
    await tester.pump();
    expect(find.bySemanticsLabel('AiKO'), findsWidgets);
    expect(find.text('Tu especialista te entrega tu cuenta.'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Iniciar sesión'));
    await tester.pumpAndSettle();
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.text('Correo electrónico'), findsOneWidget);
    // Se puede volver a la bienvenida.
    expect(find.byType(BackButton), findsOneWidget);
  });
}
