import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_settings.dart';
import '../core/theme.dart';
import 'brand_image.dart';
import 'mascot.dart';

IconData accessoryIcon(AikoAccessory accessory) => switch (accessory) {
      AikoAccessory.base => Icons.favorite_rounded,
      AikoAccessory.gorra => Icons.sports_baseball_rounded,
      AikoAccessory.gafas => Icons.visibility_rounded,
      AikoAccessory.audifonos => Icons.headphones_rounded,
      AikoAccessory.mono => Icons.auto_awesome_rounded,
      AikoAccessory.gorro => Icons.ac_unit_rounded,
    };

/// Cabeza de AiKO con el accesorio elegido en "Personaliza a AiKO"
/// (`avatar_<accesorio>.png`). Sin [accessory] usa el guardado.
class AikoAvatar extends StatelessWidget {
  const AikoAvatar({super.key, this.size = 48, this.accessory, this.animate = false});

  final double size;
  final AikoAccessory? accessory;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final chosen =
        accessory ?? context.select<AppSettings, AikoAccessory>((s) => s.accessory);
    return BrandImage(
      'avatar_${chosen.name}',
      width: size,
      height: size,
      semanticLabel: chosen == AikoAccessory.base ? 'AiKO' : 'AiKO con ${chosen.label.toLowerCase()}',
      fallback: SizedBox(
        width: size,
        height: size,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            AikoMascot(size: size * 0.86, animate: animate),
            if (chosen != AikoAccessory.base)
              Positioned(
                right: -size * 0.04,
                top: -size * 0.04,
                child: Container(
                  padding: EdgeInsets.all(size * 0.05),
                  decoration: BoxDecoration(
                    color: AikoColors.star,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: Icon(accessoryIcon(chosen), size: size * 0.24, color: AikoColors.violetDeep),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
