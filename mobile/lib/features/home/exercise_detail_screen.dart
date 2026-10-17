import 'package:flutter/material.dart';

import '../../core/category_style.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/aiko_card.dart';

/// Detalle de un ejercicio: instrucciones antes de empezar.
/// El motor de juegos (por categoría) llega en la siguiente fase.
class ExerciseDetailScreen extends StatelessWidget {
  const ExerciseDetailScreen({
    super.key,
    required this.item,
    required this.isNext,
  });

  final RouteExercise item;
  final bool isNext;

  @override
  Widget build(BuildContext context) {
    final exercise = item.ejercicio;
    final style = CategoryStyle.of(exercise.categoria);
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(),
      body: Container(
        decoration: const BoxDecoration(gradient: AikoColors.softGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  alignment: Alignment.center,
                  height: 88,
                  width: 88,
                  margin: const EdgeInsets.only(bottom: 18),
                  decoration: BoxDecoration(
                    color: style.background,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(style.icon, size: 44, color: style.foreground),
                ),
                Text(exercise.nombre,
                    textAlign: TextAlign.center,
                    style: Theme.of(context)
                        .textTheme
                        .headlineMedium
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text('${exercise.categoria} · Nivel ${exercise.nivel}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 16, color: AikoColors.inkSoft)),
                const SizedBox(height: 24),
                AikoCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Cómo se juega',
                          style: TextStyle(
                              fontSize: 17, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Text(exercise.instrucciones,
                          style: const TextStyle(fontSize: 18, height: 1.45)),
                    ],
                  ),
                ),
                const Spacer(),
                if (item.isCompleted)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text('Ya completaste este ejercicio.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: AikoColors.success,
                            fontWeight: FontWeight.w700)),
                  )
                else if (!isNext)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text('Se habilita al completar los anteriores.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AikoColors.inkSoft)),
                  ),
                const FilledButton(
                  onPressed: null,
                  child: Text('Disponible pronto'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
