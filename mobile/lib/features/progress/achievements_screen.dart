import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../widgets/brand_image.dart';
import '../../widgets/motion.dart';
import 'progress_repository.dart';

/// "Primer paso" → "primer_paso"; "Precisión" → "precision".
String badgeSlug(String name) {
  const accents = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n'};
  final lower = name.toLowerCase().split('').map((c) => accents[c] ?? c).join();
  return lower.replaceAll(RegExp(r'[^a-z0-9]+'), '_').replaceAll(RegExp(r'^_+|_+$'), '');
}

IconData _badgeIcon(String slug) => switch (slug) {
      'primer_paso' => Icons.pets_rounded,
      'constancia' => Icons.local_fire_department_rounded,
      'compromiso' => Icons.favorite_rounded,
      'precision' => Icons.track_changes_rounded,
      'explorador' => Icons.explore_rounded,
      'experto' => Icons.emoji_events_rounded,
      'excelencia' => Icons.diamond_rounded,
      _ => Icons.military_tech_rounded,
    };

/// Medalla de una insignia: `badge_<nombre>.png` si existe; bloqueada,
/// `badge_locked.png`. Sin imágenes, una medalla dibujada.
class BadgeArt extends StatelessWidget {
  const BadgeArt({super.key, required this.name, required this.got, this.size = 64});

  final String name;
  final bool got;
  final double size;

  @override
  Widget build(BuildContext context) {
    final slug = badgeSlug(name);
    final fallback = Container(
      height: size,
      width: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: got ? const RadialGradient(colors: [Color(0xFFFFE680), AikoColors.star]) : null,
        color: got ? null : const Color(0xFFE6E1EF),
        boxShadow: [
          BoxShadow(
            color: got ? AikoColors.starDeep : const Color(0xFFCFC8DC),
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Icon(
        got ? _badgeIcon(slug) : Icons.lock_rounded,
        size: size * 0.5,
        color: got ? const Color(0xFF8A5A00) : const Color(0xFFA59EB8),
      ),
    );
    return BrandImage(
      got ? 'badge_$slug' : 'badge_locked',
      width: size,
      height: size,
      fallback: fallback,
    );
  }
}

/// "Mis logros": insignias y estadísticas.
class AchievementsScreen extends StatelessWidget {
  const AchievementsScreen({super.key, required this.data});

  final ProgressData data;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AikoColors.lavenderBg,
        appBar: AppBar(
          backgroundColor: AikoColors.lavenderBg,
          title: const Text('Mis logros', style: TextStyle(fontWeight: FontWeight.w900)),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(58),
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: TabBar(
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                indicator: BoxDecoration(
                  color: AikoColors.violet,
                  borderRadius: BorderRadius.circular(12),
                ),
                labelColor: Colors.white,
                unselectedLabelColor: AikoColors.inkSoft,
                labelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                tabs: const [Tab(text: 'Insignias'), Tab(text: 'Estadísticas')],
              ),
            ),
          ),
        ),
        body: TabBarView(
          children: [
            _BadgesTab(data: data),
            _StatsTab(data: data),
          ],
        ),
      ),
    );
  }
}

class _BadgesTab extends StatelessWidget {
  const _BadgesTab({required this.data});
  final ProgressData data;

  @override
  Widget build(BuildContext context) {
    final badges = [...data.catalog]
      ..sort((a, b) {
        final ga = data.earned.contains(a.nombre) ? 0 : 1;
        final gb = data.earned.contains(b.nombre) ? 0 : 1;
        return ga.compareTo(gb);
      });
    if (badges.isEmpty) {
      return const Center(child: Text('Pronto podrás ganar insignias.'));
    }
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 180,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.78,
      ),
      itemCount: badges.length,
      itemBuilder: (context, i) {
        final badge = badges[i];
        final got = data.earned.contains(badge.nombre);
        return FadeSlideIn(
          delay: Duration(milliseconds: 40 * i),
          child: Semantics(
            label: '${badge.nombre}, ${got ? 'obtenida' : 'bloqueada'}. ${badge.descripcion}',
            excludeSemantics: true,
            child: Container(
              padding: const EdgeInsets.fromLTRB(10, 16, 10, 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                children: [
                  BadgeArt(name: badge.nombre, got: got, size: 72),
                  const SizedBox(height: 10),
                  Text(badge.nombre,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: got ? AikoColors.ink : AikoColors.inkSoft)),
                  const SizedBox(height: 4),
                  Expanded(
                    child: Text(
                      badge.descripcion.isEmpty ? 'Insignia de AiKO' : badge.descripcion,
                      textAlign: TextAlign.center,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5, color: AikoColors.inkSoft),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _StatsTab extends StatelessWidget {
  const _StatsTab({required this.data});
  final ProgressData data;

  @override
  Widget build(BuildContext context) {
    final c = data.consistency;
    final stats = <(IconData, Color, String, String)>[
      (Icons.star_rounded, AikoColors.starDeep, '${data.nivel}', 'Nivel'),
      (Icons.bolt_rounded, const Color(0xFFE07B39), '${data.xp}', 'Puntos de experiencia'),
      (Icons.military_tech_rounded, AikoColors.violet, '${data.earned.length}/${data.catalog.length}', 'Insignias'),
      (Icons.sports_esports_rounded, AikoColors.sky, '${data.history.total}', 'Intentos registrados'),
      if (c != null) ...[
        (Icons.local_fire_department_rounded, const Color(0xFFE07B39), '${c.rachaActual}', 'Días seguidos'),
        (Icons.workspace_premium_rounded, AikoColors.mint, '${c.mejorRacha}', 'Mejor racha'),
        (Icons.bar_chart_rounded, AikoColors.violet, '${c.ejerciciosSemana}', 'Ejercicios esta semana'),
      ],
    ];
    return GridView.count(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.15,
      children: [
        for (final (i, (icon, color, value, label)) in stats.indexed)
          FadeSlideIn(
            delay: Duration(milliseconds: 40 * i),
            child: Semantics(
              label: '$label: $value',
              excludeSemantics: true,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, color: color, size: 32),
                    const SizedBox(height: 6),
                    FittedBox(
                      child: Text(value,
                          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
                    ),
                    Text(label,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 13, color: AikoColors.inkSoft)),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
