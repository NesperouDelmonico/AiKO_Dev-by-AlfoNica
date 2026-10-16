import 'package:flutter/material.dart';

import '../core/theme.dart';

class AikoCard extends StatelessWidget {
  const AikoCard({
    super.key,
    required this.child,
    this.color = Colors.white,
    this.gradient,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget child;
  final Color color;
  final Gradient? gradient;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? color : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AikoColors.violet.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}
