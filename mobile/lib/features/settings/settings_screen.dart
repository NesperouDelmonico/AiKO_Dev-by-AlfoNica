import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_settings.dart';
import '../../core/config.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import '../../widgets/aiko_avatar.dart';
import 'change_password_screen.dart';
import 'personalize_screen.dart';

const appVersion = '0.2.0';

/// Ajustes: perfil, accesibilidad, recordatorios y cuenta.
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  Future<void> _logout(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Cerrar sesión?'),
        content: const Text('Tendrás que volver a escribir tu correo y contraseña.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: dialogButtonStyle,
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) await context.read<Session>().logout();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<Session>().user ?? const {};
    final settings = context.watch<AppSettings>();
    return Container(
      decoration: const BoxDecoration(gradient: AikoColors.softGradient),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            const Padding(
              padding: EdgeInsets.only(left: 4, bottom: 14),
              child: Text('Ajustes',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
            ),
            FadeSlideIn(child: _ProfileCard(user: user)),
            const SizedBox(height: 12),
            _Group(children: [
              ListTile(
                leading: const AikoAvatar(size: 40),
                title: const Text('Personaliza a AiKO',
                    style: TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text(settings.accessory.label),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const PersonalizeScreen()),
                ),
              ),
            ]),
            const SizedBox(height: 22),
            const _Section('Accesibilidad'),
            _Group(children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                child: Row(
                  children: [
                    const Icon(Icons.format_size_rounded, color: AikoColors.violet),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text('Tamaño de letra',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                    ),
                    Text(settings.textSize.label,
                        style: const TextStyle(color: AikoColors.inkSoft)),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 14),
                child: SegmentedButton<TextSizeOption>(
                  showSelectedIcon: false,
                  segments: [
                    for (final option in TextSizeOption.values)
                      ButtonSegment(
                        value: option,
                        label: Text('Aa',
                            semanticsLabel: option.label,
                            style: TextStyle(
                                fontSize: 14 * option.scale, fontWeight: FontWeight.w900)),
                      ),
                  ],
                  selected: {settings.textSize},
                  onSelectionChanged: (value) => settings.setTextSize(value.first),
                ),
              ),
              const Divider(height: 1),
              SwitchListTile(
                secondary: const Icon(Icons.motion_photos_off_rounded, color: AikoColors.violet),
                title: const Text('Reducir animaciones',
                    style: TextStyle(fontWeight: FontWeight.w800)),
                subtitle: const Text('Menos movimiento en pantalla'),
                value: settings.reduceMotion,
                onChanged: settings.setReduceMotion,
              ),
            ]),
            const SizedBox(height: 22),
            const _Section('Recordatorios'),
            const _ReminderCard(),
            const SizedBox(height: 22),
            const _Section('Cuenta'),
            _Group(children: [
              ListTile(
                leading: const Icon(Icons.lock_reset_rounded, color: AikoColors.violet),
                title: const Text('Cambiar contraseña',
                    style: TextStyle(fontWeight: FontWeight.w800)),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const ChangePasswordScreen()),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.logout_rounded, color: AikoColors.error),
                title: const Text('Cerrar sesión',
                    style: TextStyle(fontWeight: FontWeight.w800, color: AikoColors.error)),
                onTap: () => _logout(context),
              ),
            ]),
            const SizedBox(height: 28),
            const Center(child: AikoLogo(mascotSize: 56, animate: false)),
            const SizedBox(height: 8),
            const Text('Versión $appVersion',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AikoColors.inkSoft)),
            const Text('Servidor: ${AppConfig.apiBaseUrl}',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: AikoColors.inkSoft)),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
        header: true,
        child: Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(text,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
        ),
      );
}

class _Group extends StatelessWidget {
  const _Group({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Material(
          color: Colors.transparent,
          child: Column(mainAxisSize: MainAxisSize.min, children: children),
        ),
      );
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.user});

  final Map<String, dynamic> user;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AikoColors.heroGradient,
        borderRadius: BorderRadius.circular(26),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const AikoAvatar(size: 58),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${user['nombre'] ?? ''}',
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
                const SizedBox(height: 2),
                Text('${user['correo'] ?? ''}',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.9))),
                if (user['cedula'] != null)
                  Text('C.C. ${user['cedula']}',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Recordatorios (GET/PUT /pacientes/:id/preferencia-notificacion)

enum ReminderFrequency {
  daily('Diaria', 'Todos los días'),
  weekly('Semanal', 'Una vez por semana'),
  none('Ninguna', 'Sin recordatorios');

  const ReminderFrequency(this.api, this.label);
  final String api;
  final String label;

  static ReminderFrequency fromApi(String? value) =>
      values.firstWhere((f) => f.api == value, orElse: () => ReminderFrequency.none);
}

class _ReminderCard extends StatefulWidget {
  const _ReminderCard();

  @override
  State<_ReminderCard> createState() => _ReminderCardState();
}

class _ReminderCardState extends State<_ReminderCard> {
  ReminderFrequency _frequency = ReminderFrequency.none;
  TimeOfDay _time = const TimeOfDay(hour: 9, minute: 0);
  bool _loading = true;
  bool _saving = false;

  String? get _path {
    final id = context.read<Session>().pacienteId;
    return id == null ? null : '/pacientes/$id/preferencia-notificacion';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final path = _path;
    if (path == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final data = await context.read<Session>().api.get(path);
      final json = Map<String, dynamic>.from(data as Map);
      final parts = '${json['horario_recordatorio'] ?? json['horarioRecordatorio'] ?? '09:00'}'
          .split(':');
      if (!mounted) return;
      setState(() {
        _frequency = ReminderFrequency.fromApi(json['frecuencia'] as String?);
        _time = TimeOfDay(
          hour: int.tryParse(parts.first) ?? 9,
          minute: parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0,
        );
      });
    } on ApiException {
      // 404: aún no hay preferencia guardada.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save(ReminderFrequency frequency, TimeOfDay time) async {
    final path = _path;
    if (path == null) return;
    final previous = (_frequency, _time);
    setState(() {
      _frequency = frequency;
      _time = time;
      _saving = true;
    });
    try {
      await context.read<Session>().api.put(path, {
        'frecuencia': frequency.api,
        'horario_recordatorio':
            '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
      });
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Recordatorio guardado')));
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _frequency = previous.$1;
        _time = previous.$2;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const _Group(children: [
        Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator())),
      ]);
    }
    return _Group(children: [
      for (final option in ReminderFrequency.values)
        ListTile(
          selected: option == _frequency,
          title: Text(option.label, style: const TextStyle(fontWeight: FontWeight.w800)),
          trailing: Icon(
            option == _frequency
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked_rounded,
            color: option == _frequency ? AikoColors.violet : AikoColors.lilac,
          ),
          onTap: _saving || option == _frequency ? null : () => _save(option, _time),
        ),
      if (_frequency != ReminderFrequency.none) ...[
        const Divider(height: 1),
        ListTile(
          leading: const Icon(Icons.schedule_rounded, color: AikoColors.violet),
          title: const Text('Hora', style: TextStyle(fontWeight: FontWeight.w800)),
          trailing: Text(_time.format(context),
              style: const TextStyle(fontWeight: FontWeight.w900, color: AikoColors.violet)),
          onTap: _saving
              ? null
              : () async {
                  final picked = await showTimePicker(context: context, initialTime: _time);
                  if (picked != null) await _save(_frequency, picked);
                },
        ),
      ],
    ]);
  }
}
