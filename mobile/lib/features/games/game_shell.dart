import 'package:flutter/material.dart';

import '../../core/config.dart';
import '../../core/theme.dart';

/// Marco común de los mini-juegos: barra de avance, salir con confirmación
/// y fondo tranquilo.
class GameShell extends StatelessWidget {
  const GameShell({
    super.key,
    required this.progress,
    required this.child,
    this.bottom,
  });

  /// 0–1.
  final double progress;
  final Widget child;

  /// Barra inferior (botón Comprobar / Continuar).
  final Widget? bottom;

  static Future<void> confirmExit(BuildContext context) async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Salir del ejercicio?'),
        content: const Text('Este intento no se guardará.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Seguir'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (leave == true && context.mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) confirmExit(context);
      },
      child: Scaffold(
        backgroundColor: AikoColors.lavenderBg,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          leading: IconButton(
            tooltip: 'Salir',
            icon: const Icon(Icons.close_rounded),
            onPressed: () => confirmExit(context),
          ),
          title: Semantics(
            label: 'Avance ${(progress * 100).round()} por ciento',
            excludeSemantics: true,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress.clamp(0.0, 1.0),
                minHeight: 12,
                backgroundColor: AikoColors.lilacSoft,
                color: AikoColors.violet,
              ),
            ),
          ),
        ),
        body: SafeArea(child: child),
        bottomNavigationBar: bottom == null
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  child: bottom,
                ),
              ),
      ),
    );
  }
}

/// Imagen de referencia del ejercicio, con espacio fijo mientras carga.
class ExerciseImage extends StatelessWidget {
  const ExerciseImage(this.id, {super.key, this.height = 180, this.fit = BoxFit.contain});

  final String id;
  final double height;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Container(
        height: height,
        color: Colors.white,
        alignment: Alignment.center,
        child: Image.network(
          AppConfig.imageUrl(id),
          fit: fit,
          height: height,
          semanticLabel: 'Imagen de referencia',
          loadingBuilder: (context, child, progress) => progress == null
              ? child
              : const Center(child: CircularProgressIndicator()),
          errorBuilder: (context, error, stack) => const Icon(
              Icons.broken_image_rounded,
              size: 48,
              color: AikoColors.inkSoft),
        ),
      ),
    );
  }
}

/// Barra de "Comprobar"/"Continuar" estilo Duolingo con mensaje de resultado.
class CheckBar extends StatelessWidget {
  const CheckBar({
    super.key,
    required this.label,
    required this.onPressed,
    this.feedback,
    this.correct,
  });

  final String label;
  final VoidCallback? onPressed;
  final String? feedback;
  final bool? correct;

  @override
  Widget build(BuildContext context) {
    final color = correct == null
        ? null
        : correct!
            ? const Color(0xFFDDF3EA)
            : AikoColors.peachSoft;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (feedback != null)
            Semantics(
              liveRegion: true,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Icon(
                      correct == true
                          ? Icons.check_circle_rounded
                          : Icons.info_rounded,
                      color: correct == true
                          ? AikoColors.success
                          : const Color(0xFFB4582B),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(feedback!,
                          style: const TextStyle(
                              fontSize: 17, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
              ),
            ),
          FilledButton(onPressed: onPressed, child: Text(label)),
        ],
      ),
    );
  }
}
