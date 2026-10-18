import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/aiko_card.dart';
import 'game_outcome.dart';
import 'results_repository.dart';

enum ResultAction { done, retry }

/// Envía el resultado y muestra porcentaje, aciertos, tiempo y XP.
class ResultScreen extends StatefulWidget {
  const ResultScreen({
    super.key,
    required this.routeId,
    required this.routeExerciseId,
    required this.exerciseName,
    required this.outcome,
  });

  final String routeId;
  final String routeExerciseId;
  final String exerciseName;
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
          decoration: const BoxDecoration(gradient: AikoColors.softGradient),
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
    final color = result.advanced ? AikoColors.success : const Color(0xFFE07B39);
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
      children: [
        Text(
          result.advanced ? '¡Ejercicio completado!' : '¡Buen intento!',
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .headlineMedium
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(widget.exerciseName,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, color: AikoColors.inkSoft)),
        const SizedBox(height: 28),
        Center(
          child: Semantics(
            label: 'Puntaje ${outcome.puntaje} por ciento',
            excludeSemantics: true,
            child: SizedBox(
              height: 170,
              width: 170,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CircularProgressIndicator(
                    value: outcome.puntaje / 100,
                    strokeWidth: 14,
                    strokeCap: StrokeCap.round,
                    backgroundColor: Colors.white,
                    color: color,
                  ),
                  Center(
                    child: Text('${outcome.puntaje}%',
                        style: const TextStyle(
                            fontSize: 44, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 28),
        Row(
          children: [
            Expanded(
              child: _Stat(
                icon: Icons.check_circle_rounded,
                value: '${outcome.aciertos}/${outcome.intentos}',
                label: 'Aciertos',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Stat(
                icon: Icons.timer_rounded,
                value: outcome.tiempoReaccionMs == null
                    ? '—'
                    : '${outcome.tiempoReaccionMs} ms',
                label: 'Tiempo prom.',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Stat(
                icon: Icons.stars_rounded,
                value: '+${result.xpGanado}',
                label: 'XP',
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        AikoCard(
          child: Text(result.mensaje,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 17, height: 1.4)),
        ),
        if (result.insignias.isNotEmpty) ...[
          const SizedBox(height: 14),
          AikoCard(
            color: AikoColors.peachSoft,
            child: Row(
              children: [
                const Icon(Icons.military_tech_rounded,
                    size: 36, color: Color(0xFF9A4A1F)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Nueva insignia: ${result.insignias.join(', ')}',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 28),
        if (!result.advanced) ...[
          FilledButton(
            onPressed: () => _close(ResultAction.retry),
            child: const Text('Intentar de nuevo'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => _close(ResultAction.done),
            child: const Text('Volver a mi ruta'),
          ),
        ] else
          FilledButton(
            onPressed: () => _close(ResultAction.done),
            child: const Text('Volver a mi ruta'),
          ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.value, required this.label});

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: AikoCard(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Column(
          children: [
            Icon(icon, color: AikoColors.violet),
            const SizedBox(height: 6),
            FittedBox(
              child: Text(value,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w800)),
            ),
            Text(label,
                style:
                    const TextStyle(fontSize: 12, color: AikoColors.inkSoft)),
          ],
        ),
      ),
    );
  }
}
