import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'features/auth/login_screen.dart';
import 'features/shell/app_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final session = Session(ApiClient())..restore();
  runApp(
    ChangeNotifierProvider.value(value: session, child: const AikoApp()),
  );
}

class AikoApp extends StatelessWidget {
  const AikoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AiKO',
      debugShowCheckedModeBanner: false,
      theme: buildAikoTheme(),
      home: Consumer<Session>(
        builder: (_, session, __) {
          if (!session.ready) {
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          }
          return session.isAuthenticated ? const AppShell() : const LoginScreen();
        },
      ),
    );
  }
}
