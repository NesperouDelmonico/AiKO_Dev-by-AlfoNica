import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/validators.dart';
import '../../widgets/mascot.dart';
import '../../widgets/motion.dart';
import '../../widgets/password_field.dart';
import '../../widgets/submit_button.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final session = context.read<Session>();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await session.login(_email.text, _password.text);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final notice = context.select<Session, String?>((s) => s.notice);
    final canGoBack = Navigator.of(context).canPop();
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: canGoBack
          ? AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              scrolledUnderElevation: 0,
            )
          : null,
      body: Container(
        decoration: const BoxDecoration(gradient: AikoColors.softGradient),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const FadeSlideIn(
                      offset: Offset(0, -16),
                      child: Center(child: AikoLogo(mascotSize: 104)),
                    ),
                    const SizedBox(height: 14),
                    const FadeSlideIn(
                      delay: Duration(milliseconds: 150),
                      child: Text('Entrena tu mente, un paso a la vez.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: AikoColors.inkSoft)),
                    ),
                    const SizedBox(height: 36),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: 'Correo electrónico'),
                      validator: Validators.email,
                    ),
                    const SizedBox(height: 14),
                    PasswordField(
                      controller: _password,
                      label: 'Contraseña',
                      textInputAction: TextInputAction.done,
                      onSubmitted: _submit,
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Escribe tu contraseña' : null,
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                ForgotPasswordScreen(initialEmail: _email.text.trim()),
                          ),
                        ),
                        child: const Text('¿Olvidaste tu contraseña?'),
                      ),
                    ),
                    if (notice != null) ...[
                      Text(notice,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AikoColors.violet,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 10),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AikoColors.error, fontWeight: FontWeight.w600)),
                    ],
                    const SizedBox(height: 24),
                    SubmitButton(
                        label: 'Iniciar sesión',
                        loading: _loading,
                        onPressed: _submit),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
