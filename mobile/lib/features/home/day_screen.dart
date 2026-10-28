import 'package:flutter/material.dart';

import '../../core/dates.dart';
import '../../core/game_style.dart';
import '../../core/island_theme.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/brand_image.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import 'exercise_detail_screen.dart';
import 'island_art.dart';

/// Etiqueta Hero de la isla de un día (mapa → panel).
String islandHeroTag(String routeId, int dia) => 'island-$routeId-$dia';

/// Panel de un día: cabecera ilustrada, progreso y ejercicios.
/// [reload] vuelve a pedir la ruta para reflejar lo que se acaba de jugar.
class DayScreen extends StatefulWidget {
  const DayScreen({
    super.key,
    required this.route,
    required this.day,
    required this.totalDays,
    required this.reload,
  });

  final ActiveRoute route;
  final RouteDay day;
  final int totalDays;
  final Future<ActiveRoute?> Function() reload;

  @override
  State<DayScreen> createState() => _DayScreenState();
}

class _DayScreenState extends State<DayScreen> {
  late ActiveRoute _route = widget.route;
  late RouteDay _day = widget.day;

  RouteAgenda get _agenda => _route.agenda;

  Future<void> _open(RouteExercise item) async {
    final next = _route.next;
    final isNext = item.id == next?.id;
    final playable = isNext && _agenda.isPlayable(item.dia);
    final unlock = _agenda.disponibleDesde;
    final played = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => ExerciseDetailScreen(
        routeId: _route.id,
        item: item,
        isNext: playable,
        lockedMessage: isNext && !playable && unlock != null
            ? 'Se habilita el ${shortDate(unlock)}. ¡Hoy ya cumpliste!'
            : null,
      ),
    ));
    if (played != true || !mounted) return;
    final fresh = await widget.reload();
    if (!mounted || fresh == null) return;
    final day = fresh.days.where((d) => d.dia == _day.dia).firstOrNull;
    setState(() {
      _route = fresh;
      if (day != null) _day = day;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = IslandTheme.forDay(_day);
    final state = islandState(_day, _agenda);
    final next = _route.next;
    final nextHere = next != null && _day.ejercicios.contains(next) ? next : null;
    final unlock = _agenda.disponibleDesde == null ? null : shortDate(_agenda.disponibleDesde!);
    final (String cta, VoidCallback? onCta) = switch (state) {
      IslandState.done => ('¡Día completado!', null),
      IslandState.today => (
          _day.done == 0 ? 'Comenzar' : 'Continuar',
          nextHere == null ? null : () => _open(nextHere),
        ),
      IslandState.waiting => ('Se abre el ${unlock ?? 'próximo día'}', null),
      IslandState.locked => ('Aún no disponible', null),
    };

    return Scaffold(
      backgroundColor: AikoColors.lavenderBg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 250,
            backgroundColor: theme.color,
            foregroundColor: Colors.white,
            title: Text(widget.totalDays > 1
                ? 'Día ${_day.numero} de ${widget.totalDays}'
                : 'Día ${_day.numero}'),
            flexibleSpace: FlexibleSpaceBar(
              background: _Header(theme: theme, routeId: _route.id, day: _day),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 120),
            sliver: SliverList.list(children: [
              FadeSlideIn(
                child: Text(theme.name,
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
              ),
              const SizedBox(height: 4),
              FadeSlideIn(
                delay: const Duration(milliseconds: 80),
                child: Text(theme.tagline,
                    style: const TextStyle(fontSize: 16, color: AikoColors.inkSoft)),
              ),
              const SizedBox(height: 18),
              FadeSlideIn(
                delay: const Duration(milliseconds: 140),
                child: _ProgressCard(day: _day, theme: theme),
              ),
              const SizedBox(height: 22),
              const Text('Ejercicios de este día',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              const SizedBox(height: 10),
              for (final (i, item) in _day.ejercicios.indexed)
                FadeSlideIn(
                  delay: Duration(milliseconds: 200 + i * 70),
                  child: _ExerciseRow(
                    index: i + 1,
                    item: item,
                    isNext: item.id == nextHere?.id && state == IslandState.today,
                    locked: !item.isCompleted &&
                        (state != IslandState.today || item.id != nextHere?.id),
                    onTap: () => _open(item),
                  ),
                ),
              if (state == IslandState.waiting || state == IslandState.locked)
                Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: Row(
                    children: [
                      const AikoMascot(size: 54, animate: false),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SpeechBubble(
                          text: state == IslandState.waiting
                              ? '¡Hoy ya cumpliste! Esta isla se abre el ${unlock ?? 'próximo día'}.'
                              : 'Primero visita las islas anteriores.',
                        ),
                      ),
                    ],
                  ),
                ),
            ]),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: theme.deep,
            disabledBackgroundColor: const Color(0xFFE6E1EF),
            disabledForegroundColor: AikoColors.inkSoft,
          ),
          onPressed: onCta,
          child: Text(cta),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.theme, required this.routeId, required this.day});

  final IslandTheme theme;
  final String routeId;
  final RouteDay day;

  @override
  Widget build(BuildContext context) {
    final fallback = DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [const Color(0xFFCDEBFA), Color.lerp(theme.soft, Colors.white, 0.2)!],
        ),
      ),
      child: Align(
        alignment: const Alignment(0, 0.6),
        child: Hero(
          tag: islandHeroTag(routeId, day.dia),
          child: IslandArt(theme: theme, size: 190),
        ),
      ),
    );
    return BrandImage(
      theme.headerImage,
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
      fallback: fallback,
    );
  }
}

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.day, required this.theme});

  final RouteDay day;
  final IslandTheme theme;

  @override
  Widget build(BuildContext context) {
    final progress = day.total == 0 ? 0.0 : day.done / day.total;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(color: theme.color.withValues(alpha: 0.12), blurRadius: 18, offset: const Offset(0, 8)),
        ],
      ),
      child: Semantics(
        label: 'Tu progreso: ${day.done} de ${day.total} ejercicios',
        excludeSemantics: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Tu progreso',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                ),
                Text('${day.done}/${day.total}',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: theme.deep)),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: progress),
                duration: reduceMotion(context) ? Duration.zero : const Duration(milliseconds: 800),
                curve: Curves.easeOutCubic,
                builder: (context, value, _) => LinearProgressIndicator(
                  value: value,
                  minHeight: 12,
                  color: theme.color,
                  backgroundColor: theme.soft,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExerciseRow extends StatelessWidget {
  const _ExerciseRow({
    required this.index,
    required this.item,
    required this.isNext,
    required this.locked,
    required this.onTap,
  });

  final int index;
  final RouteExercise item;
  final bool isNext;
  final bool locked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final style = GameStyle.of(item.ejercicio.tipo);
    final done = item.isCompleted;
    final status = done ? 'completado' : isNext ? 'siguiente' : 'pendiente';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Semantics(
        button: true,
        label: '$index. ${item.ejercicio.nombre}, ${style.label}, $status',
        excludeSemantics: true,
        child: Pressable(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isNext ? style.color : Colors.transparent,
                width: 2.5,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: AikoColors.lavenderBg,
                    shape: BoxShape.circle,
                  ),
                  child: Text('$index',
                      style: const TextStyle(fontWeight: FontWeight.w900, color: AikoColors.inkSoft)),
                ),
                const SizedBox(width: 12),
                Hero(
                  tag: exerciseHeroTag(item),
                  child: Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: style.color.withValues(alpha: locked ? 0.08 : 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(style.icon,
                        color: locked ? AikoColors.inkSoft : style.color, size: 24),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.ejercicio.nombre,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                      Text(style.label,
                          style: const TextStyle(fontSize: 13, color: AikoColors.inkSoft)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  done
                      ? Icons.check_circle_rounded
                      : locked
                          ? Icons.lock_rounded
                          : Icons.play_circle_fill_rounded,
                  color: done
                      ? AikoColors.success
                      : locked
                          ? const Color(0xFFBDB5D0)
                          : style.color,
                  size: 30,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
