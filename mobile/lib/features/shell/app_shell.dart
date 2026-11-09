import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../exercises/exercises_screen.dart';
import '../home/home_screen.dart';
import '../progress/progress_screen.dart';
import '../settings/settings_screen.dart';
import '../../widgets/motion.dart';

/// Pestaña visible; las pantallas la escuchan para recargar al volver.
class ShellTab extends ValueNotifier<int> {
  ShellTab() : super(0);

  static const home = 0;
  static const progress = 1;
  static const exercises = 2;
  static const settings = 3;
}

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell>
    with SingleTickerProviderStateMixin {
  final _tab = ShellTab();
  late final AnimationController _fade = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 320),
    value: 1,
  );

  static const _screens = <Widget>[
    HomeScreen(),
    ProgressScreen(),
    ExercisesScreen(),
    SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // También reacciona si otra pantalla cambia la pestaña (p. ej. "Ver mi
    // progreso" al terminar la rutina).
    _tab.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    if (!mounted) return;
    setState(() {});
    if (!reduceMotion(context)) _fade.forward(from: 0);
  }

  void _select(int index) {
    if (index == _tab.value) return;
    _tab.value = index;
  }

  @override
  void dispose() {
    _tab.removeListener(_onTabChanged);
    _fade.dispose();
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final curve = CurvedAnimation(parent: _fade, curve: Curves.easeOutCubic);
    return ChangeNotifierProvider<ShellTab>.value(
      value: _tab,
      child: Scaffold(
        // Fundido + leve desplazamiento al cambiar de pestaña; IndexedStack
        // conserva el estado (scroll, datos) de cada una.
        body: FadeTransition(
          opacity: curve,
          child: SlideTransition(
            position: Tween(begin: const Offset(0, 0.02), end: Offset.zero)
                .animate(curve),
            child: IndexedStack(index: _tab.value, children: _screens),
          ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _tab.value,
          onDestinationSelected: _select,
          animationDuration: const Duration(milliseconds: 400),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Inicio',
            ),
            NavigationDestination(
              icon: Icon(Icons.insights_outlined),
              selectedIcon: Icon(Icons.insights_rounded),
              label: 'Seguimiento',
            ),
            NavigationDestination(
              icon: Icon(Icons.extension_outlined),
              selectedIcon: Icon(Icons.extension_rounded),
              label: 'Ejercicios',
            ),
            NavigationDestination(
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings_rounded),
              label: 'Ajustes',
            ),
          ],
        ),
      ),
    );
  }
}

/// Ejecuta [onActivated] cada vez que la pestaña [index] vuelve a verse.
mixin ReloadOnTab<T extends StatefulWidget> on State<T> {
  int get tabIndex;
  void onTabActivated();

  ShellTab? _tab;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    ShellTab? tab;
    try {
      tab = context.read<ShellTab>();
    } on ProviderNotFoundException {
      tab = null; // Pantalla abierta fuera del contenedor de pestañas.
    }
    if (!identical(tab, _tab)) {
      _tab?.removeListener(_listener);
      _tab = tab?..addListener(_listener);
    }
  }

  void _listener() {
    if (_tab?.value == tabIndex && mounted) onTabActivated();
  }

  @override
  void dispose() {
    _tab?.removeListener(_listener);
    super.dispose();
  }
}
