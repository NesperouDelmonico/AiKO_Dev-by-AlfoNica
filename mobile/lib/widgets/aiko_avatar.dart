import 'package:flutter/material.dart';

import '../core/app_settings.dart';
import 'mascot.dart';

/// Osito de AiKO con su accesorio, dibujado en código (el mismo dibujo del
/// panel web). Sin [accessory] usa el que lleva puesto el paciente.
class AikoAvatar extends StatelessWidget {
  const AikoAvatar({super.key, this.size = 48, this.accessory, this.animate = false});

  final double size;
  final AikoAccessory? accessory;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final chosen = accessory ?? wornAccessory(context);
    return Semantics(
      label: chosen == AikoAccessory.base ? 'AiKO' : 'AiKO con ${chosen.label.toLowerCase()}',
      image: true,
      excludeSemantics: true,
      child: SizedBox.square(
        dimension: size,
        child: Center(
          child: AikoMascot(
            size: size * 0.86,
            roomy: true,
            accessory: chosen,
            animate: animate,
          ),
        ),
      ),
    );
  }
}
