import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme.dart';
import 'game_outcome.dart';
import 'game_shell.dart';
import 'word_puzzle.dart';

/// Completar palabras: primero se arrastran las letras que faltan en cada
/// palabra; si es una frase, luego se arrastran las palabras para ordenarla.
/// También se puede tocar una ficha para ponerla en la siguiente casilla
/// (útil si arrastrar cuesta).
class CompleteWordsGameScreen extends StatefulWidget {
  const CompleteWordsGameScreen({
    super.key,
    required this.frase,
    required this.letrasOcultas,
    required this.duracionSegundos,
    this.imagenId,
    this.random,
  });

  final String frase;
  final int letrasOcultas;
  final int duracionSegundos;
  final String? imagenId;
  final Random? random;

  @override
  State<CompleteWordsGameScreen> createState() =>
      _CompleteWordsGameScreenState();
}

class _CompleteWordsGameScreenState extends State<CompleteWordsGameScreen> {
  late final Random _random = widget.random ?? Random();
  late final List<PuzzleWord> _words =
      buildPuzzle(widget.frase, widget.letrasOcultas, _random);
  late final List<String> _texts = _words.map((w) => w.text).toList();
  late final bool _hasSentence = _words.length > 1;
  late final int _total = _words.fold<int>(0, (n, w) => n + w.hidden.length) +
      (_hasSentence ? _words.length : 0);
  final _clock = Stopwatch()..start();
  Timer? _ticker;
  late int _remaining = widget.duracionSegundos;

  int _wordIndex = 0;
  // Letras puestas en la palabra actual: posición → letra.
  final Map<int, String> _filled = {};
  final Set<int> _usedTiles = {};
  // Etapa de la frase.
  bool _sentenceStage = false;
  late final List<int> _chipOrder =
      shuffledOrder(_words.length, _random, _texts);
  final List<int?> _sentence = [];
  final Set<int> _usedChips = {};

  int _placed = 0;
  int _errors = 0;
  String? _hint;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _skipWordsWithoutBlanks();
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

  PuzzleWord get _word => _words[_wordIndex];

  void _skipWordsWithoutBlanks() {
    while (!_sentenceStage && _wordIndex < _words.length && _word.hidden.isEmpty) {
      _advanceWord(silent: true);
    }
  }

  // ----- Etapa 1: letras -------------------------------------------------

  void _placeLetter(LetterTile tile, int position) {
    if (_done || _filled.containsKey(position)) return;
    final expected = _word.chars[position];
    if (tile.char.toLowerCase() == expected.toLowerCase()) {
      setState(() {
        _filled[position] = expected;
        _usedTiles.add(tile.id);
        _placed++;
        _hint = null;
      });
      if (_filled.length == _word.hidden.length) {
        Future.delayed(const Duration(milliseconds: 600), () {
          if (mounted && !_done) setState(() => _advanceWord());
        });
      }
    } else {
      setState(() {
        _errors++;
        _hint = 'Esa letra no va ahí. Prueba otra.';
      });
    }
  }

  void _tapLetter(LetterTile tile) {
    final next = _word.hidden.firstWhere(
      (position) => !_filled.containsKey(position),
      orElse: () => -1,
    );
    if (next >= 0) _placeLetter(tile, next);
  }

  void _advanceWord({bool silent = false}) {
    _filled.clear();
    _usedTiles.clear();
    _hint = null;
    _wordIndex++;
    if (_wordIndex >= _words.length) {
      if (_hasSentence) {
        _sentenceStage = true;
        _sentence
          ..clear()
          ..addAll(List.filled(_words.length, null));
      } else {
        // Se termina fuera de setState.
        WidgetsBinding.instance.addPostFrameCallback((_) => _finish());
      }
      return;
    }
    if (!silent) _skipWordsWithoutBlanks();
  }

  // ----- Etapa 2: frase --------------------------------------------------

  void _placeWord(int wordIndex, int slot) {
    if (_done || _sentence[slot] != null) return;
    if (_texts[wordIndex] == _texts[slot]) {
      setState(() {
        _sentence[slot] = wordIndex;
        _usedChips.add(wordIndex);
        _placed++;
        _hint = null;
      });
      if (!_sentence.contains(null)) {
        Future.delayed(const Duration(milliseconds: 700), _finish);
      }
    } else {
      setState(() {
        _errors++;
        _hint = 'Esa palabra no va en ese lugar.';
      });
    }
  }

  void _tapWord(int wordIndex) {
    final slot = _sentence.indexOf(null);
    if (slot >= 0) _placeWord(wordIndex, slot);
  }

  // ----------------------------------------------------------------------

  void _finish() {
    if (_done || !mounted) return;
    _ticker?.cancel();
    _done = true;
    Navigator.of(context).pop(GameOutcome(
      puntaje: puzzleScore(placed: _placed, total: _total, errors: _errors),
      aciertos: _placed,
      intentos: _total,
      tiempoReaccionMs:
          _placed == 0 ? null : (_clock.elapsedMilliseconds / _placed).round(),
    ));
  }

  String get _clockText {
    final m = _remaining ~/ 60;
    final s = (_remaining % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final title = _sentenceStage ? 'Ordena la frase' : 'Completa la palabra';
    final subtitle = _sentenceStage
        ? 'Arrastra las palabras a su lugar'
        : _words.length > 1
            ? 'Palabra ${min(_wordIndex + 1, _words.length)} de ${_words.length}'
            : 'Arrastra las letras que faltan';
    return GameShell(
      progress: _total == 0 ? 1 : _placed / _total,
      title: title,
      subtitle: subtitle,
      trailing: TimerPill(
        text: _clockText,
        semantics: 'Tiempo restante $_clockText',
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 28),
        children: [
          if (widget.imagenId != null) ...[
            ExerciseImage(widget.imagenId!, height: 170),
            const SizedBox(height: 18),
          ],
          if (_sentenceStage) ..._sentenceView() else if (_wordIndex < _words.length) ..._wordView(),
          if (_hint != null)
            Semantics(
              liveRegion: true,
              child: Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Text(_hint!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFB4582B))),
              ),
            ),
        ],
      ),
    );
  }

  List<Widget> _wordView() {
    final word = _word;
    final complete = _filled.length == word.hidden.length;
    return [
      Center(
        child: Wrap(
          spacing: 6,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            for (var i = 0; i < word.chars.length; i++)
              word.hidden.contains(i)
                  ? DragTarget<LetterTile>(
                      onWillAcceptWithDetails: (_) => !_filled.containsKey(i),
                      onAcceptWithDetails: (details) =>
                          _placeLetter(details.data, i),
                      builder: (context, candidate, _) => _LetterBox(
                        letter: _filled[i],
                        highlighted: candidate.isNotEmpty,
                        success: complete,
                      ),
                    )
                  : _LetterBox(letter: word.chars[i], fixed: true, success: complete),
          ],
        ),
      ),
      const SizedBox(height: 30),
      Wrap(
        spacing: 10,
        runSpacing: 10,
        alignment: WrapAlignment.center,
        children: [
          for (final tile in word.bank)
            if (!_usedTiles.contains(tile.id))
              _DraggableChip<LetterTile>(
                data: tile,
                label: tile.char,
                large: true,
                onTap: () => _tapLetter(tile),
              ),
        ],
      ),
    ];
  }

  List<Widget> _sentenceView() {
    return [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Wrap(
          spacing: 8,
          runSpacing: 10,
          children: [
            for (var slot = 0; slot < _words.length; slot++)
              DragTarget<int>(
                onWillAcceptWithDetails: (_) => _sentence[slot] == null,
                onAcceptWithDetails: (details) => _placeWord(details.data, slot),
                builder: (context, candidate, _) {
                  final placed = _sentence[slot];
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    constraints: const BoxConstraints(minWidth: 72, minHeight: 48),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: candidate.isNotEmpty ? AikoColors.lilacSoft : AikoColors.lavenderBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: placed == null ? const Color(0xFFDCD6E8) : AikoColors.success,
                        width: 2,
                      ),
                    ),
                    child: Text(placed == null ? ' ' : _texts[placed],
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  );
                },
              ),
          ],
        ),
      ),
      const SizedBox(height: 28),
      Wrap(
        spacing: 10,
        runSpacing: 10,
        alignment: WrapAlignment.center,
        children: [
          for (final index in _chipOrder)
            if (!_usedChips.contains(index))
              _DraggableChip<int>(
                data: index,
                label: _texts[index],
                onTap: () => _tapWord(index),
              ),
        ],
      ),
    ];
  }
}

/// Casilla de una letra: fija, vacía (hueco para soltar) o ya completada.
class _LetterBox extends StatelessWidget {
  const _LetterBox({
    this.letter,
    this.fixed = false,
    this.highlighted = false,
    this.success = false,
  });

  final String? letter;
  final bool fixed;
  final bool highlighted;
  final bool success;

  @override
  Widget build(BuildContext context) {
    final empty = letter == null;
    return Semantics(
      label: empty ? 'Letra que falta' : 'Letra $letter',
      excludeSemantics: true,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 46,
        height: 56,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: highlighted
              ? AikoColors.lilacSoft
              : fixed
                  ? Colors.transparent
                  : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: fixed
              ? null
              : Border.all(
                  color: success
                      ? AikoColors.success
                      : empty
                          ? AikoColors.lilac
                          : AikoColors.violet,
                  width: 2,
                ),
        ),
        child: Text(letter ?? '',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: fixed ? AikoColors.ink : AikoColors.violet,
            )),
      ),
    );
  }
}

/// Ficha que se puede arrastrar o tocar.
class _DraggableChip<T extends Object> extends StatelessWidget {
  const _DraggableChip({
    required this.data,
    required this.label,
    required this.onTap,
    this.large = false,
  });

  final T data;
  final String label;
  final VoidCallback onTap;
  final bool large;

  Widget _chip({bool ghost = false, bool lifted = false}) => Container(
        constraints: BoxConstraints(minWidth: large ? 56 : 64, minHeight: 52),
        padding: EdgeInsets.symmetric(horizontal: large ? 14 : 16, vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: ghost ? const Color(0xFFEDEAF3) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFDCD6E8), width: 2),
          boxShadow: ghost
              ? null
              : [
                  BoxShadow(
                    color: lifted ? AikoColors.violet.withValues(alpha: 0.25) : const Color(0xFFDCD6E8),
                    offset: Offset(0, lifted ? 6 : 3),
                    blurRadius: lifted ? 12 : 0,
                  ),
                ],
        ),
        child: Text(ghost ? '' : label,
            style: TextStyle(fontSize: large ? 26 : 18, fontWeight: FontWeight.w700, color: AikoColors.ink)),
      );

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Ficha $label. Toca para ponerla o arrástrala.',
      excludeSemantics: true,
      child: Draggable<T>(
        data: data,
        feedback: Material(color: Colors.transparent, child: _chip(lifted: true)),
        childWhenDragging: _chip(ghost: true),
        child: GestureDetector(onTap: onTap, child: _chip()),
      ),
    );
  }
}
