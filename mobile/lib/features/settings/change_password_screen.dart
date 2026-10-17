import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/validators.dart';
import '../../widgets/form_scaffold.dart';
import '../../widgets/password_field.dart';
import '../../widgets/submit_button.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final session = context.read<Session>();
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await session.changePassword(_current.text, _password.text);
      navigator.pop();
      messenger.showSnackBar(
          const SnackBar(content: Text('Contraseña actualizada.')));
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'Cambiar contraseña',
      subtitle: 'Escribe tu contraseña actual y elige una nueva.',
      children: [
        Form(
          key: _formKey,
          child: Column(
            children: [
              PasswordField(
                controller: _current,
                label: 'Contraseña actual',
                validator: (v) =>
                    (v == null || v.isEmpty) ? 'Escribe tu contraseña actual' : null,
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _password,
                label: 'Nueva contraseña',
                autofillHints: const [AutofillHints.newPassword],
                validator: Validators.newPassword,
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _confirm,
                label: 'Repite la nueva contraseña',
                autofillHints: const [AutofillHints.newPassword],
                textInputAction: TextInputAction.done,
                onSubmitted: _submit,
                validator: Validators.sameAs(() => _password.text),
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(_error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AikoColors.error, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: 24),
        SubmitButton(label: 'Guardar', loading: _loading, onPressed: _submit),
      ],
    );
  }
}
