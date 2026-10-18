import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/validators.dart';
import '../../widgets/form_scaffold.dart';
import '../../widgets/password_field.dart';
import '../../widgets/submit_button.dart';

/// Paso 2: código de 6 dígitos + nueva contraseña.
class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key, required this.email});

  final String email;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
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
      await session.resetPassword(
        correo: widget.email,
        codigo: _code.text,
        nuevaContrasena: _password.text,
      );
      navigator.popUntil((route) => route.isFirst);
      messenger.showSnackBar(const SnackBar(
        content: Text('Contraseña actualizada. Ya puedes iniciar sesión.'),
      ));
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'Crea tu nueva contraseña',
      subtitle:
          'Escribe el código que enviamos a ${widget.email}. Vence en 15 minutos.',
      children: [
        Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _code,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                autofillHints: const [AutofillHints.oneTimeCode],
                style: const TextStyle(fontSize: 24, letterSpacing: 8),
                textAlign: TextAlign.center,
                decoration: const InputDecoration(labelText: 'Código de 6 dígitos'),
                validator: Validators.code,
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _password,
                label: 'Nueva contraseña',
                autofillHints: const [AutofillHints.newPassword],
                validator: Validators.newPassword,
              ),
              const SizedBox(height: 6),
              const Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: EdgeInsets.only(left: 6),
                  child: Text(
                      'Mínimo 8 caracteres, con mayúscula, minúscula y número.',
                      style: TextStyle(fontSize: 13, color: AikoColors.inkSoft)),
                ),
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _confirm,
                label: 'Repite la contraseña',
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
        SubmitButton(
            label: 'Cambiar contraseña', loading: _loading, onPressed: _submit),
      ],
    );
  }
}
