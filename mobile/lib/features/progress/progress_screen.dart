import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/category_style.dart';
import '../../core/dates.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import '../shell/app_shell.dart';
import 'consistency_calendar.dart';
import 'progress_repository.dart';

/// Seguimiento: nivel y XP, progreso por área, evolución, insignias e
/// historial de intentos.
class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen>
    with ReloadOnTab<ProgressScreen> {
  late Future<ProgressData> _future;
  final List<Attempt> _extra = [];
  int _page = 1;
  bool _loadingMore = false;

  @override
  int get tabIndex => ShellTab.progress;

  @override
  void onTabActivated() => _refresh();

  ProgressRepository get _repository =>
      ProgressRepository(context.read<Session>().api);

  @override
  void initState() {
    super.initState();
    _future = _repository.load(context.read<Session>().pacienteId);
  }

  Future<void> _refresh() async {
    final next = _repository.load(context.read<Session>().pacienteId);
    setState(() {
      _future = next;
      _extra.clear();
      _page = 1;
    });
    try {
      await next;
    } catch (_) {}
  }

  Future<void> _loadMore() async {
    final id = context.read<Session>().pacienteId;
    if (id == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final page = await _repository.history(id, _page + 1);
      if (!mounted) return;
      setState(() {
        _page++;
        _extra.addAll(page.items);
      });
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AikoColors.softGradient),
      child: SafeArea(
        child: FutureBuilder<ProgressData>(
          future: _future,
          builder: (context, snapshot) {
            final loading = snapshot.connectionState != ConnectionState.done;
            if (!snapshot.hasData && loading) {
              return const Center(child: AikoMascot(size: 84));
            }
            if (snapshot.hasError && !loading) {
              final error = snapshot.error;
              return _ErrorView(
                message: error is ApiException
                    ? error.message
                    : 'Revisa tu conexión e inténtalo de nuevo.',
                onRetry: _refresh,
              );
            }
            final data = snapshot.data!;
            final attempts = [...data.history.items, ..._extra];
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                children: [
                  const _Title('Tu progreso'),
                  FadeSlideIn(child: _LevelCard(nivel: data.nivel, xp: data.xp)),
                  const SizedBox(height: 22),
                  if (data.consistency != null) ...[
                    const _Section('Mi constancia'),
                    FadeSlideIn(
                      delay: const Duration(milliseconds: 60),
                      child: ConsistencyCalendar(
                        initial: data.consistency!,
                        load: (month) => _repository.consistency(
                            context.read<Session>().pacienteId!, month),
                      ),
                    ),
                    const SizedBox(height: 22),
                  ],
                  const _Section('Tus áreas'),
                  FadeSlideIn(
                    delay: const Duration(milliseconds: 100),
                    child: _Domains(domains: data.domains),
                  ),
                  const SizedBox(height: 22),
                  const _Section('Tu evolución'),
                  FadeSlideIn(
                    delay: const Duration(milliseconds: 180),
                    child: _EvolutionCard(series: data.series),
                  ),
                  const SizedBox(height: 22),
                  _Section('Insignias · ${data.earned.length} de ${data.catalog.length}'),
                  FadeSlideIn(
                    delay: const Duration(milliseconds: 240),
                    child: _Badges(catalog: data.catalog, earned: data.earned),
                  ),
                  const SizedBox(height: 22),
                  const _Section('Últimos intentos'),
                  if (attempts.isEmpty)
                    const _EmptyHint(
                        text: 'Cuando juegues tus ejercicios, aquí verás cómo te fue.')
                  else ...[
                    for (final attempt in attempts) _AttemptTile(attempt: attempt),
                    if (attempts.length < data.history.total)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: OutlinedButton(
                          onPressed: _loadingMore ? null : _loadMore,
                          child: Text(_loadingMore ? 'Cargando…' : 'Ver más'),
                        ),
                      ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Title extends StatelessWidget {
  const _Title(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 14, left: 4),
        child: Text(text,
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
      );
}

class _Section extends StatelessWidget {
  const _Section(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
        header: true,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 10, left: 4),
          child: Text(text,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
        ),
      );
}

// ---------------------------------------------------------------------------

class _LevelCard extends StatelessWidget {
  const _LevelCard({required this.nivel, required this.xp});

  final int nivel;
  final int xp;

  @override
  Widget build(BuildContext context) {
    final level = levelProgress(xp);
    return Semantics(
      label: 'Nivel $nivel, $xp puntos de experiencia. '
          'Faltan ${level.remaining} para el nivel ${nivel + 1}.',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: AikoColors.heroGradient,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: AikoColors.violet.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            SizedBox(
              width: 116,
              height: 116,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: level.progress),
                duration: reduceMotion(context)
                    ? Duration.zero
                    : const Duration(milliseconds: 1100),
                curve: Curves.easeOutCubic,
                builder: (context, value, child) => CustomPaint(
                  painter: _RingPainter(value),
                  child: child,
                ),
                child: const Center(
                  child: AikoMascot(
                      size: 62, color: AikoColors.lilac, earColor: AikoColors.lilacSoft),
                ),
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const SparkleStar(size: 20),
                      const SizedBox(width: 6),
                      CountUp(
                        value: nivel,
                        style: const TextStyle(
                            fontSize: 30, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                    ],
                  ),
                  Text('NIVEL',
                      style: TextStyle(
                          letterSpacing: 1.4,
                          fontWeight: FontWeight.w900,
                          color: Colors.white.withValues(alpha: 0.8))),
                  const SizedBox(height: 8),
                  CountUp(
                    value: xp,
                    suffix: ' XP en total',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  Text('Faltan ${level.remaining} XP para el nivel ${nivel + 1}',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.9))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.value);
  final double value;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final stroke = size.width * 0.09;
    final inner = rect.deflate(stroke / 2);
    canvas.drawArc(
      inner,
      0,
      2 * pi,
      false,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.22)
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke,
    );
    canvas.drawArc(
      inner,
      -pi / 2,
      2 * pi * value,
      false,
      Paint()
        ..color = AikoColors.star
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.value != value;
}

// ---------------------------------------------------------------------------

class _Domains extends StatelessWidget {
  const _Domains({required this.domains});

  final List<DomainProgress> domains;

  static const _all = ['Atención', 'Memoria', 'Velocidad'];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final name in _all)
          _DomainBar(
            categoria: name,
            value: domains
                .where((d) => d.categoria == name)
                .map((d) => d.porcentaje)
                .firstOrNull,
          ),
      ],
    );
  }
}

class _DomainBar extends StatelessWidget {
  const _DomainBar({required this.categoria, required this.value});

  final String categoria;

  /// Promedio 0–100, o null si aún no hay intentos en el área.
  final double? value;

  @override
  Widget build(BuildContext context) {
    final style = CategoryStyle.of(categoria);
    final pct = (value ?? 0).clamp(0.0, 100.0);
    return Semantics(
      label: value == null
          ? '$categoria: sin intentos aún'
          : '$categoria: ${pct.round()} por ciento de promedio',
      excludeSemantics: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Container(
              height: 46,
              width: 46,
              decoration: BoxDecoration(
                color: style.background,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(style.icon, color: style.foreground),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(categoria,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w900)),
                      ),
                      Text(value == null ? 'Sin datos' : '${pct.round()}%',
                          style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: value == null ? AikoColors.inkSoft : style.foreground)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: pct / 100),
                      duration: reduceMotion(context)
                          ? Duration.zero
                          : const Duration(milliseconds: 1000),
                      curve: Curves.easeOutCubic,
                      builder: (context, v, _) => LinearProgressIndicator(
                        value: v,
                        minHeight: 12,
                        color: style.foreground,
                        backgroundColor: style.background,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class _EvolutionCard extends StatelessWidget {
  const _EvolutionCard({required this.series});

  final List<SeriesPoint> series;

  @override
  Widget build(BuildContext context) {
    if (series.length < 2) {
      return const _EmptyHint(
          text: 'Necesitas al menos 2 días con ejercicios para ver tu evolución.');
    }
    final last = series.last.valor.round();
    final first = series.first.valor.round();
    final trend = last - first;
    return Semantics(
      label: 'Evolución de tu puntaje promedio: de $first a $last por ciento',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  trend >= 0 ? Icons.trending_up_rounded : Icons.trending_down_rounded,
                  color: trend >= 0 ? AikoColors.success : const Color(0xFFE07B39),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    trend >= 0
                        ? '¡Vas subiendo! $last% en tu último día'
                        : 'Tu último día: $last%. ¡Sigue practicando!',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 150,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: reduceMotion(context)
                    ? Duration.zero
                    : const Duration(milliseconds: 1200),
                curve: Curves.easeInOutCubic,
                builder: (context, t, _) => CustomPaint(
                  size: Size.infinite,
                  painter: _LinePainter(series.map((p) => p.valor).toList(), t),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(shortDate(series.first.fecha),
                    style: const TextStyle(fontSize: 12, color: AikoColors.inkSoft)),
                Text(shortDate(series.last.fecha),
                    style: const TextStyle(fontSize: 12, color: AikoColors.inkSoft)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Línea de puntajes (0–100) que se dibuja de izquierda a derecha.
class _LinePainter extends CustomPainter {
  _LinePainter(this.values, this.t);

  final List<double> values;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = AikoColors.lilacSoft
      ..strokeWidth = 1;
    for (final y in [0.0, 0.5, 1.0]) {
      canvas.drawLine(Offset(0, size.height * y), Offset(size.width, size.height * y), grid);
    }
    // Línea del mínimo para avanzar (60 %).
    final minY = size.height * (1 - 0.6);
    canvas.drawLine(
      Offset(0, minY),
      Offset(size.width, minY),
      Paint()
        ..color = AikoColors.star
        ..strokeWidth = 2,
    );

    Offset point(int i) => Offset(
          values.length == 1 ? size.width / 2 : size.width * i / (values.length - 1),
          size.height * (1 - (values[i].clamp(0, 100) / 100)),
        );
    final path = Path()..moveTo(point(0).dx, point(0).dy);
    for (var i = 1; i < values.length; i++) {
      final a = point(i - 1);
      final b = point(i);
      final mid = (a.dx + b.dx) / 2;
      path.cubicTo(mid, a.dy, mid, b.dy, b.dx, b.dy);
    }
    final metric = path.computeMetrics().first;
    final visible = metric.extractPath(0, metric.length * t);

    final area = Path.from(visible)
      ..lineTo(metric.getTangentForOffset(metric.length * t)?.position.dx ?? 0, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AikoColors.violetBright.withValues(alpha: 0.28), Colors.transparent],
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(
      visible,
      Paint()
        ..color = AikoColors.violet
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round,
    );
    final dot = Paint()..color = AikoColors.violet;
    for (var i = 0; i < values.length; i++) {
      if (values.length > 1 && i / (values.length - 1) > t + 0.001) break;
      canvas
        ..drawCircle(point(i), 6, Paint()..color = Colors.white)
        ..drawCircle(point(i), 4, dot);
    }
  }

  @override
  bool shouldRepaint(_LinePainter old) => old.t != t || old.values != values;
}

// ---------------------------------------------------------------------------

class _Badges extends StatelessWidget {
  const _Badges({required this.catalog, required this.earned});

  final List<AikoBadge> catalog;
  final Set<String> earned;

  void _show(BuildContext context, AikoBadge badge, bool got) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _BadgeIcon(got: got, size: 84),
            const SizedBox(height: 12),
            Text(badge.nombre,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(
              badge.descripcion.isEmpty ? 'Insignia de AiKO' : badge.descripcion,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, color: AikoColors.inkSoft),
            ),
            const SizedBox(height: 10),
            Text(got ? '¡Ya es tuya!' : 'Aún no la tienes',
                style: TextStyle(
                    fontWeight: FontWeight.w900,
                    color: got ? AikoColors.success : AikoColors.violet)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (catalog.isEmpty) {
      return const _EmptyHint(text: 'Pronto podrás ganar insignias.');
    }
    return Wrap(
      spacing: 12,
      runSpacing: 14,
      children: [
        for (final badge in catalog)
          Builder(builder: (context) {
            final got = earned.contains(badge.nombre);
            return Semantics(
              button: true,
              label: '${badge.nombre}, ${got ? 'obtenida' : 'bloqueada'}',
              excludeSemantics: true,
              child: Pressable(
                onTap: () => _show(context, badge, got),
                child: SizedBox(
                  width: 96,
                  child: Column(
                    children: [
                      _BadgeIcon(got: got),
                      const SizedBox(height: 6),
                      Text(badge.nombre,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: got ? AikoColors.ink : AikoColors.inkSoft)),
                    ],
                  ),
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _BadgeIcon extends StatelessWidget {
  const _BadgeIcon({required this.got, this.size = 64});

  final bool got;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: size,
      width: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: got
            ? const RadialGradient(colors: [Color(0xFFFFE680), AikoColors.star])
            : null,
        color: got ? null : const Color(0xFFE6E1EF),
        boxShadow: [
          BoxShadow(
            color: got ? AikoColors.starDeep : const Color(0xFFCFC8DC),
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Icon(
        got ? Icons.military_tech_rounded : Icons.lock_rounded,
        size: size * 0.5,
        color: got ? const Color(0xFF8A5A00) : const Color(0xFFA59EB8),
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class _AttemptTile extends StatelessWidget {
  const _AttemptTile({required this.attempt});

  final Attempt attempt;

  @override
  Widget build(BuildContext context) {
    final style = CategoryStyle.of(attempt.categoria ?? '');
    final date = attempt.fecha;
    final when = date == null
        ? ''
        : '${shortDate(date.toIso8601String().substring(0, 10))} · '
            '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    final color = attempt.passed ? AikoColors.success : const Color(0xFFE07B39);
    return Semantics(
      label: '${attempt.nombre}, ${attempt.puntaje} por ciento, $when',
      excludeSemantics: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            Icon(style.icon, color: style.foreground),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(attempt.nombre,
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text(
                    [
                      when,
                      if (attempt.tiempoMs != null) '${attempt.tiempoMs} ms',
                      if (attempt.xp > 0) '+${attempt.xp} XP',
                    ].where((s) => s.isNotEmpty).join(' · '),
                    style: const TextStyle(fontSize: 12, color: AikoColors.inkSoft),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('${attempt.puntaje}%',
                  style: TextStyle(fontWeight: FontWeight.w900, color: color)),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            const AikoMascot(size: 40, animate: false),
            const SizedBox(width: 12),
            Expanded(
              child: Text(text,
                  style: const TextStyle(color: AikoColors.inkSoft, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const AikoMascot(size: 90, animate: false),
              const SizedBox(height: 14),
              const Text('No pudimos cargar tu progreso',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              const SizedBox(height: 6),
              Text(message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AikoColors.inkSoft)),
              const SizedBox(height: 18),
              FilledButton(onPressed: onRetry, child: const Text('Reintentar')),
            ],
          ),
        ),
      );
}
