import 'package:flutter/material.dart';

import '../../core/config.dart';
import '../../core/theme.dart';

/// Fondo suave de los mini-juegos (lavanda → crema).
const gameBackground = BoxDecoration(
  gradient: LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFF3EEFF), Color(0xFFFBF8FF), Color(0xFFFFF8EE)],
  ),
);

/// Tarjeta blanca redondeada con sombra lila muy suave.
BoxDecoration softCard({Color color = Colors.white, double radius = 22, Color? border}) =>
    BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(radius),
      border: border == null ? null : Border.all(color: border, width: 2),
      boxShadow: [
        BoxShadow(
          color: AikoColors.violet.withValues(alpha: 0.08),
          blurRadius: 18,
          offset: const Offset(0, 8),
        ),
      ],
    );

/// Marco común de los mini-juegos: barra de avance con contador, título
/// centrado, salir con confirmación y fondo tranquilo.
class GameShell extends StatelessWidget {
  const GameShell({
    super.key,
    required this.progress,
    required this.child,
    this.bottom,
    this.title,
    this.subtitle,
    this.counter,
    this.trailing,
  });

  /// 0–1.
  final double progress;
  final Widget child;

  /// Barra inferior (botón Comprobar / Continuar).
  final Widget? bottom;

  /// Indicación principal ("Observa la imagen").
  final String? title;
  final String? subtitle;

  /// Texto a la derecha de la barra ("2/10").
  final String? counter;

  /// Debajo del título (p. ej. [TimerPill]).
  final Widget? trailing;

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
            style: dialogButtonStyle,
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
        backgroundColor: Colors.transparent,
        body: DecoratedBox(
          decoration: gameBackground,
          child: SafeArea(
            child: Column(
              children: [
                GameTopBar(
                  progress: progress,
                  counter: counter,
                  onClose: () => confirmExit(context),
                ),
                if (title != null)
                  GameHeading(title: title!, subtitle: subtitle, trailing: trailing),
                Expanded(child: child),
              ],
            ),
          ),
        ),
        bottomNavigationBar: bottom == null
            ? null
            : DecoratedBox(
                decoration: const BoxDecoration(color: Color(0xFFFFF8EE)),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    child: bottom,
                  ),
                ),
              ),
      ),
    );
  }
}

/// Cerrar + barra de avance redondeada + contador.
class GameTopBar extends StatelessWidget {
  const GameTopBar({
    super.key,
    required this.progress,
    required this.onClose,
    this.counter,
  });

  final double progress;
  final VoidCallback onClose;
  final String? counter;

  @override
  Widget build(BuildContext context) {
    final value = progress.clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 6, 18, 6),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Salir',
            onPressed: onClose,
            style: IconButton.styleFrom(backgroundColor: Colors.white),
            icon: const Icon(Icons.close_rounded, color: AikoColors.inkSoft),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Semantics(
              label: counter == null
                  ? 'Avance ${(value * 100).round()} por ciento'
                  : 'Avance $counter',
              excludeSemantics: true,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(end: value),
                  duration: const Duration(milliseconds: 450),
                  curve: Curves.easeOutCubic,
                  builder: (context, v, _) => LinearProgressIndicator(
                    value: v,
                    minHeight: 12,
                    backgroundColor: Colors.white,
                    color: AikoColors.violet,
                  ),
                ),
              ),
            ),
          ),
          if (counter != null) ...[
            const SizedBox(width: 12),
            ExcludeSemantics(
              child: Text(counter!,
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w900, color: AikoColors.violet)),
            ),
          ],
        ],
      ),
    );
  }
}

class GameHeading extends StatelessWidget {
  const GameHeading({super.key, required this.title, this.subtitle, this.trailing});

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 10, 24, 12),
      child: Column(
        children: [
          Semantics(
            header: true,
            child: Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900, height: 1.2)),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15.5, color: AikoColors.inkSoft, height: 1.35)),
          ],
          if (trailing != null) ...[const SizedBox(height: 10), trailing!],
        ],
      ),
    );
  }
}

/// Pastilla con reloj: "5 segundos", "4:12".
class TimerPill extends StatelessWidget {
  const TimerPill({super.key, required this.text, this.semantics, this.urgent = false});

  final String text;
  final String? semantics;
  final bool urgent;

  @override
  Widget build(BuildContext context) {
    final color = urgent ? const Color(0xFFB4582B) : AikoColors.violet;
    return Semantics(
      liveRegion: true,
      label: semantics ?? text,
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: softCard(radius: 30, color: urgent ? AikoColors.peachSoft : Colors.white),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.timer_rounded, size: 20, color: color),
            const SizedBox(width: 6),
            Text(text,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
          ],
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
    return Container(
      decoration: softCard(),
      clipBehavior: Clip.antiAlias,
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
        ? Colors.transparent
        : correct!
            ? const Color(0xFFDDF3EA)
            : AikoColors.peachSoft;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(24),
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
