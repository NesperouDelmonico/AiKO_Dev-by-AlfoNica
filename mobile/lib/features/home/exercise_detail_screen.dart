import 'package:flutter/material.dart';

import '../../core/game_style.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import '../games/games.dart';

/// Etiqueta Hero del ícono de un ejercicio de la ruta (camino → detalle).
String exerciseHeroTag(RouteExercise item) => 'route-exercise-${item.id}';

/// Detalle de un ejercicio: instrucciones antes de empezar.
/// Solo el ejercicio siguiente de la ruta se puede jugar.
class ExerciseDetailScreen extends StatelessWidget {
  const ExerciseDetailScreen({
    super.key,
    required this.routeId,
    required this.item,
    required this.isNext,
    this.lockedMessage,
  });

  final String routeId;
  final RouteExercise item;
  final bool isNext;

  /// Motivo por el que aún no se puede jugar (día que se habilita mañana).
  final String? lockedMessage;

  Future<void> _start(BuildContext context) async {
    final submitted =
        await playExercise(context, routeId: routeId, item: item);
    if (submitted && context.mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final exercise = item.ejercicio;
    final style = GameStyle.of(exercise.tipo);
    final canPlay = !item.isCompleted && isNext && hasGame(exercise);
    return Scaffold(
      backgroundColor: AikoColors.lavenderBg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 230,
            backgroundColor: style.color,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color.lerp(style.color, Colors.white, 0.15)!, style.color],
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 24),
                      Hero(
                        tag: exerciseHeroTag(item),
                        child: Container(
                          height: 96,
                          width: 96,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                offset: const Offset(0, 7),
                              ),
                            ],
                          ),
                          child: Icon(style.icon, size: 50, color: style.color),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Text(exercise.nombre,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: Colors.white)),
                      ),
                      Text('${style.label} · ${exercise.categoria} · Nivel ${exercise.nivel}',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.9))),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            sliver: SliverList.list(
              children: [
                FadeSlideIn(
                  child: _InfoCard(
                    icon: Icons.assignment_rounded,
                    title: 'Instrucciones de tu especialista',
                    text: exercise.instrucciones.isEmpty
                        ? 'Sin instrucciones adicionales.'
                        : exercise.instrucciones,
                  ),
                ),
                const SizedBox(height: 14),
                FadeSlideIn(
                  delay: const Duration(milliseconds: 120),
                  child: _TipCard(text: style.howTo),
                ),
                const SizedBox(height: 24),
                if (item.isCompleted)
                  const _StatusText(
                      text: '¡Ya completaste este ejercicio!', color: AikoColors.success)
                else if (lockedMessage != null)
                  _StatusText(text: lockedMessage!, color: AikoColors.violet)
                else if (!isNext)
                  const _StatusText(
                      text: 'Se habilita al completar los anteriores.',
                      color: AikoColors.inkSoft),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: canPlay
              ? FilledButton.icon(
                  onPressed: () => _start(context),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('COMENZAR'),
                )
              : !item.isCompleted && isNext
                  ? const FilledButton(
                      onPressed: null,
                      child: Text('Juego disponible pronto'),
                    )
                  : OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Volver a mi ruta'),
                    ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.icon, required this.title, required this.text});

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AikoColors.lilacSoft, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AikoColors.violet),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(text, style: const TextStyle(fontSize: 18, height: 1.45)),
        ],
      ),
    );
  }
}

/// Consejo de la mascota sobre cómo se juega.
class _TipCard extends StatelessWidget {
  const _TipCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const AikoMascot(size: 64),
        const SizedBox(width: 10),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: const BoxDecoration(
              color: AikoColors.lilacSoft,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomRight: Radius.circular(18),
                bottomLeft: Radius.circular(4),
              ),
            ),
            child: Text(text,
                style: const TextStyle(
                    fontSize: 16, height: 1.4, fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }
}

class _StatusText extends StatelessWidget {
  const _StatusText({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Text(text,
      textAlign: TextAlign.center,
      style: TextStyle(fontSize: 16, color: color, fontWeight: FontWeight.w800));
}
