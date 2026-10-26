import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/game_style.dart';
import '../../core/models.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import '../games/games.dart';
import '../home/home_repository.dart';
import '../shell/app_shell.dart';

/// Un ejercicio de la ruta con cuántas veces aparece y cuántas va.
class ExerciseSummary {
  ExerciseSummary(this.exercise);

  final Exercise exercise;
  int times = 0;
  int done = 0;
}

/// Agrupa los pasos de la ruta por ejercicio (un ejercicio puede repetirse).
List<ExerciseSummary> summarize(List<RouteExercise> steps) {
  final byId = <String, ExerciseSummary>{};
  for (final step in steps) {
    final summary = byId.putIfAbsent(step.ejercicio.id, () => ExerciseSummary(step.ejercicio));
    summary.times++;
    if (step.isCompleted) summary.done++;
  }
  return byId.values.toList();
}

/// Ejercicios: los de la ruta (con práctica libre) y cómo se juega cada uno.
class ExercisesScreen extends StatefulWidget {
  const ExercisesScreen({super.key});

  @override
  State<ExercisesScreen> createState() => _ExercisesScreenState();
}

class _ExercisesScreenState extends State<ExercisesScreen>
    with ReloadOnTab<ExercisesScreen> {
  late Future<HomeData> _future;

  @override
  int get tabIndex => ShellTab.exercises;

  @override
  void onTabActivated() => _refresh();

  Future<HomeData> _load() {
    final session = context.read<Session>();
    return HomeRepository(session.api).load(session.pacienteId);
  }

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    try {
      await next;
    } catch (_) {}
  }

  void _openSheet(ExerciseSummary summary) {
    final exercise = summary.exercise;
    final style = GameStyle.of(exercise.tipo);
    final playable = hasGame(exercise);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.62,
        maxChildSize: 0.92,
        builder: (context, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
          children: [
            Row(
              children: [
                _GameBadge(style: style, size: 64),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(exercise.nombre,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                      Text('${style.label} · Nivel ${exercise.nivel}',
                          style: const TextStyle(color: AikoColors.inkSoft)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text('Instrucciones',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(
                exercise.instrucciones.isEmpty
                    ? 'Sin instrucciones adicionales.'
                    : exercise.instrucciones,
                style: const TextStyle(fontSize: 17, height: 1.45)),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AikoColors.lilacSoft,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  const AikoMascot(size: 44, animate: false),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(style.howTo,
                        style: const TextStyle(fontWeight: FontWeight.w700, height: 1.35)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text('En tu ruta: ${summary.done} de ${summary.times} '
                '${summary.times == 1 ? 'vez' : 'veces'}',
                style: const TextStyle(color: AikoColors.inkSoft, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            if (playable) ...[
              FilledButton.icon(
                onPressed: () {
                  Navigator.of(sheetContext).pop();
                  practiceExercise(this.context, exercise);
                },
                icon: const Icon(Icons.sports_esports_rounded),
                label: const Text('PRACTICAR'),
              ),
              const SizedBox(height: 6),
              const Text('La práctica no cuenta para tu ruta ni da XP.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AikoColors.inkSoft)),
            ] else
              const Text('Este juego estará disponible pronto.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AikoColors.inkSoft, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
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
            if (!snapshot.hasData && loading) {
              return const Center(child: AikoMascot(size: 84));
            }
            final error = snapshot.hasError && !loading ? snapshot.error : null;
            final steps = snapshot.data?.route?.ejercicios ?? const <RouteExercise>[];
            final summaries = summarize(steps);
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                children: [
                  const Padding(
                    padding: EdgeInsets.only(left: 4, bottom: 4),
                    child: Text('Ejercicios',
                        style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
                  ),
                  const Padding(
                    padding: EdgeInsets.only(left: 4, bottom: 16),
                    child: Text('Practica cuando quieras; tu ruta sigue en Inicio.',
                        style: TextStyle(color: AikoColors.inkSoft)),
                  ),
                  if (error != null)
                    _Notice(
                      text: error is ApiException
                          ? error.message
                          : 'No pudimos cargar tus ejercicios. Desliza para reintentar.',
                    )
                  else if (summaries.isEmpty)
                    const _Notice(text: 'Cuando tu especialista te asigne una ruta, aquí verás sus ejercicios.')
                  else
                    for (var i = 0; i < summaries.length; i++)
                      FadeSlideIn(
                        delay: Duration(milliseconds: 60 * i),
                        child: _ExerciseCard(
                          summary: summaries[i],
                          onTap: () => _openSheet(summaries[i]),
                        ),
                      ),
                  const SizedBox(height: 26),
                  const Padding(
                    padding: EdgeInsets.only(left: 4, bottom: 10),
                    child: Text('Cómo se juega',
                        style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
                  ),
                  for (final type in GameStyle.playableTypes)
                    _HowToCard(style: GameStyle.of(type)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _GameBadge extends StatelessWidget {
  const _GameBadge({required this.style, this.size = 56});

  final GameStyle style;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        height: size,
        width: size,
        decoration: BoxDecoration(
          color: style.color,
          borderRadius: BorderRadius.circular(size * 0.32),
          boxShadow: [
            BoxShadow(
              color: HSLColor.fromColor(style.color)
                  .withLightness((HSLColor.fromColor(style.color).lightness - 0.14).clamp(0.0, 1.0))
                  .toColor(),
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Icon(style.icon, color: Colors.white, size: size * 0.52),
      );
}

class _ExerciseCard extends StatelessWidget {
  const _ExerciseCard({required this.summary, required this.onTap});

  final ExerciseSummary summary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final exercise = summary.exercise;
    final style = GameStyle.of(exercise.tipo);
    final progress = summary.times == 0 ? 0.0 : summary.done / summary.times;
    return Semantics(
      button: true,
      label: '${exercise.nombre}, ${style.label}, '
          '${summary.done} de ${summary.times} en tu ruta',
      excludeSemantics: true,
      child: Pressable(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AikoColors.lilacSoft, width: 2),
            boxShadow: const [BoxShadow(color: AikoColors.lilacSoft, offset: Offset(0, 4))],
          ),
          child: Row(
            children: [
              _GameBadge(style: style),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(exercise.nombre,
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                    Text('${style.label} · ${exercise.categoria}',
                        style: const TextStyle(fontSize: 13, color: AikoColors.inkSoft)),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        color: style.color,
                        backgroundColor: AikoColors.lilacSoft,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Text('${summary.done}/${summary.times}',
                  style: TextStyle(fontWeight: FontWeight.w900, color: style.color)),
              const Icon(Icons.chevron_right_rounded, color: AikoColors.inkSoft),
            ],
          ),
        ),
      ),
    );
  }
}

class _HowToCard extends StatelessWidget {
  const _HowToCard({required this.style});

  final GameStyle style;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.75),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _GameBadge(style: style, size: 44),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(style.label,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 2),
                  Text(style.howTo, style: const TextStyle(height: 1.35)),
                ],
              ),
            ),
          ],
        ),
      );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            const AikoMascot(size: 48, animate: false),
            const SizedBox(width: 12),
            Expanded(
              child: Text(text,
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AikoColors.inkSoft)),
            ),
          ],
        ),
      );
}
