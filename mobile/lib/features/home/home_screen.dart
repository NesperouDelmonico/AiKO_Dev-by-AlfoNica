import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/category_style.dart';
import '../../core/dates.dart';
import '../../core/models.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/aiko_card.dart';
import 'exercise_detail_screen.dart';
import 'home_repository.dart';

/// Pantalla principal: la ruta del paciente como un camino vertical de
/// círculos, agrupado por días (Día 1 · Inicio … Fin, Día 2 · …).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<HomeData> _future;
  final _nextKey = GlobalKey();
  bool _scrolledToNext = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<HomeData> _load() {
    final session = context.read<Session>();
    return HomeRepository(session.api).load(session.pacienteId);
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _future = next;
      _scrolledToNext = false;
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
        alignment: 0.4,
        duration: const Duration(milliseconds: 500),
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
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              final error = snapshot.error;
              return _MessageState(
                icon: Icons.cloud_off_rounded,
                title: 'No pudimos cargar tu información',
                message: error is ApiException
                    ? error.message
                    : 'Revisa tu conexión e inténtalo de nuevo.',
                actionLabel: 'Reintentar',
                onAction: _refresh,
              );
            }
            final data = snapshot.requireData;
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
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                      children: route == null || route.ejercicios.isEmpty
                          ? const [_EmptyRoute()]
                          : _path(route),
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

  List<Widget> _path(ActiveRoute route) {
    final next = route.next;
    final agenda = route.agenda;
    // El siguiente ejercicio puede estar esperando a que llegue su fecha.
    final playable = next != null && agenda.isPlayable(next.dia);
    final unlockDate = agenda.disponibleDesde == null
        ? null
        : shortDate(agenda.disponibleDesde!);
    final widgets = <Widget>[];
    var index = 0; // posición global en el zigzag
    for (final day in route.days) {
      final isCurrent = next != null && day.ejercicios.contains(next);
      widgets
        ..add(_DayBanner(
          day: day,
          isCurrent: isCurrent && playable,
          totalDays: agenda.duracionDias ?? route.days.length,
          lockedUntil: day.dia == agenda.diaActual && !agenda.disponible
              ? unlockDate
              : null,
          upcoming: day.dia > agenda.diaActual,
        ))
        ..add(const SizedBox(height: 18))
        ..add(const _Marker(label: 'INICIO', icon: Icons.flag_rounded));
      for (final item in day.ejercicios) {
        final isNext = item.id == next?.id;
        widgets.add(_ZigZag(
          index: index++,
          child: _ExerciseNode(
            key: isNext ? _nextKey : null,
            item: item,
            state: item.isCompleted
                ? _NodeState.done
                : isNext
                    ? (playable ? _NodeState.next : _NodeState.waiting)
                    : _NodeState.locked,
            waitingLabel: unlockDate == null ? null : 'EL $unlockDate'.toUpperCase(),
            onTap: () => _open(
              route.id,
              item,
              isNext: isNext && playable,
              lockedMessage: isNext && !playable && unlockDate != null
                  ? 'Se habilita el $unlockDate. ¡Hoy ya cumpliste!'
                  : null,
            ),
          ),
        ));
      }
      widgets
        ..add(_DayEnd(day: day))
        ..add(const SizedBox(height: 28));
    }
    if (next == null) widgets.add(const _RouteDoneCard());
    return widgets;
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
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              name.isEmpty ? 'Hola' : 'Hola, $name',
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
          ),
          _Chip(
            icon: Icons.workspace_premium_rounded,
            color: AikoColors.violet,
            text: 'Nivel ${profile.nivel}',
          ),
          const SizedBox(width: 8),
          _Chip(
            icon: Icons.stars_rounded,
            color: const Color(0xFFE07B39),
            text: '${profile.xp} XP',
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.color, required this.text});

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 4),
          Text(text,
              style: TextStyle(fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Día

class _DayBanner extends StatelessWidget {
  const _DayBanner({
    required this.day,
    required this.isCurrent,
    required this.totalDays,
    this.lockedUntil,
    this.upcoming = false,
  });

  final RouteDay day;
  final bool isCurrent;
  final int totalDays;

  /// Fecha corta en que se habilita este día (si es el día en espera).
  final String? lockedUntil;
  final bool upcoming;

  @override
  Widget build(BuildContext context) {
    final complete = day.isComplete;
    final subtitle = complete
        ? '¡Día completado!'
        : lockedUntil != null
            ? 'Se habilita el $lockedUntil'
            : upcoming
                ? 'Próximamente · ${day.total} ejercicios'
                : '${day.done} de ${day.total} ejercicios';
    final title =
        totalDays > 1 ? 'DÍA ${day.numero} DE $totalDays' : 'DÍA ${day.numero}';
    final foreground = isCurrent ? Colors.white : AikoColors.ink;
    return Semantics(
      header: true,
      label: 'Día ${day.numero}. $subtitle',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
        decoration: BoxDecoration(
          gradient: isCurrent
              ? const LinearGradient(
                  colors: [AikoColors.violet, Color(0xFF8A6FD8)])
              : null,
          color: isCurrent
              ? null
              : complete
                  ? const Color(0xFFDDF3EA)
                  : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border(
            bottom: BorderSide(
              width: 4,
              color: isCurrent
                  ? const Color(0xFF3F2A80)
                  : complete
                      ? const Color(0xFFB5E2CF)
                      : AikoColors.lilacSoft,
            ),
          ),
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
                          fontWeight: FontWeight.w800,
                          color: foreground.withValues(alpha: 0.8))),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: foreground)),
                ],
              ),
            ),
            Icon(
              complete
                  ? Icons.check_circle_rounded
                  : lockedUntil != null || upcoming
                      ? Icons.lock_clock_rounded
                      : Icons.calendar_today_rounded,
              size: 30,
              color: complete ? AikoColors.success : foreground,
            ),
          ],
        ),
      ),
    );
  }
}

/// Etiqueta "INICIO" al comienzo de cada día.
class _Marker extends StatelessWidget {
  const _Marker({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AikoColors.lilacSoft, width: 2),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: AikoColors.violet),
            const SizedBox(width: 6),
            Text(label,
                style: const TextStyle(
                    fontSize: 12,
                    letterSpacing: 1.1,
                    fontWeight: FontWeight.w800,
                    color: AikoColors.violet)),
          ],
        ),
      ),
    );
  }
}

/// Cierre del día: un trofeo que se enciende cuando el día está completo.
class _DayEnd extends StatelessWidget {
  const _DayEnd({required this.day});

  final RouteDay day;

  @override
  Widget build(BuildContext context) {
    final complete = day.isComplete;
    return Semantics(
      label: complete
          ? 'Fin del día ${day.numero}, completado'
          : 'Fin del día ${day.numero}',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Column(
          children: [
            _RaisedCircle(
              size: 64,
              color: complete ? AikoColors.peach : const Color(0xFFE6E1EF),
              shadow: complete
                  ? const Color(0xFFE59A72)
                  : const Color(0xFFCFC8DC),
              child: Icon(
                Icons.emoji_events_rounded,
                size: 32,
                color: complete ? const Color(0xFF9A4A1F) : AikoColors.inkSoft,
              ),
            ),
            const SizedBox(height: 6),
            Text('FIN DEL DÍA ${day.numero}',
                style: const TextStyle(
                    fontSize: 12,
                    letterSpacing: 1.1,
                    fontWeight: FontWeight.w800,
                    color: AikoColors.inkSoft)),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Nodos del camino

enum _NodeState { done, next, waiting, locked }

/// Desplaza los nodos a izquierda y derecha para dibujar el camino.
class _ZigZag extends StatelessWidget {
  const _ZigZag({required this.index, required this.child});

  static const _pattern = [0.0, 0.45, 0.7, 0.45, 0.0, -0.45, -0.7, -0.45];

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Align(
        alignment: Alignment(_pattern[index % _pattern.length], 0),
        child: child,
      ),
    );
  }
}

class _ExerciseNode extends StatelessWidget {
  const _ExerciseNode({
    super.key,
    required this.item,
    required this.state,
    required this.onTap,
    this.waitingLabel,
  });

  final RouteExercise item;
  final _NodeState state;
  final VoidCallback onTap;

  /// Texto del globo cuando el siguiente espera su fecha ("EL 19 OCT").
  final String? waitingLabel;

  @override
  Widget build(BuildContext context) {
    final exercise = item.ejercicio;
    final style = CategoryStyle.of(exercise.categoria);
    final status = switch (state) {
      _NodeState.done => 'completado',
      _NodeState.next => 'siguiente, toca para comenzar',
      _NodeState.waiting => 'siguiente, se habilita otro día',
      _NodeState.locked => 'bloqueado',
    };

    final (Color fill, Color shadow, Color icon) = switch (state) {
      _NodeState.done => (style.foreground, _darken(style.foreground), Colors.white),
      _NodeState.next => (AikoColors.violet, const Color(0xFF3F2A80), Colors.white),
      _NodeState.waiting => (AikoColors.lilacSoft, AikoColors.lilac, AikoColors.violet),
      _NodeState.locked => (
          const Color(0xFFE6E1EF),
          const Color(0xFFCFC8DC),
          const Color(0xFFA59EB8)
        ),
    };

    final circle = _RaisedCircle(
      size: state == _NodeState.next ? 84 : 76,
      color: fill,
      shadow: shadow,
      child: Icon(
        state == _NodeState.done
            ? Icons.check_rounded
            : state == _NodeState.waiting
                ? Icons.lock_clock_rounded
                : style.icon,
        size: 36,
        color: icon,
      ),
    );

    return Semantics(
      button: true,
      label: '${exercise.nombre}, ${exercise.categoria}, $status',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          width: 150,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (state == _NodeState.next) const _StartBubble(),
              if (state == _NodeState.waiting)
                _StartBubble(label: waitingLabel ?? 'MAÑANA'),
              if (state == _NodeState.next)
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AikoColors.lilac, width: 4),
                  ),
                  child: circle,
                )
              else
                circle,
              const SizedBox(height: 6),
              Text(
                exercise.nombre,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: state == _NodeState.locked
                      ? AikoColors.inkSoft
                      : AikoColors.ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Color _darken(Color color) {
    final hsl = HSLColor.fromColor(color);
    return hsl.withLightness((hsl.lightness - 0.12).clamp(0.0, 1.0)).toColor();
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
        boxShadow: [BoxShadow(color: shadow, offset: const Offset(0, 6))],
      ),
      child: child,
    );
  }
}

class _StartBubble extends StatelessWidget {
  const _StartBubble({this.label = 'COMENZAR'});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AikoColors.lilacSoft, width: 2),
            ),
            child: Text(label,
                style: const TextStyle(
                    fontSize: 14,
                    letterSpacing: 1,
                    fontWeight: FontWeight.w800,
                    color: AikoColors.violet)),
          ),
          CustomPaint(
            size: const Size(16, 8),
            painter: _ArrowPainter(),
          ),
        ],
      ),
    );
  }
}

class _ArrowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, Paint()..color = AikoColors.lilacSoft);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ---------------------------------------------------------------------------
// Estados

class _RouteDoneCard extends StatelessWidget {
  const _RouteDoneCard();

  @override
  Widget build(BuildContext context) {
    return const AikoCard(
      child: Column(
        children: [
          Icon(Icons.celebration_rounded, size: 40, color: AikoColors.success),
          SizedBox(height: 10),
          Text('¡Completaste tu ruta!',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
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
      padding: EdgeInsets.only(top: 24),
      child: AikoCard(
        child: Column(
          children: [
            Icon(Icons.hourglass_empty_rounded,
                size: 40, color: AikoColors.lilac),
            SizedBox(height: 10),
            Text('Aún no tienes ejercicios',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            SizedBox(height: 4),
            Text('Tu especialista te asignará una ruta pronto.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AikoColors.inkSoft)),
          ],
        ),
      ),
    );
  }
}

class _MessageState extends StatelessWidget {
  const _MessageState({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  final IconData icon;
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
            Icon(icon, size: 56, color: AikoColors.lilac),
            const SizedBox(height: 14),
            Text(title,
                textAlign: TextAlign.center,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
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
