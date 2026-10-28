import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/island_theme.dart';
import '../../core/models.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/brand_image.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import 'game_outcome.dart';
import 'game_shell.dart';
import 'result_messages.dart';
import 'results_repository.dart';

enum ResultAction { done, retry }

/// Envía el resultado y muestra el cierre del ejercicio: oso y mensaje
/// según el tipo de juego y el resultado, precisión, tiempo y XP.
class ResultScreen extends StatefulWidget {
  const ResultScreen({
    super.key,
    required this.routeId,
    required this.routeExerciseId,
    required this.exercise,
    required this.outcome,
  });

  final String routeId;
  final String routeExerciseId;
  final Exercise exercise;
  final GameOutcome outcome;

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  late Future<SubmitResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _submit();
  }

  Future<SubmitResult> _submit() {
    return ResultsRepository(context.read<Session>().api).submit(
      routeId: widget.routeId,
      routeExerciseId: widget.routeExerciseId,
      outcome: widget.outcome,
    );
  }

  void _close(ResultAction action) => Navigator.of(context).pop(action);

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _close(ResultAction.done);
      },
      child: Scaffold(
        body: Container(
          decoration: gameBackground,
          child: SafeArea(
            child: FutureBuilder<SubmitResult>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Guardando tu resultado…'),
                      ],
                    ),
                  );
                }
                if (snapshot.hasError) return _error(snapshot.error);
                return _body(snapshot.requireData);
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _error(Object? error) {
    final already = error is ApiException && error.statusCode == 409;
    return Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(already ? Icons.info_outline_rounded : Icons.cloud_off_rounded,
              size: 56, color: AikoColors.lilac),
          const SizedBox(height: 14),
          Text(
            already
                ? 'Este ejercicio ya estaba registrado'
                : 'No pudimos guardar tu resultado',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            error is ApiException
                ? error.message
                : 'Revisa tu conexión e inténtalo de nuevo.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AikoColors.inkSoft),
          ),
          const SizedBox(height: 24),
          if (!already)
            FilledButton(
              onPressed: () => setState(() => _future = _submit()),
              child: const Text('Reintentar envío'),
            ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => _close(ResultAction.done),
            child: const Text('Volver a mi ruta'),
          ),
        ],
      ),
    );
  }

  Widget _body(SubmitResult result) {
    final outcome = widget.outcome;
    final success = result.advanced;
    final theme = IslandTheme.ofExercise(widget.exercise);
    final copy = resultCopy(
      widget.exercise,
      success: success,
      seed: outcome.puntaje + DateTime.now().day,
    );
    final bearSize = MediaQuery.sizeOf(context).height < 700 ? 150.0 : 190.0;
    return Column(
      children: [
        Align(
          alignment: Alignment.topRight,
          child: IconButton(
            tooltip: 'Cerrar',
            onPressed: () => _close(ResultAction.done),
            icon: const Icon(Icons.close_rounded, color: AikoColors.inkSoft),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(22, 0, 22, 12),
            children: [
              FadeSlideIn(
                offset: const Offset(0, -20),
                child: _Bear(
                  name: copy.bear,
                  size: bearSize,
                  success: success,
                  theme: theme,
                ),
              ),
              const SizedBox(height: 6),
              FadeSlideIn(
                delay: const Duration(milliseconds: 150),
                child: Semantics(
                  header: true,
                  child: Text(copy.title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                success
                    ? 'Has completado ${widget.exercise.nombre}'
                    : 'Necesitas al menos 60 % para avanzar',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, color: AikoColors.inkSoft),
              ),
              const SizedBox(height: 22),
              FadeSlideIn(
                delay: const Duration(milliseconds: 250),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
                  decoration: softCard(),
                  child: IntrinsicHeight(
                    child: Row(
                      children: [
                        Expanded(
                          child: _Stat(
                            icon: Icons.track_changes_rounded,
                            color: AikoColors.mint,
                            value: CountUp(
                              value: outcome.puntaje,
                              suffix: '%',
                              style: _Stat.valueStyle,
                            ),
                            semantics: 'Precisión ${outcome.puntaje} por ciento',
                            label: 'Precisión',
                          ),
                        ),
                        const VerticalDivider(width: 1, color: AikoColors.lilacSoft),
                        Expanded(
                          child: _Stat(
                            icon: Icons.timer_rounded,
                            color: AikoColors.violet,
                            value: Text(
                              outcome.duracionMs == null
                                  ? '—'
                                  : formatDuration(outcome.duracionMs!),
                              style: _Stat.valueStyle,
                            ),
                            semantics: outcome.duracionMs == null
                                ? 'Tiempo no disponible'
                                : 'Tiempo ${formatDuration(outcome.duracionMs!)}',
                            label: 'Tiempo',
                          ),
                        ),
                        const VerticalDivider(width: 1, color: AikoColors.lilacSoft),
                        Expanded(
                          child: _Stat(
                            icon: Icons.star_rounded,
                            color: AikoColors.starDeep,
                            value: CountUp(
                              value: result.xpGanado,
                              suffix: ' XP',
                              style: _Stat.valueStyle,
                            ),
                            semantics: '${result.xpGanado} puntos de experiencia',
                            label: success ? 'Ganados' : 'Sin XP',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Center(
                child: Text(
                  '${outcome.aciertos} de ${outcome.intentos} aciertos'
                  '${outcome.tiempoReaccionMs == null ? '' : ' · reacción ${outcome.tiempoReaccionMs} ms'}',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AikoColors.inkSoft),
                ),
              ),
              const SizedBox(height: 16),
              FadeSlideIn(
                delay: const Duration(milliseconds: 350),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
                  decoration: softCard(color: theme.soft),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(copy.message,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 16.5, height: 1.4, fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 8),
                      const SparkleStar(size: 18),
                    ],
                  ),
                ),
              ),
              if (result.insignias.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: softCard(color: AikoColors.peachSoft),
                  child: Row(
                    children: [
                      const Icon(Icons.military_tech_rounded, size: 36, color: Color(0xFF9A4A1F)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text('Nueva insignia: ${result.insignias.join(', ')}',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(22, 4, 22, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!success) ...[
                FilledButton(
                  onPressed: () => _close(ResultAction.retry),
                  child: const Text('Intentar de nuevo'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => _close(ResultAction.done),
                  child: const Text('Volver a mi isla'),
                ),
              ] else
                FilledButton(
                  onPressed: () => _close(ResultAction.done),
                  child: const Text('Continuar'),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Oso del cierre: ilustración por tipo de juego o, mientras no exista,
/// la mascota con el ícono del juego.
class _Bear extends StatelessWidget {
  const _Bear({
    required this.name,
    required this.size,
    required this.success,
    required this.theme,
  });

  final String name;
  final double size;
  final bool success;
  final IslandTheme theme;

  @override
  Widget build(BuildContext context) {
    final fallback = SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: size * 0.82,
            height: size * 0.82,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: theme.soft,
            ),
          ),
          AikoMascot(size: size * 0.55, happy: success),
          Positioned(
            right: size * 0.1,
            bottom: size * 0.12,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: theme.color,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3),
              ),
              child: Icon(theme.icon, color: Colors.white, size: size * 0.13),
            ),
          ),
          if (success) ...[
            Positioned(left: size * 0.06, top: size * 0.12, child: const SparkleStar(size: 22)),
            Positioned(right: size * 0.08, top: size * 0.02, child: const SparkleStar(size: 16)),
            Positioned(left: size * 0.16, bottom: size * 0.06, child: const SparkleStar(size: 12)),
          ],
        ],
      ),
    );
    final image = BrandImage(
      name,
      width: size,
      height: size,
      semanticLabel: success ? 'AiKO celebrando' : 'AiKO animándote',
      fallback: fallback,
    );
    if (!success) return Center(child: image);
    return Center(
      child: Breathing(
        period: const Duration(milliseconds: 1600),
        builder: (context, t, child) =>
            Transform.translate(offset: Offset(0, -6 * t), child: child),
        child: image,
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
    required this.semantics,
  });

  static const valueStyle = TextStyle(fontSize: 21, fontWeight: FontWeight.w900);

  final IconData icon;
  final Color color;
  final Widget value;
  final String label;
  final String semantics;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semantics,
      excludeSemantics: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 30),
          const SizedBox(height: 6),
          FittedBox(child: value),
          Text(label, style: const TextStyle(fontSize: 12.5, color: AikoColors.inkSoft)),
        ],
      ),
    );
  }
}
