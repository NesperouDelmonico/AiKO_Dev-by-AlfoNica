import 'package:flutter/material.dart';

import '../../core/theme.dart';
import 'game_outcome.dart';
import 'game_shell.dart';

class LogicQuestion {
  const LogicQuestion({
    required this.enunciado,
    required this.opciones,
    required this.correcta,
    this.imagenId,
  });

  final String enunciado;
  final List<String> opciones;
  final int correcta;
  final String? imagenId;

  static LogicQuestion? fromJson(Map<String, dynamic> json) {
    final options = (json['opciones'] as List?)?.whereType<String>().toList();
    final correct = (json['correcta'] as num?)?.toInt();
    final text = json['enunciado'] as String?;
    if (text == null || options == null || options.length < 2) return null;
    if (correct == null || correct < 0 || correct >= options.length) return null;
    return LogicQuestion(
      enunciado: text,
      opciones: options,
      correcta: correct,
      imagenId: json['imagen_id'] as String?,
    );
  }
}

/// Lógica matemática: un problema por pantalla con imagen opcional y
/// respuestas como fichas (A, B, C…). Se elige y se pulsa "Comprobar".
class LogicGameScreen extends StatefulWidget {
  const LogicGameScreen({super.key, required this.preguntas});

  final List<LogicQuestion> preguntas;

  @override
  State<LogicGameScreen> createState() => _LogicGameScreenState();
}

class _LogicGameScreenState extends State<LogicGameScreen> {
  static const _letters = 'ABCDEF';
  final _stopwatch = Stopwatch()..start();
  final List<int> _answerTimes = [];
  int _index = 0;
  int _correct = 0;
  int? _selected;
  bool? _wasCorrect; // null mientras no se comprueba

  LogicQuestion get _question => widget.preguntas[_index];

  void _check() {
    final correct = _selected == _question.correcta;
    _answerTimes.add(_stopwatch.elapsedMilliseconds);
    setState(() {
      _wasCorrect = correct;
      if (correct) _correct++;
    });
  }

  void _next() {
    if (_index + 1 >= widget.preguntas.length) {
      final total = widget.preguntas.length;
      Navigator.of(context).pop(GameOutcome(
        puntaje: ((_correct * 100) / total).round(),
        aciertos: _correct,
        intentos: total,
        tiempoReaccionMs: _answerTimes.isEmpty
            ? null
            : (_answerTimes.reduce((a, b) => a + b) / _answerTimes.length).round(),
      ));
      return;
    }
    _stopwatch
      ..reset()
      ..start();
    setState(() {
      _index++;
      _selected = null;
      _wasCorrect = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final question = _question;
    final checked = _wasCorrect != null;
    return GameShell(
      progress: (_index + (checked ? 1 : 0)) / widget.preguntas.length,
      bottom: CheckBar(
        label: checked ? 'CONTINUAR' : 'COMPROBAR',
        onPressed: checked ? _next : (_selected == null ? null : _check),
        correct: _wasCorrect,
        feedback: !checked
            ? null
            : _wasCorrect!
                ? '¡Correcto!'
                : 'La respuesta era: ${_letters[question.correcta]}. ${question.opciones[question.correcta]}',
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        children: [
          Text('Resuelve el problema',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('Pregunta ${_index + 1} de ${widget.preguntas.length}',
              style: const TextStyle(color: AikoColors.inkSoft)),
          const SizedBox(height: 16),
          if (question.imagenId != null) ...[
            ExerciseImage(question.imagenId!),
            const SizedBox(height: 16),
          ],
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AikoColors.lilacSoft, width: 2),
            ),
            child: Text(question.enunciado,
                style: const TextStyle(fontSize: 19, height: 1.4)),
          ),
          const SizedBox(height: 22),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: [
              for (var i = 0; i < question.opciones.length; i++)
                _OptionChip(
                  letter: _letters[i],
                  text: question.opciones[i],
                  selected: _selected == i,
                  state: !checked
                      ? null
                      : i == question.correcta
                          ? true
                          : (i == _selected ? false : null),
                  onTap: checked ? null : () => setState(() => _selected = i),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OptionChip extends StatelessWidget {
  const _OptionChip({
    required this.letter,
    required this.text,
    required this.selected,
    required this.state,
    required this.onTap,
  });

  final String letter;
  final String text;
  final bool selected;

  /// true = correcta, false = elegida y errada, null = neutral.
  final bool? state;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final border = state == true
        ? AikoColors.success
        : state == false
            ? const Color(0xFFE07B39)
            : selected
                ? AikoColors.violet
                : const Color(0xFFDCD6E8);
    final fill = state == true
        ? const Color(0xFFDDF3EA)
        : state == false
            ? AikoColors.peachSoft
            : selected
                ? AikoColors.lilacSoft
                : Colors.white;
    return Semantics(
      button: true,
      selected: selected,
      label: 'Opción $letter: $text',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          constraints: const BoxConstraints(minHeight: 56, minWidth: 96),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: border, width: 2),
            // Borde inferior grueso tipo botón, sin bordes no uniformes.
            boxShadow: [BoxShadow(color: border, offset: const Offset(0, 3))],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$letter.',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, color: AikoColors.violet)),
              const SizedBox(width: 8),
              Flexible(
                child: Text(text,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
