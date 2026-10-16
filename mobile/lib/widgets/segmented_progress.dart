import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Barra de progreso dividida en segmentos (uno por ejercicio del día).
class SegmentedProgress extends StatelessWidget {
  const SegmentedProgress({super.key, required this.total, required this.done});

  final int total;
  final int done;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$done de $total ejercicios completados',
      child: Row(
        children: [
          for (var i = 0; i < total; i++) ...[
            if (i > 0) const SizedBox(width: 6),
            Expanded(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                height: 12,
                decoration: BoxDecoration(
                  color: i < done ? AikoColors.violet : AikoColors.lilacSoft,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
