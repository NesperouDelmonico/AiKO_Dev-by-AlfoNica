import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/validators.dart';
import '../../widgets/form_scaffold.dart';
import '../../widgets/submit_button.dart';
import 'reset_password_screen.dart';

/// Paso 1: el paciente escribe su correo y el backend le envía un código de 6 dígitos.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, this.initialEmail = ''});

  final String initialEmail;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _email = TextEditingController(text: widget.initialEmail);
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final session = context.read<Session>();
    final navigator = Navigator.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await session.requestPasswordReset(_email.text);
      if (!mounted) return;
      navigator.push(MaterialPageRoute<void>(
        builder: (_) => ResetPasswordScreen(email: _email.text.trim()),
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
      title: 'Recupera tu cuenta',
      subtitle:
          'Escribe el correo con el que te registraste y te enviaremos un código de 6 dígitos.',
      children: [
        Form(
          key: _formKey,
          child: TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: const InputDecoration(labelText: 'Correo electrónico'),
            validator: Validators.email,
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
        SubmitButton(label: 'Enviar código', loading: _loading, onPressed: _submit),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () {
            if (Validators.email(_email.text) != null) {
              setState(() => _error = 'Escribe primero tu correo.');
              return;
            }
            Navigator.of(context).push(MaterialPageRoute<void>(
              builder: (_) => ResetPasswordScreen(email: _email.text.trim()),
            ));
          },
          child: const Text('Ya tengo un código'),
        ),
      ],
    );
  }
}
