import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../widgets/motion.dart';
import 'progress_repository.dart';

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/// "2026-10" desplazado [delta] meses.
String shiftMonth(String month, int delta) {
  final year = int.parse(month.substring(0, 4));
  final m = int.parse(month.substring(5, 7)) - 1 + delta;
  final y = year + (m / 12).floor();
  final mm = m % 12 + 1;
  return '$y-${mm.toString().padLeft(2, '0')}';
}

/// Celdas del calendario (lunes primero): null = hueco antes del día 1.
List<int?> monthCells(String month) {
  final year = int.parse(month.substring(0, 4));
  final m = int.parse(month.substring(5, 7));
  final first = DateTime.utc(year, m, 1);
  final days = DateTime.utc(year, m + 1, 0).day;
  final offset = (first.weekday + 6) % 7; // lunes = 0
  return [for (var i = 0; i < offset; i++) null, for (var d = 1; d <= days; d++) d];
}

/// "Mi constancia": mes con los días practicados, racha y ejercicios de la
/// semana. Se puede ir a meses anteriores.
class ConsistencyCalendar extends StatefulWidget {
  const ConsistencyCalendar({super.key, required this.initial, required this.load});

  final Consistency initial;
  final Future<Consistency> Function(String month) load;

  @override
  State<ConsistencyCalendar> createState() => _ConsistencyCalendarState();
}

class _ConsistencyCalendarState extends State<ConsistencyCalendar> {
  late Consistency _data = widget.initial;
  bool _loading = false;

  @override
  void didUpdateWidget(covariant ConsistencyCalendar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.initial, widget.initial)) _data = widget.initial;
  }

  String get _currentMonth => widget.initial.hoy.substring(0, 7);

  Future<void> _go(int delta) async {
    final month = shiftMonth(_data.mes, delta);
    setState(() => _loading = true);
    try {
      final data = await widget.load(month);
      if (mounted) setState(() => _data = data);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No pudimos cargar ese mes.')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final month = _data.mes;
    final monthIndex = int.parse(month.substring(5, 7)) - 1;
    final title = '${monthNames[monthIndex]} ${month.substring(0, 4)}';
    final canGoForward = month.compareTo(_currentMonth) < 0;
    final cells = monthCells(month);
    final activeCount = _data.diasActivos.length;
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  IconButton(
                    tooltip: 'Mes anterior',
                    onPressed: _loading ? null : () => _go(-1),
                    icon: const Icon(Icons.chevron_left_rounded),
                  ),
                  Expanded(
                    child: Semantics(
                      header: true,
                      label: '$title, $activeCount días con práctica',
                      excludeSemantics: true,
                      child: Text(title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Mes siguiente',
                    onPressed: _loading || !canGoForward ? null : () => _go(1),
                    icon: const Icon(Icons.chevron_right_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  for (final d in const ['L', 'M', 'M', 'J', 'V', 'S', 'D'])
                    Expanded(
                      child: ExcludeSemantics(
                        child: Text(d,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w800, color: AikoColors.inkSoft)),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              AnimatedOpacity(
                opacity: _loading ? 0.4 : 1,
                duration: const Duration(milliseconds: 200),
                child: GridView.count(
                  crossAxisCount: 7,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 6,
                  crossAxisSpacing: 6,
                  children: [
                    for (final day in cells)
                      day == null ? const SizedBox.shrink() : _DayCell(day: day, month: month, data: _data),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _Tile(
                icon: Icons.local_fire_department_rounded,
                color: const Color(0xFFE07B39),
                value: _data.rachaActual,
                label: _data.rachaActual == 1 ? 'día seguido' : 'días seguidos',
                hint: _data.mejorRacha > _data.rachaActual ? 'Mejor racha: ${_data.mejorRacha}' : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Tile(
                icon: Icons.bar_chart_rounded,
                color: AikoColors.violet,
                value: _data.ejerciciosSemana,
                label: 'ejercicios esta semana',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({required this.day, required this.month, required this.data});

  final int day;
  final String month;
  final Consistency data;

  @override
  Widget build(BuildContext context) {
    final date = '$month-${day.toString().padLeft(2, '0')}';
    final active = data.diasActivos.contains(date);
    final today = date == data.hoy;
    final future = date.compareTo(data.hoy) > 0;
    return Semantics(
      label: '$day${active ? ', practicaste' : ''}${today ? ', hoy' : ''}',
      excludeSemantics: true,
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: active ? AikoColors.heroGradient : null,
          color: active ? null : (future ? Colors.transparent : AikoColors.lavenderBg),
          border: today ? Border.all(color: AikoColors.star, width: 3) : null,
        ),
        child: Text('$day',
            style: TextStyle(
              fontSize: 14,
              fontWeight: active || today ? FontWeight.w900 : FontWeight.w700,
              color: active
                  ? Colors.white
                  : future
                      ? const Color(0xFFC9C2DA)
                      : AikoColors.inkSoft,
            )),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
    this.hint,
  });

  final IconData icon;
  final Color color;
  final int value;
  final String label;
  final String? hint;

  @override
  Widget build(BuildContext context) => Semantics(
        label: '$value $label${hint == null ? '' : '. $hint'}',
        excludeSemantics: true,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 30),
              const SizedBox(height: 4),
              CountUp(value: value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: AikoColors.inkSoft)),
              if (hint != null)
                Text(hint!,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color)),
            ],
          ),
        ),
      );
}
