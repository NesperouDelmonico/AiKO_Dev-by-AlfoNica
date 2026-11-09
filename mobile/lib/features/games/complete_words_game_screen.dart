import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme.dart';
import 'game_outcome.dart';
import 'game_shell.dart';
import 'word_puzzle.dart';

/// Mensajes de ánimo al completar cada palabra o frase.
const cheerMessages = [
  '¡Excelente!',
  '¡Muy bien!',
  '¡Lo lograste!',
  '¡Sigue así!',
  '¡Qué buena memoria!',
  '¡Perfecto!',
  '¡Vas genial!',
];

/// Completar palabras: primero palabras sueltas y luego frases. En cada
/// una faltan letras que se completan con fichas tipo scrabble (arrastrar
/// o tocar). Hay un número de intentos (errores permitidos) y un tiempo
/// total; al completar cada palabra aparece un mensaje de ánimo.
class CompleteWordsGameScreen extends StatefulWidget {
  const CompleteWordsGameScreen({
    super.key,
    required this.palabras,
    this.frases = const [],
    required this.letrasFaltantes,
    required this.intentos,
    required this.duracionSegundos,
    this.imagenId,
    this.random,
  });

  final List<String> palabras;
  final List<String> frases;
  final int letrasFaltantes;

  /// Errores permitidos en toda la partida.
  final int intentos;
  final int duracionSegundos;
  final String? imagenId;
  final Random? random;

  @override
  State<CompleteWordsGameScreen> createState() =>
      _CompleteWordsGameScreenState();
}

class _Item {
  _Item(this.text, this.words, this.isPhrase);
  final String text;
  final List<PuzzleWord> words;
  final bool isPhrase;

  /// Huecos en orden: (palabra, posición).
  late final List<(int, int)> blanks = [
    for (var w = 0; w < words.length; w++)
      for (final p in words[w].hidden) (w, p),
  ];

  late final List<LetterTile> bank = () {
    var id = 0;
    final tiles = [
      for (final word in words)
        for (final tile in word.bank) LetterTile(id++, tile.char),
    ];
    return tiles;
  }();
}

class _CompleteWordsGameScreenState extends State<CompleteWordsGameScreen> {
  late final Random _random = widget.random ?? Random();
  late final List<_Item> _items = [
    for (final w in widget.palabras)
      _Item(w, buildPuzzle(w, widget.letrasFaltantes, _random), false),
    for (final f in widget.frases)
      _Item(f, buildPuzzle(f, max(1, widget.letrasFaltantes - 1), _random), true),
  ]..removeWhere((item) => item.blanks.isEmpty);
  late final int _total = _items.fold(0, (n, item) => n + item.blanks.length);
  late final List<LetterTile> _shuffledBank =
      List.of(_items.isEmpty ? <LetterTile>[] : _items.first.bank)..shuffle(_random);

  final _clock = Stopwatch()..start();
  Timer? _ticker;
  late int _remaining = widget.duracionSegundos;

  int _index = 0;
  final Map<(int, int), String> _filled = {};
  final Set<int> _usedTiles = {};
  int _placed = 0;
  int _errors = 0;
  int _completed = 0;
  String? _hint;
  String? _cheer;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    if (_items.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _finish());
      return;
    }
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

  _Item get _item => _items[_index];
  int get _livesLeft => max(0, widget.intentos - _errors);

  void _place(LetterTile tile, (int, int) blank) {
    if (_done || _cheer != null || _filled.containsKey(blank)) return;
    final expected = _item.words[blank.$1].chars[blank.$2];
    if (tile.char.toLowerCase() == expected.toLowerCase()) {
      setState(() {
        _filled[blank] = expected;
        _usedTiles.add(tile.id);
        _placed++;
        _hint = null;
      });
      if (_filled.length == _item.blanks.length) _itemDone();
    } else {
      setState(() {
        _errors++;
        _hint = _livesLeft == 0
            ? 'Se acabaron los intentos.'
            : 'Esa letra no va ahí. Te quedan $_livesLeft '
                '${_livesLeft == 1 ? 'intento' : 'intentos'}.';
      });
      if (_livesLeft == 0) {
        Future.delayed(const Duration(milliseconds: 900), _finish);
      }
    }
  }

  void _tap(LetterTile tile) {
    final next = _item.blanks.firstWhere(
      (b) => !_filled.containsKey(b),
      orElse: () => (-1, -1),
    );
    if (next.$1 >= 0) _place(tile, next);
  }

  void _itemDone() {
    _completed++;
    setState(() => _cheer = cheerMessages[_random.nextInt(cheerMessages.length)]);
    Future.delayed(const Duration(milliseconds: 1300), () {
      if (!mounted || _done) return;
      if (_index + 1 >= _items.length) {
        _finish();
        return;
      }
      setState(() {
        _index++;
        _filled.clear();
        _usedTiles.clear();
        _cheer = null;
        _hint = null;
        _shuffledBank
          ..clear()
          ..addAll(List.of(_item.bank)..shuffle(_random));
      });
    });
  }

  void _finish() {
    if (_done || !mounted) return;
    _ticker?.cancel();
    _done = true;
    Navigator.of(context).pop(GameOutcome(
      puntaje: puzzleScore(placed: _placed, total: _total, errors: _errors),
      aciertos: _completed,
      intentos: _items.length,
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
    if (_items.isEmpty) return const Scaffold(body: SizedBox.shrink());
    final item = _item;
    return GameShell(
      progress: _total == 0 ? 1 : _placed / _total,
      counter: '${_index + 1}/${_items.length}',
      title: item.isPhrase ? 'Completa la frase' : 'Completa la palabra',
      subtitle: 'Arrastra o toca las fichas de letras',
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          TimerPill(
            text: _clockText,
            semantics: 'Tiempo restante $_clockText',
            urgent: _remaining <= 20,
          ),
          const SizedBox(width: 10),
          _Lives(left: _livesLeft, total: widget.intentos),
        ],
      ),
      child: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(20, 6, 20, 28),
            children: [
              if (widget.imagenId != null && !item.isPhrase) ...[
                ExerciseImage(widget.imagenId!, height: 150),
                const SizedBox(height: 18),
              ],
              _board(item),
              const SizedBox(height: 26),
              _rack(),
              if (_hint != null)
                Semantics(
                  liveRegion: true,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 16),
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
          if (_cheer != null) _CheerBanner(text: _cheer!, word: item.text),
        ],
      ),
    );
  }

  /// Tablero: las palabras con sus huecos.
  Widget _board(_Item item) {
    final complete = _filled.length == item.blanks.length;
    final tileSize = item.isPhrase ? 38.0 : 50.0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: softCard(),
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: item.isPhrase ? 16 : 0,
        runSpacing: 12,
        children: [
          for (var w = 0; w < item.words.length; w++)
            Wrap(
              spacing: 4,
              children: [
                for (var p = 0; p < item.words[w].chars.length; p++)
                  if (item.words[w].hidden.contains(p))
                    DragTarget<LetterTile>(
                      onWillAcceptWithDetails: (_) => !_filled.containsKey((w, p)),
                      onAcceptWithDetails: (details) => _place(details.data, (w, p)),
                      builder: (context, candidate, _) => _filled[(w, p)] == null
                          ? _EmptySlot(size: tileSize, highlighted: candidate.isNotEmpty)
                          : ScrabbleTile(
                              letter: _filled[(w, p)]!,
                              size: tileSize,
                              success: complete,
                            ),
                    )
                  else
                    _FixedLetter(item.words[w].chars[p], size: tileSize),
              ],
            ),
        ],
      ),
    );
  }

  /// Atril con las fichas disponibles.
  Widget _rack() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 14, 12, 18),
      decoration: BoxDecoration(
        color: const Color(0xFFB98552),
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [BoxShadow(color: Color(0xFF8A5C32), offset: Offset(0, 5))],
      ),
      child: Wrap(
        spacing: 10,
        runSpacing: 12,
        alignment: WrapAlignment.center,
        children: [
          for (final tile in _shuffledBank)
            if (!_usedTiles.contains(tile.id))
              _DraggableTile(tile: tile, onTap: () => _tap(tile)),
        ],
      ),
    );
  }
}

/// Puntos de cada letra en el scrabble en español (solo decorativo).
int scrabblePoints(String letter) {
  const points = {
    'a': 1, 'e': 1, 'o': 1, 'i': 1, 's': 1, 'n': 1, 'l': 1, 'r': 1, 'u': 1, 't': 1,
    'd': 2, 'g': 2, 'c': 3, 'b': 3, 'm': 3, 'p': 3, 'h': 4, 'f': 4, 'v': 4, 'y': 4,
    'q': 5, 'j': 8, 'ñ': 8, 'x': 8, 'z': 10, 'k': 10, 'w': 10,
  };
  const plain = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u'};
  final lower = letter.toLowerCase();
  return points[plain[lower] ?? lower] ?? 1;
}

/// Ficha de madera estilo scrabble.
class ScrabbleTile extends StatelessWidget {
  const ScrabbleTile({
    super.key,
    required this.letter,
    this.size = 54,
    this.lifted = false,
    this.success = false,
  });

  final String letter;
  final double size;
  final bool lifted;
  final bool success;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: success
              ? const [Color(0xFFE3F7EC), Color(0xFFBFE8D2)]
              : const [Color(0xFFFFF1CF), Color(0xFFF2D59A)],
        ),
        borderRadius: BorderRadius.circular(size * 0.18),
        border: Border.all(
            color: success ? AikoColors.success : const Color(0xFFD9B26F), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: lifted
                ? Colors.black.withValues(alpha: 0.25)
                : (success ? const Color(0xFF7CC4A0) : const Color(0xFFC79A55)),
            offset: Offset(0, lifted ? 8 : 3),
            blurRadius: lifted ? 14 : 0,
          ),
        ],
      ),
      child: Stack(
        children: [
          Center(
            child: Text(letter.toUpperCase(),
                style: TextStyle(
                    fontSize: size * 0.5,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF4A3220))),
          ),
          Positioned(
            right: size * 0.1,
            bottom: size * 0.05,
            child: Text('${scrabblePoints(letter)}',
                style: TextStyle(
                    fontSize: size * 0.2,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF7A5A3A))),
          ),
        ],
      ),
    );
  }
}

class _FixedLetter extends StatelessWidget {
  const _FixedLetter(this.letter, {required this.size});
  final String letter;
  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Letra $letter',
        excludeSemantics: true,
        child: SizedBox(
          width: size * 0.82,
          height: size,
          child: Center(
            child: Text(letter.toUpperCase(),
                style: TextStyle(
                    fontSize: size * 0.56, fontWeight: FontWeight.w900, color: AikoColors.ink)),
          ),
        ),
      );
}

class _EmptySlot extends StatelessWidget {
  const _EmptySlot({required this.size, required this.highlighted});
  final double size;
  final bool highlighted;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Letra que falta',
        excludeSemantics: true,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: highlighted ? AikoColors.lilacSoft : const Color(0xFFF6F2FC),
            borderRadius: BorderRadius.circular(size * 0.18),
            border: Border.all(
                color: highlighted ? AikoColors.violet : AikoColors.lilac, width: 2),
          ),
        ),
      );
}

class _DraggableTile extends StatelessWidget {
  const _DraggableTile({required this.tile, required this.onTap});
  final LetterTile tile;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: 'Ficha ${tile.char}. Toca para ponerla o arrástrala.',
        excludeSemantics: true,
        child: Draggable<LetterTile>(
          data: tile,
          feedback: Material(
              color: Colors.transparent,
              child: ScrabbleTile(letter: tile.char, size: 60, lifted: true)),
          childWhenDragging: Opacity(opacity: 0.25, child: ScrabbleTile(letter: tile.char)),
          child: GestureDetector(onTap: onTap, child: ScrabbleTile(letter: tile.char)),
        ),
      );
}

/// Corazones con los intentos que quedan.
class _Lives extends StatelessWidget {
  const _Lives({required this.left, required this.total});
  final int left;
  final int total;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Te quedan $left de $total intentos',
        excludeSemantics: true,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: softCard(radius: 30),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < min(total, 5); i++)
                Icon(i < left ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                    size: 20, color: const Color(0xFFE0739C)),
              if (total > 5)
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: Text('$left',
                      style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFFE0739C))),
                ),
            ],
          ),
        ),
      );
}

/// Mensaje de ánimo que aparece al completar una palabra.
class _CheerBanner extends StatelessWidget {
  const _CheerBanner({required this.text, required this.word});
  final String text;
  final String word;

  @override
  Widget build(BuildContext context) => Positioned.fill(
        child: IgnorePointer(
          child: Center(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.6, end: 1),
              duration: const Duration(milliseconds: 380),
              curve: Curves.easeOutBack,
              builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
              child: Semantics(
                liveRegion: true,
                label: '$text Completaste $word',
                excludeSemantics: true,
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 32),
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 20),
                  decoration: softCard(color: const Color(0xFFDDF3EA), radius: 28, border: AikoColors.success),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.star_rounded, color: AikoColors.star, size: 44),
                      Text(text,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text(word,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 17, color: AikoColors.inkSoft, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}
