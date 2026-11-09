import 'package:flutter/material.dart';

import '../../core/island_theme.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/brand_image.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import '../games/game_shell.dart';

enum RoutineDoneAction { map, progress }

/// "¡Excelente! Has completado tu rutina de hoy".
class RoutineDoneScreen extends StatelessWidget {
  const RoutineDoneScreen({super.key, required this.day, required this.totalDays});

  final RouteDay day;
  final int totalDays;

  @override
  Widget build(BuildContext context) {
    final theme = IslandTheme.forDay(day);
    final size = MediaQuery.sizeOf(context).height < 700 ? 160.0 : 200.0;
    return Scaffold(
      body: DecoratedBox(
        decoration: gameBackground,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 8, 22, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: Alignment.topRight,
                  child: IconButton(
                    tooltip: 'Cerrar',
                    onPressed: () => Navigator.of(context).pop(RoutineDoneAction.map),
                    icon: const Icon(Icons.close_rounded, color: AikoColors.inkSoft),
                  ),
                ),
                const Spacer(),
                FadeSlideIn(
                  offset: const Offset(0, -20),
                  child: Center(
                    child: Breathing(
                      period: const Duration(milliseconds: 1700),
                      builder: (context, t, child) =>
                          Transform.translate(offset: Offset(0, -6 * t), child: child),
                      child: BrandImage(
                        'bear_routine_done',
                        width: size,
                        height: size,
                        semanticLabel: 'AiKO celebrando tu rutina',
                        fallback: _Fallback(size: size, theme: theme),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Semantics(
                  header: true,
                  child: const Text('¡Excelente!',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 34, fontWeight: FontWeight.w900)),
                ),
                const SizedBox(height: 4),
                const Text('Has completado tu rutina de hoy',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 17, color: AikoColors.inkSoft)),
                const SizedBox(height: 22),
                FadeSlideIn(
                  delay: const Duration(milliseconds: 200),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
                    decoration: softCard(),
                    child: IntrinsicHeight(
                      child: Row(
                        children: [
                          _Stat(
                            icon: Icons.emoji_events_rounded,
                            color: AikoColors.starDeep,
                            value: '${day.done}/${day.total}',
                            label: 'Ejercicios',
                          ),
                          const VerticalDivider(width: 1, color: AikoColors.lilacSoft),
                          _Stat(
                            icon: theme.icon,
                            color: theme.color,
                            value: totalDays > 1 ? '${day.numero}/$totalDays' : '${day.numero}',
                            label: 'Día de la ruta',
                          ),
                          const VerticalDivider(width: 1, color: AikoColors.lilacSoft),
                          const _Stat(
                            icon: Icons.local_fire_department_rounded,
                            color: Color(0xFFE07B39),
                            value: '+1',
                            label: 'Día de constancia',
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: softCard(color: theme.soft),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Flexible(
                        child: Text('Pequeñas acciones todos los días hacen grandes cambios.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 16, height: 1.4, fontWeight: FontWeight.w600)),
                      ),
                      SizedBox(width: 6),
                      SparkleStar(size: 16),
                    ],
                  ),
                ),
                const Spacer(),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(RoutineDoneAction.progress),
                  child: const Text('Ver mi progreso'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(RoutineDoneAction.map),
                  child: const Text('Volver al mapa'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback({required this.size, required this.theme});
  final double size;
  final IslandTheme theme;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: size,
        height: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: size * 0.84,
              height: size * 0.84,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AikoColors.lilacSoft,
              ),
            ),
            AikoMascot(size: size * 0.56, happy: true),
            for (final (x, y, s, icon) in const [
              (0.06, 0.18, 26.0, Icons.music_note_rounded),
              (0.82, 0.1, 22.0, Icons.music_note_rounded),
              (0.84, 0.62, 18.0, Icons.star_rounded),
            ])
              Positioned(
                left: size * x,
                top: size * y,
                child: Icon(icon, size: s, color: AikoColors.violetBright),
              ),
          ],
        ),
      );
}

class _Stat extends StatelessWidget {
  const _Stat({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Semantics(
          label: '$label: $value',
          excludeSemantics: true,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 30),
              const SizedBox(height: 6),
              Text(value, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12.5, color: AikoColors.inkSoft)),
            ],
          ),
        ),
      );
}
