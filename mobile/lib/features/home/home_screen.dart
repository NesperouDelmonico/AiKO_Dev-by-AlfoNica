import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/dates.dart';
import '../../core/game_style.dart';
import '../../core/models.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import '../shell/app_shell.dart';
import 'exercise_detail_screen.dart';
import 'home_repository.dart';

/// Pantalla principal: la ruta terapéutica como un camino ilustrado por
/// días, con la mascota acompañando el ejercicio siguiente.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with ReloadOnTab<HomeScreen> {
  late Future<HomeData> _future;
  final _nextKey = GlobalKey();
  bool _scrolledToNext = false;

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

  Future<void> _refresh({bool rescroll = true}) async {
    final next = _load();
    setState(() {
      _future = next;
      if (rescroll) _scrolledToNext = false;
    });
    try {
      await next;
    } catch (_) {
      // El error se muestra en el FutureBuilder.
    }
  }

  Future<void> _open(
    String routeId,
    RouteExercise item, {
    required bool isNext,
    String? lockedMessage,
  }) async {
    final played = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => ExerciseDetailScreen(
        routeId: routeId,
        item: item,
        isNext: isNext,
        lockedMessage: lockedMessage,
      ),
    ));
    // Tras jugar, recarga la ruta y el XP.
    if (played == true && mounted) await _refresh();
  }

  /// Lleva el camino hasta el ejercicio siguiente la primera vez que carga.
  void _scrollToNextOnce() {
    if (_scrolledToNext) return;
    _scrolledToNext = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _nextKey.currentContext;
      if (target == null || !target.mounted) return;
      Scrollable.ensureVisible(
        target,
        alignment: 0.45,
        duration: reduceMotion(context)
            ? Duration.zero
            : const Duration(milliseconds: 700),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AikoColors.softGradient),
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
            final route = data.route;
            if (route != null && route.next != null) _scrollToNextOnce();
            return Column(
              children: [
                _TopBar(profile: data.profile),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 40),
                      children: route == null || route.ejercicios.isEmpty
                          ? const [_EmptyRoute()]
                          : _route(route),
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

  List<Widget> _route(ActiveRoute route) {
    final next = route.next;
    final agenda = route.agenda;
    // El siguiente ejercicio puede estar esperando a que llegue su fecha.
    final playable = next != null && agenda.isPlayable(next.dia);
    final unlockDate = agenda.disponibleDesde == null
        ? null
        : shortDate(agenda.disponibleDesde!);
    final days = route.days;
    final totalDays = agenda.duracionDias ?? days.length;
    final lockedMessage = next != null && !playable && unlockDate != null
        ? 'Se habilita el $unlockDate. ¡Hoy ya cumpliste!'
        : null;

    void openNext() {
      if (next == null) return;
      _open(route.id, next, isNext: playable, lockedMessage: lockedMessage);
    }

    final currentDay = next == null
        ? null
        : days.firstWhere((day) => day.ejercicios.contains(next));

    return [
      if (currentDay != null)
        FadeSlideIn(
          child: _ContinueCard(
            day: currentDay,
            totalDays: totalDays,
            exercise: next!,
            playable: playable,
            unlockDate: unlockDate,
            onTap: openNext,
          ),
        )
      else
        const FadeSlideIn(child: _RouteDoneCard()),
      const SizedBox(height: 24),
      for (final day in days)
        _DaySection(
          day: day,
          totalDays: totalDays,
          next: next,
          playable: playable,
          waitingLabel: unlockDate == null ? 'MAÑANA' : 'EL ${unlockDate.toUpperCase()}',
          lockedUntil:
              day.dia == agenda.diaActual && !agenda.disponible ? unlockDate : null,
          upcoming: day.dia > agenda.diaActual,
          nextKey: _nextKey,
          onOpen: (item) {
            final isNext = item.id == next?.id;
            _open(
              route.id,
              item,
              isNext: isNext && playable,
              lockedMessage: isNext ? lockedMessage : null,
            );
          },
        ),
    ];
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
          const AikoMascot(size: 40, animate: false),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name.isEmpty ? '¡Hola!' : '¡Hola, $name!',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                const Text('Sigue tu camino',
                    style: TextStyle(fontSize: 13, color: AikoColors.inkSoft)),
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
          border: Border.all(color: AikoColors.lilacSoft, width: 2),
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

/// Tarjeta "Continuar": día en curso, avance y acceso directo al siguiente.
class _ContinueCard extends StatelessWidget {
  const _ContinueCard({
    required this.day,
    required this.totalDays,
    required this.exercise,
    required this.playable,
    required this.unlockDate,
    required this.onTap,
  });

  final RouteDay day;
  final int totalDays;
  final RouteExercise exercise;
  final bool playable;
  final String? unlockDate;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final style = GameStyle.of(exercise.ejercicio.tipo);
    final progress = day.total == 0 ? 0.0 : day.done / day.total;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: AikoColors.heroGradient,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: AikoColors.violet.withValues(alpha: 0.35),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Brillos decorativos.
          const Positioned(right: 18, top: 14, child: _Twinkle(size: 18)),
          const Positioned(right: 64, top: 40, child: _Twinkle(size: 10, delay: 700)),
          Positioned(
            right: -6,
            bottom: -18,
            child: AikoMascot(
              size: 92,
              color: AikoColors.lilac,
              earColor: AikoColors.lilacSoft,
              happy: playable,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 110, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  totalDays > 1
                      ? 'DÍA ${day.numero} DE $totalDays'
                      : 'TU RUTA DE HOY',
                  style: TextStyle(
                    fontSize: 13,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w900,
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  playable ? exercise.ejercicio.nombre : 'Mañana seguimos',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                const SizedBox(height: 2),
                Text(
                  playable
                      ? style.label
                      : 'Tu siguiente ejercicio se habilita el ${unlockDate ?? 'próximo día'}',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.9)),
                ),
                const SizedBox(height: 12),
                Semantics(
                  label: '${day.done} de ${day.total} ejercicios del día',
                  excludeSemantics: true,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: progress),
                      duration: reduceMotion(context)
                          ? Duration.zero
                          : const Duration(milliseconds: 900),
                      curve: Curves.easeOutCubic,
                      builder: (context, value, _) => LinearProgressIndicator(
                        value: value,
                        minHeight: 10,
                        color: AikoColors.star,
                        backgroundColor: Colors.white.withValues(alpha: 0.25),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Pressable(
                  onTap: onTap,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: const [
                        BoxShadow(color: AikoColors.violetDeep, offset: Offset(0, 4)),
                      ],
                    ),
                    child: Text(
                      playable ? 'CONTINUAR' : 'VER EJERCICIO',
                      style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                          color: AikoColors.violet),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sección de un día: encabezado + camino ilustrado + trofeo

class _DaySection extends StatelessWidget {
  const _DaySection({
    required this.day,
    required this.totalDays,
    required this.next,
    required this.playable,
    required this.waitingLabel,
    required this.lockedUntil,
    required this.upcoming,
    required this.nextKey,
    required this.onOpen,
  });

  final RouteDay day;
  final int totalDays;
  final RouteExercise? next;
  final bool playable;
  final String waitingLabel;
  final String? lockedUntil;
  final bool upcoming;
  final GlobalKey nextKey;
  final ValueChanged<RouteExercise> onOpen;

  static const _spacing = 118.0;
  // Espacio para el globo "COMENZAR" si el primer ejercicio es el siguiente.
  static const _top = 100.0;
  static const _pattern = [0.0, 0.55, 0.85, 0.55, 0.0, -0.55, -0.85, -0.55];

  @override
  Widget build(BuildContext context) {
    final theme = DayTheme.of(day.numero);
    final items = day.ejercicios;
    final isCurrent = next != null && items.contains(next);
    final height = _top + items.length * _spacing + 120;

    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        children: [
          FadeSlideIn(
            child: _DayBanner(
              day: day,
              theme: theme,
              totalDays: totalDays,
              isCurrent: isCurrent && playable,
              lockedUntil: lockedUntil,
              upcoming: upcoming,
            ),
          ),
          LayoutBuilder(builder: (context, constraints) {
            final width = constraints.maxWidth;
            final amplitude = min(width * 0.28, 110.0);
            Offset center(int i) => Offset(
                  width / 2 + _pattern[i % _pattern.length] * amplitude,
                  _top + i * _spacing,
                );
            final points = [for (var i = 0; i < items.length; i++) center(i)];
            final trophy = Offset(width / 2, _top + items.length * _spacing + 8);
            final done = items.takeWhile((item) => item.isCompleted).length;
            final decorations = _decorations(day.numero, width, height);

            return SizedBox(
              height: height,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  // Camino.
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _RoadPainter(
                        points: [...points, trophy],
                        doneSegments: done,
                        color: theme.color,
                        soft: theme.soft,
                      ),
                    ),
                  ),
                  // Brillos y puntos de fondo.
                  for (final d in decorations)
                    Positioned(
                      left: d.position.dx,
                      top: d.position.dy,
                      child: d.star
                          ? _Twinkle(size: d.size, delay: d.delay, color: theme.color)
                          : _Dot(size: d.size, color: theme.color),
                    ),
                  // Ejercicios.
                  for (var i = 0; i < items.length; i++)
                    _positioned(
                      context,
                      points[i],
                      i,
                      items[i],
                      theme,
                      width,
                    ),
                  // Fin del día.
                  Positioned(
                    left: trophy.dx - 42,
                    top: trophy.dy - 34,
                    child: FadeSlideIn(
                      delay: Duration(milliseconds: 120 + items.length * 90),
                      child: _DayEnd(day: day, theme: theme),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _positioned(
    BuildContext context,
    Offset center,
    int index,
    RouteExercise item,
    DayTheme theme,
    double width,
  ) {
    final isNext = item.id == next?.id;
    final state = item.isCompleted
        ? _NodeState.done
        : isNext
            ? (playable ? _NodeState.next : _NodeState.waiting)
            : _NodeState.locked;
    const box = 150.0;
    final node = FadeSlideIn(
      delay: Duration(milliseconds: 80 + index * 90),
      child: _ExerciseNode(
        key: isNext ? nextKey : null,
        item: item,
        state: state,
        theme: theme,
        waitingLabel: waitingLabel,
        onTap: () => onOpen(item),
      ),
    );
    // La mascota acompaña al siguiente, del lado con más espacio.
    final mascotOnLeft = center.dx > width / 2;
    return Positioned(
      left: center.dx - box / 2,
      // El centro del círculo queda sobre el camino.
      top: center.dy - _ExerciseNode.outerRadius(state),
      width: box,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.topCenter,
        children: [
          node,
          if (isNext)
            Positioned(
              top: 40,
              left: mascotOnLeft ? -112 : null,
              right: mascotOnLeft ? null : -112,
              child: FadeSlideIn(
                delay: const Duration(milliseconds: 500),
                offset: Offset(mascotOnLeft ? -20 : 20, 0),
                child: _Companion(
                  text: playable ? '¡Tú puedes!' : '¡Mañana seguimos!',
                  tailLeft: !mascotOnLeft,
                ),
              ),
            ),
        ],
      ),
    );
  }

  static List<_Decoration> _decorations(int seed, double width, double height) {
    final random = Random(seed * 7919);
    final count = 3 + (height ~/ 260);
    return [
      for (var i = 0; i < count; i++)
        _Decoration(
          position: Offset(
            // A los lados, lejos del centro del camino.
            random.nextBool()
                ? 6 + random.nextDouble() * width * 0.12
                : width * 0.86 + random.nextDouble() * width * 0.1,
            70 + random.nextDouble() * (height - 140),
          ),
          size: 8 + random.nextDouble() * 12,
          star: random.nextDouble() < 0.6,
          delay: random.nextInt(1600),
        ),
    ];
  }
}

class _Decoration {
  const _Decoration({
    required this.position,
    required this.size,
    required this.star,
    required this.delay,
  });

  final Offset position;
  final double size;
  final bool star;
  final int delay;
}

/// Camino grueso con curvas; la parte recorrida va en el color del día y la
/// pendiente, punteada.
class _RoadPainter extends CustomPainter {
  _RoadPainter({
    required this.points,
    required this.doneSegments,
    required this.color,
    required this.soft,
  });

  final List<Offset> points;
  final int doneSegments;
  final Color color;
  final Color soft;

  Path _segment(Offset a, Offset b) {
    final dy = (b.dy - a.dy) / 2;
    return Path()
      ..moveTo(a.dx, a.dy)
      ..cubicTo(a.dx, a.dy + dy, b.dx, b.dy - dy, b.dx, b.dy);
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;
    final base = Paint()
      ..color = soft
      ..style = PaintingStyle.stroke
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;
    final doneStroke = Paint()
      ..color = color.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;
    final dash = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < points.length - 1; i++) {
      final path = _segment(points[i], points[i + 1]);
      canvas.drawPath(path, i < doneSegments ? doneStroke : base);
      if (i >= doneSegments) {
        for (final metric in path.computeMetrics()) {
          for (var d = 10.0; d < metric.length - 10; d += 22) {
            canvas.drawPath(metric.extractPath(d, d + 8), dash);
          }
        }
      }
    }
  }

  @override
  bool shouldRepaint(_RoadPainter old) =>
      old.doneSegments != doneSegments ||
      old.color != color ||
      old.points.length != points.length ||
      (old.points.isNotEmpty && points.isNotEmpty && old.points.first != points.first);
}

/// Estrella que titila.
class _Twinkle extends StatelessWidget {
  const _Twinkle({required this.size, this.delay = 0, this.color = AikoColors.star});

  final double size;
  final int delay;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Breathing(
        period: Duration(milliseconds: 2200 + delay),
        builder: (context, t, child) => Opacity(
          opacity: 0.45 + 0.55 * t,
          child: Transform.scale(scale: 0.8 + 0.25 * t, child: child),
        ),
        child: SparkleStar(
          size: size,
          color: color == AikoColors.star ? color : color.withValues(alpha: 0.55),
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: Container(
          width: size * 0.6,
          height: size * 0.6,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: 0.18),
          ),
        ),
      );
}

/// Mascota con globo de diálogo junto al ejercicio siguiente.
class _Companion extends StatelessWidget {
  const _Companion({required this.text, required this.tailLeft});

  final String text;
  final bool tailLeft;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 108,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SpeechBubble(text: text, tailLeft: tailLeft),
          const SizedBox(height: 4),
          const AikoMascot(size: 62),
        ],
      ),
    );
  }
}

class _DayBanner extends StatelessWidget {
  const _DayBanner({
    required this.day,
    required this.theme,
    required this.totalDays,
    required this.isCurrent,
    this.lockedUntil,
    this.upcoming = false,
  });

  final RouteDay day;
  final DayTheme theme;
  final int totalDays;
  final bool isCurrent;
  final String? lockedUntil;
  final bool upcoming;

  @override
  Widget build(BuildContext context) {
    final complete = day.isComplete;
    final locked = !complete && (lockedUntil != null || upcoming);
    final subtitle = complete
        ? '¡Día completado!'
        : lockedUntil != null
            ? 'Se habilita el $lockedUntil'
            : upcoming
                ? 'Próximamente · ${day.total} ejercicios'
                : '${day.done} de ${day.total} ejercicios';
    final title =
        totalDays > 1 ? 'DÍA ${day.numero} DE $totalDays' : 'DÍA ${day.numero}';
    final background = locked ? const Color(0xFFE6E1EF) : theme.color;
    final foreground = locked ? AikoColors.inkSoft : Colors.white;
    return Semantics(
      header: true,
      label: '$title. $subtitle',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 14, 16, 14),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: locked ? const Color(0xFFCFC8DC) : theme.deep,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                          fontSize: 13,
                          letterSpacing: 1.2,
                          fontWeight: FontWeight.w900,
                          color: foreground.withValues(alpha: 0.85))),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: TextStyle(
                          fontSize: 19, fontWeight: FontWeight.w900, color: foreground)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: locked ? 0.6 : 0.2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                complete
                    ? Icons.check_circle_rounded
                    : locked
                        ? Icons.lock_clock_rounded
                        : isCurrent
                            ? Icons.directions_walk_rounded
                            : Icons.calendar_today_rounded,
                size: 28,
                color: foreground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Cierre del día: trofeo que brilla cuando el día está completo.
class _DayEnd extends StatelessWidget {
  const _DayEnd({required this.day, required this.theme});

  final RouteDay day;
  final DayTheme theme;

  @override
  Widget build(BuildContext context) {
    final complete = day.isComplete;
    final trophy = _RaisedCircle(
      size: 68,
      color: complete ? AikoColors.star : const Color(0xFFE6E1EF),
      shadow: complete ? AikoColors.starDeep : const Color(0xFFCFC8DC),
      child: Icon(
        Icons.emoji_events_rounded,
        size: 36,
        color: complete ? const Color(0xFF8A5A00) : AikoColors.inkSoft,
      ),
    );
    return Semantics(
      label: complete
          ? 'Fin del día ${day.numero}, completado'
          : 'Fin del día ${day.numero}',
      excludeSemantics: true,
      child: SizedBox(
        width: 84,
        child: Column(
          children: [
            if (complete)
              Breathing(
                period: const Duration(milliseconds: 1800),
                child: trophy,
                builder: (context, t, child) =>
                    Transform.rotate(angle: (t - 0.5) * 0.12, child: child),
              )
            else
              trophy,
            const SizedBox(height: 6),
            Text('FIN DEL DÍA',
                style: TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.1,
                    fontWeight: FontWeight.w900,
                    color: complete ? theme.deep : AikoColors.inkSoft)),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Nodos

enum _NodeState { done, next, waiting, locked }

class _ExerciseNode extends StatelessWidget {
  const _ExerciseNode({
    super.key,
    required this.item,
    required this.state,
    required this.theme,
    required this.onTap,
    required this.waitingLabel,
  });

  final RouteExercise item;
  final _NodeState state;
  final DayTheme theme;
  final VoidCallback onTap;
  final String waitingLabel;

  static Color _darken(Color color) {
    final hsl = HSLColor.fromColor(color);
    return hsl.withLightness((hsl.lightness - 0.14).clamp(0.0, 1.0)).toColor();
  }

  /// Distancia del borde superior del nodo al centro del círculo.
  static double outerRadius(_NodeState state) =>
      state == _NodeState.next ? 44 + _haloPadding + _haloBorder : 38;

  static const _haloPadding = 7.0;
  static const _haloBorder = 5.0;

  @override
  Widget build(BuildContext context) {
    final exercise = item.ejercicio;
    final style = GameStyle.of(exercise.tipo);
    final status = switch (state) {
      _NodeState.done => 'completado',
      _NodeState.next => 'siguiente, toca para comenzar',
      _NodeState.waiting => 'siguiente, se habilita otro día',
      _NodeState.locked => 'bloqueado',
    };
    final (Color fill, Color shadow, Color icon) = switch (state) {
      _NodeState.done => (theme.color, _darken(theme.color), Colors.white),
      _NodeState.next => (theme.color, theme.deep, Colors.white),
      _NodeState.waiting => (theme.soft, _darken(theme.soft), theme.deep),
      _NodeState.locked => (
          const Color(0xFFE6E1EF),
          const Color(0xFFCFC8DC),
          const Color(0xFFA59EB8)
        ),
    };
    final big = state == _NodeState.next;
    // Hero: el círculo "vuela" a la cabecera del detalle al abrirlo.
    Widget circle = Hero(
      tag: exerciseHeroTag(item),
      child: _RaisedCircle(
      size: big ? 88 : 76,
      color: fill,
      shadow: shadow,
      child: Icon(
        state == _NodeState.done
            ? Icons.check_rounded
            : state == _NodeState.waiting
                ? Icons.lock_clock_rounded
                : style.icon,
        size: big ? 42 : 36,
        color: icon,
      ),
      ),
    );
    if (state == _NodeState.done) {
      circle = Stack(
        clipBehavior: Clip.none,
        children: [
          circle,
          const Positioned(right: -4, top: -6, child: SparkleStar(size: 22)),
        ],
      );
    }
    if (big) {
      // Halo que late alrededor del siguiente.
      circle = Breathing(
        period: const Duration(milliseconds: 1500),
        child: circle,
        // Solo cambia el color: el tamaño fijo no mueve el diseño.
        builder: (context, t, child) => Container(
          padding: const EdgeInsets.all(_haloPadding),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: theme.color.withValues(alpha: 0.2 + 0.4 * t),
              width: _haloBorder,
            ),
          ),
          child: child,
        ),
      );
    }

    return Semantics(
      button: true,
      label: '${exercise.nombre}, ${style.label}, $status',
      excludeSemantics: true,
      child: Pressable(
        onTap: onTap,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                circle,
                const SizedBox(height: 6),
                Text(
                  exercise.nombre,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: state == _NodeState.locked ? AikoColors.inkSoft : AikoColors.ink,
                  ),
                ),
              ],
            ),
            // El globo flota sobre el círculo sin ocupar espacio.
            if (state == _NodeState.next)
              Positioned(
                top: -62,
                child: _BouncingBubble(label: 'COMENZAR', color: theme.color),
              ),
            if (state == _NodeState.waiting)
              Positioned(
                top: -60,
                child: _BouncingBubble(label: waitingLabel, color: theme.deep, still: true),
              ),
          ],
        ),
      ),
    );
  }
}

/// Círculo con "borde inferior" más oscuro, para dar sensación de botón.
class _RaisedCircle extends StatelessWidget {
  const _RaisedCircle({
    required this.size,
    required this.color,
    required this.shadow,
    required this.child,
  });

  final double size;
  final Color color;
  final Color shadow;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: size,
      width: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: shadow, offset: const Offset(0, 7))],
        gradient: RadialGradient(
          center: const Alignment(-0.35, -0.45),
          radius: 0.9,
          colors: [Color.lerp(color, Colors.white, 0.18)!, color],
        ),
      ),
      child: child,
    );
  }
}

/// Globo "COMENZAR" que rebota suavemente sobre el nodo siguiente.
class _BouncingBubble extends StatelessWidget {
  const _BouncingBubble({required this.label, required this.color, this.still = false});

  final String label;
  final Color color;
  final bool still;

  @override
  Widget build(BuildContext context) {
    final bubble = Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: color.withValues(alpha: 0.35), width: 2),
            ),
            child: Text(label,
                style: TextStyle(
                    fontSize: 14,
                    letterSpacing: 1,
                    fontWeight: FontWeight.w900,
                    color: color)),
          ),
          CustomPaint(size: const Size(16, 8), painter: _ArrowPainter(color.withValues(alpha: 0.35))),
        ],
      ),
    );
    if (still) return bubble;
    return Breathing(
      period: const Duration(milliseconds: 1200),
      child: bubble,
      builder: (context, t, child) =>
          Transform.translate(offset: Offset(0, -6 * t), child: child),
    );
  }
}

class _ArrowPainter extends CustomPainter {
  _ArrowPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_ArrowPainter old) => old.color != color;
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
              _Twinkle(size: 16),
              SizedBox(width: 8),
              AikoMascot(size: 80, happy: true),
              SizedBox(width: 8),
              _Twinkle(size: 22, delay: 500),
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
      padding: EdgeInsets.only(top: 48),
      child: Column(
        children: [
          SpeechBubble(text: 'Tu especialista está preparando tu ruta.'),
          SizedBox(height: 8),
          AikoMascot(size: 120),
          SizedBox(height: 16),
          Text('Aún no tienes ejercicios',
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
