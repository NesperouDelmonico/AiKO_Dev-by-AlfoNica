import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/category_style.dart';
import '../../core/models.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/aiko_card.dart';
import '../../widgets/segmented_progress.dart';
import 'exercise_detail_screen.dart';
import 'home_repository.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<HomeData> _future;

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
    setState(() => _future = next);
    try {
      await next;
    } catch (_) {
      // El error se muestra en el FutureBuilder.
    }
  }

  void _open(RouteExercise item, {required bool isNext}) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => ExerciseDetailScreen(item: item, isNext: isNext),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final name = context.select<Session, String>((s) => s.firstName);
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
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                children: [
                  Text(name.isEmpty ? 'Hola' : 'Hola, $name',
                      style: Theme.of(context)
                          .textTheme
                          .headlineMedium
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  const Text('Un paso a la vez. Así vas.',
                      style: TextStyle(fontSize: 16, color: AikoColors.inkSoft)),
                  const SizedBox(height: 20),
                  _Stats(profile: data.profile),
                  const SizedBox(height: 20),
                  if (data.route == null)
                    const _EmptyRoute()
                  else
                    ..._routeSection(data.route!),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  List<Widget> _routeSection(ActiveRoute route) {
    final next = route.next;
    return [
      if (next != null)
        _NextExerciseCard(item: next, onStart: () => _open(next, isNext: true))
      else
        const _RouteDoneCard(),
      const SizedBox(height: 20),
      AikoCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tu progreso',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                Text('${route.done} de ${route.total}',
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AikoColors.violet)),
              ],
            ),
            const SizedBox(height: 14),
            SegmentedProgress(total: route.total, done: route.done),
          ],
        ),
      ),
      const SizedBox(height: 24),
      const Text('Tu ruta',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      const SizedBox(height: 10),
      for (final item in route.ejercicios)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _ExerciseTile(
            item: item,
            isNext: item.id == next?.id,
            onTap: () => _open(item, isNext: item.id == next?.id),
          ),
        ),
    ];
  }
}

class _Stats extends StatelessWidget {
  const _Stats({required this.profile});

  final AchievementProfile profile;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
              icon: Icons.workspace_premium_rounded,
              value: '${profile.nivel}',
              label: 'Nivel'),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: _StatCard(
              icon: Icons.stars_rounded, value: '${profile.xp}', label: 'Puntos XP'),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.icon, required this.value, required this.label});

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: AikoCard(
        child: Row(
          children: [
            Container(
              height: 44,
              width: 44,
              decoration: BoxDecoration(
                color: AikoColors.peachSoft,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: AikoColors.violet),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value,
                      style: const TextStyle(
                          fontSize: 24, fontWeight: FontWeight.w800)),
                  Text(label,
                      style: const TextStyle(
                          fontSize: 13, color: AikoColors.inkSoft)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NextExerciseCard extends StatelessWidget {
  const _NextExerciseCard({required this.item, required this.onStart});

  final RouteExercise item;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final exercise = item.ejercicio;
    final style = CategoryStyle.of(exercise.categoria);
    return AikoCard(
      gradient: AikoColors.heroGradient,
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('SIGUIENTE EJERCICIO',
              style: TextStyle(
                  fontSize: 12,
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w800,
                  color: Colors.white)),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(style.icon, color: style.foreground, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(exercise.nombre,
                        style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AikoColors.ink)),
                    Text('${exercise.categoria} · Nivel ${exercise.nivel}',
                        style: const TextStyle(
                            fontSize: 14, color: AikoColors.ink)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: onStart,
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AikoColors.violet,
            ),
            child: const Text('Ver ejercicio'),
          ),
        ],
      ),
    );
  }
}

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
    return const AikoCard(
      child: Column(
        children: [
          Icon(Icons.hourglass_empty_rounded, size: 40, color: AikoColors.lilac),
          SizedBox(height: 10),
          Text('Aún no tienes ejercicios',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          SizedBox(height: 4),
          Text('Tu especialista te asignará una ruta pronto.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AikoColors.inkSoft)),
        ],
      ),
    );
  }
}

class _ExerciseTile extends StatelessWidget {
  const _ExerciseTile({
    required this.item,
    required this.isNext,
    required this.onTap,
  });

  final RouteExercise item;
  final bool isNext;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final exercise = item.ejercicio;
    final style = CategoryStyle.of(exercise.categoria);
    final done = item.isCompleted;
    final status = done ? 'completado' : (isNext ? 'siguiente' : 'pendiente');
    return Semantics(
      button: true,
      label: '${exercise.nombre}, ${exercise.categoria}, $status',
      excludeSemantics: true,
      child: Opacity(
        opacity: done ? 0.6 : 1,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isNext ? AikoColors.violet : Colors.transparent,
                width: 2,
              ),
            ),
            child: Row(
              children: [
                Container(
                  height: 48,
                  width: 48,
                  decoration: BoxDecoration(
                    color: style.background,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(style.icon, color: style.foreground),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(exercise.nombre,
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
                      Text('${exercise.categoria} · Nivel ${exercise.nivel}',
                          style: const TextStyle(
                              fontSize: 13, color: AikoColors.inkSoft)),
                    ],
                  ),
                ),
                if (done)
                  const Icon(Icons.check_circle_rounded,
                      color: AikoColors.success, size: 28)
                else
                  Icon(Icons.chevron_right_rounded,
                      color: isNext ? AikoColors.violet : AikoColors.inkSoft),
              ],
            ),
          ),
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
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
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
