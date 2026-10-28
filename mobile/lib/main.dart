import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart';
import 'core/app_settings.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'features/auth/welcome_screen.dart';
import 'features/shell/app_shell.dart';
import 'widgets/mascot.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final session = Session(ApiClient())..restore();
  final settings = AppSettings()..load();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: session),
        ChangeNotifierProvider.value(value: settings),
      ],
      child: const AikoApp(),
    ),
  );
}

class AikoApp extends StatefulWidget {
  const AikoApp({super.key});

  @override
  State<AikoApp> createState() => _AikoAppState();
}

class _AikoAppState extends State<AikoApp> {
  final _navigator = GlobalKey<NavigatorState>();
  bool? _wasAuthenticated;

  /// Al iniciar o cerrar sesión se vuelve a la raíz: el inicio de sesión
  /// (u otra pantalla abierta) no queda encima del Inicio o la Bienvenida.
  void _onSession(Session session) {
    if (!session.ready) return;
    final now = session.isAuthenticated;
    if (_wasAuthenticated != null && _wasAuthenticated != now) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _navigator.currentState?.popUntil((route) => route.isFirst),
      );
    }
    _wasAuthenticated = now;
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<AppSettings>();
    return MaterialApp(
      navigatorKey: _navigator,
      title: 'AiKO',
      debugShowCheckedModeBanner: false,
      theme: buildAikoTheme(),
      // Aplica el tamaño de letra y "reducir animaciones" de Ajustes.
      builder: (context, child) {
        final media = MediaQuery.of(context);
        return MediaQuery(
          data: media.copyWith(
            textScaler: TextScaler.linear(
                media.textScaler.scale(1) * settings.textSize.scale),
            disableAnimations: media.disableAnimations || settings.reduceMotion,
          ),
          child: child!,
        );
      },
      home: Consumer<Session>(
        builder: (_, session, __) {
          _onSession(session);
          // Arranque → Bienvenida → Inicio de sesión (o Inicio si ya hay sesión).
          return AnimatedSwitcher(
            duration: const Duration(milliseconds: 450),
            child: !session.ready
                ? const _Splash(key: ValueKey('splash'))
                : session.isAuthenticated
                    ? const AppShell(key: ValueKey('shell'))
                    : const WelcomeScreen(key: ValueKey('welcome')),
          );
        },
      ),
    );
  }
}

/// Mientras se recupera la sesión: mascota sobre el morado de marca
/// (continúa la pantalla de arranque nativa).
class _Splash extends StatelessWidget {
  const _Splash({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AikoColors.violet,
      body: Center(
        child: AikoMascot(size: 120, color: AikoColors.lilac, earColor: AikoColors.lilacSoft),
      ),
    );
  }
}
