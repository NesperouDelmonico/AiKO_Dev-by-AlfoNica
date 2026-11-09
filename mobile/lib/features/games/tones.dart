import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';

/// Frecuencias (Hz) de las notas de los botones: escala de do mayor.
const noteFrequencies = [262.0, 294.0, 330.0, 392.0, 440.0, 523.0, 587.0, 659.0, 784.0];

/// WAV PCM 16 bits mono con un tono suave (subida y caída para que no
/// "chasquee").
Uint8List sineWav(double frequency, {int durationMs = 380, int sampleRate = 22050}) {
  final samples = sampleRate * durationMs ~/ 1000;
  final data = ByteData(44 + samples * 2);
  void ascii(int offset, String text) {
    for (var i = 0; i < text.length; i++) {
      data.setUint8(offset + i, text.codeUnitAt(i));
    }
  }

  ascii(0, 'RIFF');
  data.setUint32(4, 36 + samples * 2, Endian.little);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  data.setUint32(16, 16, Endian.little);
  data.setUint16(20, 1, Endian.little); // PCM
  data.setUint16(22, 1, Endian.little); // mono
  data.setUint32(24, sampleRate, Endian.little);
  data.setUint32(28, sampleRate * 2, Endian.little);
  data.setUint16(32, 2, Endian.little);
  data.setUint16(34, 16, Endian.little);
  ascii(36, 'data');
  data.setUint32(40, samples * 2, Endian.little);
  final fade = sampleRate * 0.02;
  for (var i = 0; i < samples; i++) {
    final envelope = min(1.0, min(i / fade, (samples - i) / (fade * 4)));
    final value = sin(2 * pi * frequency * i / sampleRate) * 0.45 * envelope;
    data.setInt16(44 + i * 2, (value * 32767).round(), Endian.little);
  }
  return data.buffer.asUint8List();
}

/// Reproduce la nota de cada botón. Si el audio falla (o en pruebas) el
/// juego sigue sin sonido.
abstract class TonePlayer {
  Future<void> play(int index);
  void dispose();
}

class SilentTonePlayer implements TonePlayer {
  const SilentTonePlayer();
  @override
  Future<void> play(int index) async {}
  @override
  void dispose() {}
}

class AudioTonePlayer implements TonePlayer {
  AudioTonePlayer(int count)
      : _notes = [
          for (var i = 0; i < count; i++)
            sineWav(noteFrequencies[i % noteFrequencies.length]),
        ];

  final List<Uint8List> _notes;
  final List<AudioPlayer> _players = [];
  int _next = 0;

  @override
  Future<void> play(int index) async {
    try {
      // Varios reproductores para que las notas rápidas no se corten.
      if (_players.length < 3) _players.add(AudioPlayer());
      final player = _players[_next % _players.length];
      _next++;
      await player.stop();
      await player.play(BytesSource(_notes[index % _notes.length]));
    } catch (_) {
      // Sin sonido: el juego sigue con las luces.
    }
  }

  @override
  void dispose() {
    for (final player in _players) {
      player.dispose().catchError((_) {});
    }
  }
}
