import 'package:flutter/material.dart';

import '../home/home_screen.dart';
import '../settings/settings_screen.dart';
import 'coming_soon_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  static const _screens = <Widget>[
    HomeScreen(),
    ComingSoonScreen(
      title: 'Seguimiento',
      message: 'Aquí verás tu historial y tu progreso por dominio cognitivo.',
      icon: Icons.insights_rounded,
    ),
    ComingSoonScreen(
      title: 'Ejercicios',
      message: 'Aquí estará tu ruta de ejercicios activa.',
      icon: Icons.extension_rounded,
    ),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_rounded), label: 'Inicio'),
          NavigationDestination(icon: Icon(Icons.insights_rounded), label: 'Seguimiento'),
          NavigationDestination(icon: Icon(Icons.extension_rounded), label: 'Ejercicios'),
          NavigationDestination(icon: Icon(Icons.settings_rounded), label: 'Ajustes'),
        ],
      ),
    );
  }
}
