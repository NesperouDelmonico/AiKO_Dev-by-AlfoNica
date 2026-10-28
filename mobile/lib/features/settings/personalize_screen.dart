import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_settings.dart';
import '../../core/theme.dart';
import '../../widgets/aiko_avatar.dart';
import '../../widgets/motion.dart';

/// "Personaliza a AiKO": elegir el accesorio del compañero.
class PersonalizeScreen extends StatefulWidget {
  const PersonalizeScreen({super.key});

  @override
  State<PersonalizeScreen> createState() => _PersonalizeScreenState();
}

class _PersonalizeScreenState extends State<PersonalizeScreen> {
  late AikoAccessory _choice = context.read<AppSettings>().accessory;

  Future<void> _save() async {
    await context.read<AppSettings>().setAccessory(_choice);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('¡AiKO estrena look!')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AikoColors.lavenderBg,
      appBar: AppBar(
        backgroundColor: AikoColors.lavenderBg,
        title: const Text('Personaliza a AiKO', style: TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          const Text('Elige un accesorio para tu compañero',
              style: TextStyle(fontSize: 16, color: AikoColors.inkSoft)),
          const SizedBox(height: 18),
          Center(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, animation) =>
                  ScaleTransition(scale: animation, child: child),
              child: Container(
                key: ValueKey(_choice),
                padding: const EdgeInsets.all(18),
                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                child: AikoAvatar(size: 150, accessory: _choice, animate: true),
              ),
            ),
          ),
          const SizedBox(height: 22),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.86,
            children: [
              for (final accessory in AikoAccessory.values)
                Semantics(
                  button: true,
                  selected: accessory == _choice,
                  label: accessory.label,
                  excludeSemantics: true,
                  child: Pressable(
                    onTap: () => setState(() => _choice = accessory),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: accessory == _choice ? AikoColors.lilacSoft : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: accessory == _choice ? AikoColors.violet : Colors.transparent,
                          width: 3,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AikoAvatar(size: 62, accessory: accessory),
                          const SizedBox(height: 6),
                          Text(accessory.label,
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: FilledButton(onPressed: _save, child: const Text('Guardar')),
      ),
    );
  }
}
