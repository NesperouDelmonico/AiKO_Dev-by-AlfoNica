import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/dates.dart';
import '../../core/island_theme.dart';
import '../../core/models.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/brand_image.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import '../shell/app_shell.dart';
import 'day_screen.dart';
import 'home_repository.dart';
import 'island_art.dart';
import 'routine_done_screen.dart';

/// Pantalla principal: la ruta terapéutica como un mapa de islas, una por
/// día. Al tocar una isla se abre el panel con los ejercicios de ese día.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with ReloadOnTab<HomeScreen> {
  late Future<HomeData> _future;
  final _currentKey = GlobalKey();
  bool _scrolledToCurrent = false;

  @override
  int get tabIndex => ShellTab.home;

  @override
  void onTabActivated() => _refresh(rescroll: false);

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<HomeData> _load() {
    final session = context.read<Session>();
    return HomeRepository(session.api).load(session.pacienteId);
  }

  Future<HomeData?> _refresh({bool rescroll = true}) async {
    final next = _load();
    setState(() {
      _future = next;
      if (rescroll) _scrolledToCurrent = false;
    });
    try {
      return await next;
    } catch (_) {
      return null; // El error se muestra en el FutureBuilder.
    }
  }

  Future<void> _openDay(ActiveRoute route, RouteDay day, int totalDays) async {
    final action = await Navigator.of(context).push(PageRouteBuilder<RoutineDoneAction>(
      transitionDuration: const Duration(milliseconds: 520),
      reverseTransitionDuration: const Duration(milliseconds: 380),
      pageBuilder: (_, __, ___) => DayScreen(
        route: route,
        day: day,
        totalDays: totalDays,
        reload: () async => (await _refresh(rescroll: false))?.route,
      ),
      transitionsBuilder: (_, animation, __, child) => FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
        child: child,
      ),
    ));
    if (action == RoutineDoneAction.progress && mounted) {
      context.read<ShellTab>().value = ShellTab.progress;
    }
  }

  /// Lleva el mapa hasta la isla de hoy la primera vez que carga.
  void _scrollToCurrentOnce() {
    if (_scrolledToCurrent) return;
    _scrolledToCurrent = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _currentKey.currentContext;
      if (target == null || !target.mounted) return;
      Scrollable.ensureVisible(
        target,
        alignment: 0.4,
        duration: reduceMotion(context) ? Duration.zero : const Duration(milliseconds: 700),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return SeaBackground(
      child: SafeArea(
        child: FutureBuilder<HomeData>(
          future: _future,
          builder: (context, snapshot) {
            final loading = snapshot.connectionState != ConnectionState.done;
            // Al recargar se siguen mostrando los datos anteriores.
            if (!snapshot.hasData && loading) {
              return const Center(child: AikoMascot(size: 84));
            }
            if (snapshot.hasError && !loading) {
              final error = snapshot.error;
              return _MessageState(
                title: 'No pudimos cargar tu información',
                message: error is ApiException
                    ? error.message
                    : 'Revisa tu conexión e inténtalo de nuevo.',
                actionLabel: 'Reintentar',
                onAction: _refresh,
              );
            }
            final data = snapshot.data!;
            final candidate = data.route;
            final route =
                candidate != null && candidate.ejercicios.isNotEmpty ? candidate : null;
            if (route != null) _scrollToCurrentOnce();
            final days = route?.days ?? const <RouteDay>[];
            final totalDays = route?.agenda.duracionDias ?? days.length;
            final current = route == null ? null : _currentDay(route);
            return Stack(
              children: [
                Column(
                  children: [
                    _TopBar(profile: data.profile),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: _refresh,
                        child: ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(0, 4, 0, 120),
                          children: route == null
                              ? const [_EmptyRoute()]
                              : [
                                  if (route.next == null)
                                    const Padding(
                                      padding: EdgeInsets.fromLTRB(16, 4, 16, 8),
                                      child: FadeSlideIn(child: _RouteDoneCard()),
                                    ),
                                  IslandMap(
                                    route: route,
                                    days: days,
                                    totalDays: totalDays,
                                    currentKey: _currentKey,
                                    onOpen: (day) => _openDay(route, day, totalDays),
                                  ),
                                ],
                        ),
                      ),
                    ),
                  ],
                ),
                if (route != null && current != null)
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 14,
                    child: FadeSlideIn(
                      delay: const Duration(milliseconds: 400),
                      offset: const Offset(0, 30),
                      child: _ContinueBar(
                        day: current,
                        totalDays: totalDays,
                        state: islandState(current, route.agenda),
                        unlockDate: route.agenda.disponibleDesde,
                        onTap: () => _openDay(route, current, totalDays),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  RouteDay? _currentDay(ActiveRoute route) {
    final next = route.next;
    if (next == null) return null;
    return route.days.firstWhere((day) => day.ejercicios.contains(next));
  }
}

// ---------------------------------------------------------------------------
// Mapa de islas

class IslandMap extends StatelessWidget {
  const IslandMap({
    super.key,
    required this.route,
    required this.days,
    required this.totalDays,
    required this.currentKey,
    required this.onOpen,
  });

  final ActiveRoute route;
  final List<RouteDay> days;
  final int totalDays;
  final GlobalKey currentKey;
  final ValueChanged<RouteDay> onOpen;

  static const _xPattern = [0.3, 0.7, 0.34, 0.68, 0.28, 0.72];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final width = constraints.maxWidth;
      final size = min(width * 0.5, 210.0);
      final spacing = size * 0.78 + 44;
      const top = 54.0; // espacio para el oso sobre la primera isla
      // Centro "de tierra" de cada isla (donde llega el camino).
      Offset anchor(int i) => Offset(
            width * _xPattern[i % _xPattern.length],
            top + i * spacing + size * 0.6,
          );
      final count = days.length + 1; // + isla meta
      final points = [for (var i = 0; i < count; i++) anchor(i)];
      final done = days.takeWhile((d) => d.isComplete).length;
      final height = top + (count - 1) * spacing + size + 40;
      final next = route.next;

      return SizedBox(
        height: height,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _SandPathPainter(points: points, doneSegments: done),
              ),
            ),
            for (var i = 0; i < days.length; i++)
              _island(
                context,
                index: i,
                day: days[i],
                center: points[i],
                size: size,
                isCurrent: next != null && days[i].ejercicios.contains(next),
              ),
            _goal(points.last, size * 0.78, done == days.length),
          ],
        ),
      );
    });
  }

  Widget _island(
    BuildContext context, {
    required int index,
    required RouteDay day,
    required Offset center,
    required double size,
    required bool isCurrent,
  }) {
    final theme = IslandTheme.forDay(day);
    final state = islandState(day, route.agenda);
    final unlock = route.agenda.disponibleDesde;
    final status = switch (state) {
      IslandState.done => 'completado',
      IslandState.today => '${day.done} de ${day.total} ejercicios, disponible hoy',
      IslandState.waiting => 'se abre el ${unlock == null ? 'próximo día' : shortDate(unlock)}',
      IslandState.locked => 'bloqueado',
    };
    final art = Hero(
      tag: islandHeroTag(route.id, day.dia),
      child: IslandArt(theme: theme, size: size, locked: state == IslandState.locked),
    );
    return Positioned(
      key: isCurrent ? currentKey : null,
      left: center.dx - size / 2,
      top: center.dy - size * 0.6,
      width: size,
      child: FadeSlideIn(
        delay: Duration(milliseconds: 60 + min(index, 8) * 80),
        child: Semantics(
          button: true,
          label: 'Día ${day.numero}, ${theme.name}, $status',
          excludeSemantics: true,
          child: Pressable(
            onTap: () => onOpen(day),
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.topCenter,
              children: [
                if (isCurrent && state == IslandState.today)
                  Breathing(
                    period: const Duration(milliseconds: 2200),
                    builder: (context, t, child) => Transform.scale(
                      scale: 1 + 0.04 * t,
                      child: child,
                    ),
                    child: art,
                  )
                else
                  art,
                Positioned(
                  bottom: size * 0.08,
                  child: _IslandLabel(
                    day: day,
                    totalDays: totalDays,
                    state: state,
                    theme: theme,
                    unlockDate: unlock,
                  ),
                ),
                if (isCurrent)
                  Positioned(
                    top: size * 0.02 - 46,
                    child: _BearMarker(happy: state == IslandState.today),
                  ),
                if (state == IslandState.done)
                  Positioned(
                    right: size * 0.12,
                    top: size * 0.24,
                    child: const SparkleStar(size: 26),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _goal(Offset center, double size, bool reached) {
    return Positioned(
      left: center.dx - size / 2,
      top: center.dy - size * 0.6,
      width: size,
      child: Semantics(
        label: reached ? 'Meta alcanzada' : 'Meta de la ruta',
        excludeSemantics: true,
        child: Column(
          children: [
            IslandArt(theme: IslandTheme.meta, size: size, locked: !reached),
            Transform.translate(
              offset: Offset(0, -size * 0.2),
              child: _Pill(
                text: reached ? '¡META!' : 'META',
                color: reached ? IslandTheme.meta.deep : AikoColors.inkSoft,
                icon: Icons.emoji_events_rounded,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IslandLabel extends StatelessWidget {
  const _IslandLabel({
    required this.day,
    required this.totalDays,
    required this.state,
    required this.theme,
    required this.unlockDate,
  });

  final RouteDay day;
  final int totalDays;
  final IslandState state;
  final IslandTheme theme;
  final String? unlockDate;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color color, String extra) = switch (state) {
      IslandState.done => (Icons.check_circle_rounded, AikoColors.success, ''),
      IslandState.today => (theme.icon, theme.deep, ' · ${day.done}/${day.total}'),
      IslandState.waiting => (
          Icons.lock_clock_rounded,
          AikoColors.inkSoft,
          unlockDate == null ? '' : ' · ${shortDate(unlockDate!)}'
        ),
      IslandState.locked => (Icons.lock_rounded, AikoColors.inkSoft, ''),
    };
    return _Pill(text: 'Día ${day.numero}$extra', color: color, icon: icon);
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.color, required this.icon});

  final String text;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 5),
            Text(text,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: color)),
          ],
        ),
      );
}

/// AiKO sobre la isla de hoy, flotando.
class _BearMarker extends StatelessWidget {
  const _BearMarker({required this.happy});
  final bool happy;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Breathing(
        period: const Duration(milliseconds: 1400),
        builder: (context, t, child) =>
            Transform.translate(offset: Offset(0, -8 * t), child: child),
        child: BrandImage(
          'bear_map_marker',
          width: 62,
          height: 62,
          fallback: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: AikoColors.violetBright, width: 3),
            ),
            child: AikoMascot(size: 44, animate: false, happy: happy),
          ),
        ),
      ),
    );
  }
}

/// Camino de arena punteado entre islas; lo recorrido se ve dorado.
class _SandPathPainter extends CustomPainter {
  _SandPathPainter({required this.points, required this.doneSegments});

  final List<Offset> points;
  final int doneSegments;

  Path _segment(Offset a, Offset b) {
    final dy = (b.dy - a.dy) / 2;
    return Path()
      ..moveTo(a.dx, a.dy)
      ..cubicTo(a.dx, a.dy + dy, b.dx, b.dy - dy, b.dx, b.dy);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final pending = Paint()..color = Colors.white.withValues(alpha: 0.85);
    final done = Paint()..color = AikoColors.star;
    for (var i = 0; i < points.length - 1; i++) {
      final path = _segment(points[i], points[i + 1]);
      final paint = i < doneSegments ? done : pending;
      for (final metric in path.computeMetrics()) {
        for (var d = 0.0; d < metric.length; d += 20) {
          final p = metric.getTangentForOffset(d)?.position;
          if (p != null) canvas.drawCircle(p, 5, paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(_SandPathPainter old) =>
      old.doneSegments != doneSegments ||
      old.points.length != points.length ||
      (old.points.isNotEmpty && old.points.first != points.first);
}

/// Acceso fijo a la isla de hoy.
class _ContinueBar extends StatelessWidget {
  const _ContinueBar({
    required this.day,
    required this.totalDays,
    required this.state,
    required this.unlockDate,
    required this.onTap,
  });

  final RouteDay day;
  final int totalDays;
  final IslandState state;
  final String? unlockDate;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = IslandTheme.forDay(day);
    final waiting = state != IslandState.today;
    final title = waiting
        ? 'Se abre el ${unlockDate == null ? 'próximo día' : shortDate(unlockDate!)}'
        : day.done == 0
            ? 'Comenzar día ${day.numero}'
            : 'Continuar día ${day.numero}';
    return Semantics(
      button: true,
      label: '$title, ${theme.name}',
      excludeSemantics: true,
      child: Pressable(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(10, 10, 18, 10),
          decoration: BoxDecoration(
            color: waiting ? Colors.white : theme.deep,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: (waiting ? Colors.black : theme.deep).withValues(alpha: 0.22),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: waiting ? theme.soft : Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(waiting ? Icons.lock_clock_rounded : theme.icon,
                    color: waiting ? theme.deep : Colors.white, size: 26),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(title,
                        style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: waiting ? AikoColors.ink : Colors.white)),
                    Text(
                      waiting ? '¡Hoy ya cumpliste!' : '${theme.name} · ${day.done}/${day.total}',
                      style: TextStyle(
                          fontSize: 13,
                          color: waiting ? AikoColors.inkSoft : Colors.white.withValues(alpha: 0.9)),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded,
                  color: waiting ? AikoColors.inkSoft : Colors.white, size: 30),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Cabecera

class _TopBar extends StatelessWidget {
  const _TopBar({required this.profile});

  final AchievementProfile profile;

  @override
  Widget build(BuildContext context) {
    final name = context.select<Session, String>((s) => s.firstName);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name.isEmpty ? '¡Hola!' : '¡Hola, $name!',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                const Text('¿A qué isla quieres viajar hoy?',
                    style: TextStyle(fontSize: 14, color: AikoColors.inkSoft)),
              ],
            ),
          ),
          _StatChip(
            semantics: 'Nivel ${profile.nivel}',
            leading: const SparkleStar(size: 18),
            value: profile.nivel,
            prefix: 'Nv ',
            color: AikoColors.violet,
          ),
          const SizedBox(width: 6),
          _StatChip(
            semantics: '${profile.xp} puntos de experiencia',
            leading: const Icon(Icons.bolt_rounded, size: 20, color: Color(0xFFE07B39)),
            value: profile.xp,
            suffix: ' XP',
            color: const Color(0xFFE07B39),
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.semantics,
    required this.leading,
    required this.value,
    required this.color,
    this.prefix = '',
    this.suffix = '',
  });

  final String semantics;
  final Widget leading;
  final int value;
  final Color color;
  final String prefix;
  final String suffix;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semantics,
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            leading,
            const SizedBox(width: 4),
            if (prefix.isNotEmpty)
              Text(prefix, style: TextStyle(fontWeight: FontWeight.w900, color: color)),
            CountUp(
              value: value,
              suffix: suffix,
              style: TextStyle(fontWeight: FontWeight.w900, color: color),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Estados

class _RouteDoneCard extends StatelessWidget {
  const _RouteDoneCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
      ),
      child: const Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SparkleStar(size: 16),
              SizedBox(width: 8),
              AikoMascot(size: 80, happy: true),
              SizedBox(width: 8),
              SparkleStar(size: 22),
            ],
          ),
          SizedBox(height: 10),
          Text('¡Completaste tu ruta!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          SizedBox(height: 4),
          Text('Tu especialista te asignará nuevos ejercicios.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AikoColors.inkSoft)),
        ],
      ),
    );
  }
}

class _EmptyRoute extends StatelessWidget {
  const _EmptyRoute();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(16, 48, 16, 0),
      child: Column(
        children: [
          SpeechBubble(text: 'Tu especialista está preparando tu ruta.'),
          SizedBox(height: 8),
          AikoMascot(size: 120),
          SizedBox(height: 16),
          Text('Aún no tienes islas por visitar',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          SizedBox(height: 4),
          Text('Desliza hacia abajo para actualizar.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AikoColors.inkSoft)),
        ],
      ),
    );
  }
}

class _MessageState extends StatelessWidget {
  const _MessageState({
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const AikoMascot(size: 96, animate: false),
            const SizedBox(height: 14),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AikoColors.inkSoft)),
            const SizedBox(height: 20),
            FilledButton(onPressed: onAction, child: Text(actionLabel)),
          ],
        ),
      ),
    );
  }
}
