import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Moneda de AiKO.
class CoinIcon extends StatelessWidget {
  const CoinIcon({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFFFE27A), AikoColors.starDeep],
          ),
          border: Border.all(color: const Color(0xFFB98500), width: size * 0.07),
        ),
        alignment: Alignment.center,
        child: Icon(Icons.star_rounded, size: size * 0.62, color: const Color(0xFFFFF7D6)),
      );
}

/// Saldo de monedas en una píldora (encabezados y tienda).
class CoinPill extends StatelessWidget {
  const CoinPill({super.key, required this.amount, this.onTap});

  final int? amount;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final text = amount == null ? '—' : '$amount';
    return Semantics(
      button: onTap != null,
      label: amount == null ? 'Monedas' : 'Tienes $amount monedas',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(6, 5, 12, 5),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF3C4),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFFFD86B), width: 1.5),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CoinIcon(size: 22),
              const SizedBox(width: 6),
              Text(text,
                  style: const TextStyle(
                      fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF7A5400))),
            ],
          ),
        ),
      ),
    );
  }
}
