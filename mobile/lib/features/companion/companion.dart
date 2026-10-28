import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../widgets/aiko_avatar.dart';
import '../../widgets/brand_image.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';

/// Saludos del compañero (uno por día, en ciclo).
const companionGreetings = [
  'Hoy es un gran día para entrenar tu mente. ¿Listo para empezar?',
  'Me alegra verte. ¿Visitamos tu isla de hoy?',
  'Unos minutos de práctica hacen la diferencia. ¿Empezamos?',
  'Tu mente está lista para un nuevo reto. ¡Vamos juntos!',
];

String greetingOfTheDay([DateTime? now]) {
  final d = now ?? DateTime.now();
  final index = DateTime(d.year, d.month, d.day).difference(DateTime(2026)).inDays;
  return companionGreetings[index.abs() % companionGreetings.length];
}

/// "Tu compañero AiKO": saludo del día. Devuelve true con "¡Sí, vamos!".
Future<bool> showCompanionGreeting(
  BuildContext context, {
  required String name,
  bool hasExercises = true,
}) async {
  final go = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _Sheet(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              AikoAvatar(size: 30),
              SizedBox(width: 8),
              Text('Tu compañero AiKO',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const FadeSlideIn(
                offset: Offset(-20, 0),
                child: BrandImage(
                  'bear_wave',
                  width: 110,
                  height: 110,
                  fallback: AikoMascot(size: 88, happy: true),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FadeSlideIn(
                  delay: const Duration(milliseconds: 150),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AikoColors.lavenderBg,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name.isEmpty ? '¡Hola!' : '¡Hola, $name!',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 4),
                        Text(
                          hasExercises
                              ? greetingOfTheDay()
                              : 'Hoy ya cumpliste. ¡Disfruta tu día y vuelve mañana!',
                          style: const TextStyle(fontSize: 15.5, height: 1.35),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (hasExercises) ...[
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('¡Sí, vamos!'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Quizás después'),
            ),
          ] else
            FilledButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Entendido'),
            ),
        ],
      ),
    ),
  );
  return go == true;
}

/// "Es momento de un descanso" al terminar la rutina del día.
Future<void> showRestReminder(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _Sheet(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Es momento de un descanso',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          const Text(
            'Has completado tus ejercicios de hoy. Tu mente también necesita descansar.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, height: 1.4, color: AikoColors.inkSoft),
          ),
          const SizedBox(height: 10),
          Center(
            child: BrandImage(
              'bear_rest',
              width: 170,
              height: 150,
              semanticLabel: 'AiKO descansando',
              fallback: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 140,
                    height: 90,
                    margin: const EdgeInsets.only(top: 50),
                    decoration: BoxDecoration(
                      color: AikoColors.lilacSoft,
                      borderRadius: BorderRadius.circular(40),
                    ),
                  ),
                  const AikoMascot(size: 80, animate: false),
                  const Positioned(
                    right: 10,
                    top: 0,
                    child: Icon(Icons.nightlight_round, size: 30, color: AikoColors.violetBright),
                  ),
                  const Positioned(left: 16, top: 12, child: SparkleStar(size: 14)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Entendido'),
          ),
        ],
      ),
    ),
  );
}

class _Sheet extends StatelessWidget {
  const _Sheet({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
        ),
        child: child,
      ),
    );
  }
}
