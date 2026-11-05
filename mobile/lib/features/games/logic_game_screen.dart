import 'dart:async';

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

/// Lógica matemática estilo examen: un problema por pantalla con
/// respuestas A, B, C… Al tocar una, la correcta se pinta de verde y las
/// demás de rojo. Hay un tiempo total para toda la partida.
class LogicGameScreen extends StatefulWidget {
  const LogicGameScreen({
    super.key,
    required this.preguntas,
    this.duracionSegundos = 300,
  });

  final List<LogicQuestion> preguntas;
  final int duracionSegundos;

  @override
  State<LogicGameScreen> createState() => _LogicGameScreenState();
}

class _LogicGameScreenState extends State<LogicGameScreen> {
  static const _letters = 'ABCDEF';
  final _stopwatch = Stopwatch()..start();
  final List<int> _answerTimes = [];
  Timer? _ticker;
  late int _remaining = widget.duracionSegundos;
  int _index = 0;
  int _correct = 0;
  int? _selected; // null mientras no responde
  bool _done = false;

  LogicQuestion get _question => widget.preguntas[_index];

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remaining <= 1) {
        timer.cancel();
        _finish();
      } else {
        setState(() => _remaining--);
      }
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _answer(int option) {
    if (_selected != null || _done) return;
    _answerTimes.add(_stopwatch.elapsedMilliseconds);
    setState(() {
      _selected = option;
      if (option == _question.correcta) _correct++;
    });
  }

  void _next() {
    if (_index + 1 >= widget.preguntas.length) {
      _finish();
      return;
    }
    _stopwatch
      ..reset()
      ..start();
    setState(() {
      _index++;
      _selected = null;
    });
  }

  void _finish() {
    if (_done || !mounted) return;
    _done = true;
    _ticker?.cancel();
    final total = widget.preguntas.length;
    Navigator.of(context).pop(GameOutcome(
      puntaje: ((_correct * 100) / total).round(),
      aciertos: _correct,
      intentos: total,
      tiempoReaccionMs: _answerTimes.isEmpty
          ? null
          : (_answerTimes.reduce((a, b) => a + b) / _answerTimes.length).round(),
    ));
  }

  String get _clockText {
    final m = _remaining ~/ 60;
    final s = (_remaining % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final question = _question;
    final answered = _selected != null;
    final right = _selected == question.correcta;
    return GameShell(
      progress: (_index + (answered ? 1 : 0)) / widget.preguntas.length,
      title: 'Resuelve el problema',
      subtitle: 'Lee con calma y toca la respuesta correcta.',
      counter: '${_index + 1}/${widget.preguntas.length}',
      trailing: TimerPill(
        text: _clockText,
        semantics: 'Tiempo restante $_clockText',
        urgent: _remaining <= 20,
      ),
      bottom: answered
          ? CheckBar(
              label: _index + 1 >= widget.preguntas.length ? 'TERMINAR' : 'SIGUIENTE',
              onPressed: _next,
              correct: right,
              feedback: right
                  ? '¡Correcto!'
                  : 'La respuesta era ${_letters[question.correcta]}. ${question.opciones[question.correcta]}',
            )
          : null,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 20),
        children: [
          if (question.imagenId != null) ...[
            ExerciseImage(question.imagenId!),
            const SizedBox(height: 16),
          ],
          Container(
            padding: const EdgeInsets.all(20),
            decoration: softCard(),
            child: Text(question.enunciado,
                style: const TextStyle(fontSize: 19, height: 1.4)),
          ),
          const SizedBox(height: 20),
          for (var i = 0; i < question.opciones.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: OptionTile(
                letter: _letters[i],
                text: question.opciones[i],
                state: !answered ? null : i == question.correcta,
                chosen: _selected == i,
                onTap: answered ? null : () => _answer(i),
              ),
            ),
        ],
      ),
    );
  }
}

/// Respuesta tipo examen. [state]: null antes de responder; true la
/// correcta (verde); false las demás (rojo).
class OptionTile extends StatelessWidget {
  const OptionTile({
    super.key,
    required this.letter,
    required this.text,
    required this.state,
    required this.onTap,
    this.chosen = false,
  });

  final String letter;
  final String text;
  final bool? state;
  final bool chosen;
  final VoidCallback? onTap;

  static const green = Color(0xFF2F9E73);
  static const greenSoft = Color(0xFFDDF3EA);
  static const red = Color(0xFFD9534F);
  static const redSoft = Color(0xFFFDE2E1);

  @override
  Widget build(BuildContext context) {
    final border = state == null ? const Color(0xFFDCD6E8) : (state! ? green : red);
    final fill = state == null ? Colors.white : (state! ? greenSoft : redSoft);
    return Semantics(
      button: onTap != null,
      label: 'Opción $letter: $text'
          '${state == null ? '' : state! ? ', correcta' : ', incorrecta'}'
          '${chosen ? ', tu respuesta' : ''}',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          constraints: const BoxConstraints(minHeight: 60),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border, width: chosen ? 3 : 2),
            boxShadow: [BoxShadow(color: border, offset: const Offset(0, 3))],
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: state == null ? AikoColors.lilacSoft : border,
                  shape: BoxShape.circle,
                ),
                child: state == null
                    ? Text(letter,
                        style: const TextStyle(
                            fontWeight: FontWeight.w900, color: AikoColors.violet, fontSize: 17))
                    : Icon(state! ? Icons.check_rounded : Icons.close_rounded,
                        color: Colors.white, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(text,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
