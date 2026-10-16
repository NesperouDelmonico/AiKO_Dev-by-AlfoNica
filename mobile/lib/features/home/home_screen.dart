import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/aiko_card.dart';
import '../../widgets/segmented_progress.dart';

class _Exercise {
  const _Exercise(this.title, this.domain, this.icon);
  final String title;
  final String domain;
  final IconData icon;
}

/// Pantalla de inicio. Los ejercicios son datos de muestra: se reemplazan por
/// GET /v1/pacientes/:id/rutas/activa cuando se conecte la ruta del paciente.
const _sampleExercises = [
  _Exercise('Memoria de secuencias', 'Memoria', Icons.grid_view_rounded),
  _Exercise('Atención sostenida', 'Atención', Icons.visibility_rounded),
  _Exercise('Encuentra las parejas', 'Memoria', Icons.style_rounded),
  _Exercise('Orden y planificación', 'Funciones ejecutivas', Icons.route_rounded),
];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final Set<int> _done = {};

  @override
  Widget build(BuildContext context) {
    final name = context.select<Session, String>((s) => s.firstName);
    return Container(
      decoration: const BoxDecoration(gradient: AikoColors.softGradient),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            Text(name.isEmpty ? 'Hola' : 'Hola, $name',
                style: Theme.of(context)
                    .textTheme
                    .headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('Esto es lo que tienes para hoy',
                style: TextStyle(fontSize: 16, color: AikoColors.inkSoft)),
            const SizedBox(height: 20),
            Row(
              children: [
                const Expanded(
                  child: _MetricCard(
                    icon: Icons.local_fire_department_rounded,
                    value: '0',
                    label: 'días de racha',
                    gradient: AikoColors.heroGradient,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: _MetricCard(
                    icon: Icons.task_alt_rounded,
                    value: '${_done.length}/${_sampleExercises.length}',
                    label: 'completados hoy',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            AikoCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Progreso del día',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 14),
                  SegmentedProgress(
                      total: _sampleExercises.length, done: _done.length),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Ejercicios de hoy',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            for (var i = 0; i < _sampleExercises.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ExerciseTile(
                  exercise: _sampleExercises[i],
                  done: _done.contains(i),
                  onToggle: () => setState(
                      () => _done.contains(i) ? _done.remove(i) : _done.add(i)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.value,
    required this.label,
    this.gradient,
  });

  final IconData icon;
  final String value;
  final String label;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    final onGradient = gradient != null;
    return AikoCard(
      gradient: gradient,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: onGradient ? Colors.white : AikoColors.violet, size: 28),
          const SizedBox(height: 10),
          Text(value,
              style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  color: onGradient ? Colors.white : AikoColors.ink)),
          Text(label,
              style: TextStyle(
                  fontSize: 14,
                  color: onGradient ? Colors.white : AikoColors.inkSoft)),
        ],
      ),
    );
  }
}

class _ExerciseTile extends StatelessWidget {
  const _ExerciseTile({
    required this.exercise,
    required this.done,
    required this.onToggle,
  });

  final _Exercise exercise;
  final bool done;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      checked: done,
      label: '${exercise.title}, ${exercise.domain}',
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onToggle,
        child: AikoCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                height: 48,
                width: 48,
                decoration: BoxDecoration(
                  color: AikoColors.peachSoft,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(exercise.icon, color: AikoColors.violet),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(exercise.title,
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            decoration: done ? TextDecoration.lineThrough : null)),
                    Text(exercise.domain,
                        style: const TextStyle(
                            fontSize: 13, color: AikoColors.inkSoft)),
                  ],
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                height: 30,
                width: 30,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done ? AikoColors.success : Colors.transparent,
                  border: Border.all(
                      color: done ? AikoColors.success : AikoColors.lilac, width: 2),
                ),
                child: done
                    ? const Icon(Icons.check_rounded, size: 18, color: Colors.white)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
