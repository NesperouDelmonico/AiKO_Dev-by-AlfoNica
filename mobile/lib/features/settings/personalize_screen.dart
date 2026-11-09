import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_settings.dart';
import '../../core/theme.dart';
import '../../core/wallet.dart';
import '../../widgets/aiko_avatar.dart';
import '../../widgets/coins.dart';
import '../../widgets/motion.dart';

/// Tienda de AiKO: accesorios que de verdad cambian al osito, potenciador de
/// XP y salvadores de racha. Todo se paga con las monedas de los ejercicios.
class PersonalizeScreen extends StatefulWidget {
  const PersonalizeScreen({super.key});

  @override
  State<PersonalizeScreen> createState() => _PersonalizeScreenState();
}

class _PersonalizeScreenState extends State<PersonalizeScreen> {
  AikoAccessory? _preview;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) refreshWalletOf(context);
    });
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _buy(ShopItem item) async {
    final store = context.read<WalletStore>();
    final coins = store.wallet?.monedas ?? 0;
    if (coins < item.precio) {
      _toast('Te faltan ${item.precio - coins} monedas. ¡Sigue jugando para ganarlas!');
      return;
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('¿Comprar ${item.nombre}?'),
        content: Text('Cuesta ${item.precio} monedas. Te quedarán ${coins - item.precio}.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Ahora no'),
          ),
          FilledButton(
            style: dialogButtonStyle,
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Comprar'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    final error = await store.buy(item);
    if (!mounted) return;
    setState(() => _busy = false);
    _toast(error ??
        switch (item.tipo) {
          'accesorio' => '¡AiKO estrena ${item.nombre.toLowerCase()}!',
          'potenciador' => '¡Listo! Tus próximos ejercicios dan XP doble.',
          _ => '¡Listo! Tu racha está protegida.',
        });
  }

  Future<void> _wear(AikoAccessory accessory) async {
    setState(() => _busy = true);
    final error = await context.read<WalletStore>().wear(accessory);
    if (!mounted) return;
    setState(() => _busy = false);
    _toast(error ?? '¡AiKO estrena look!');
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<WalletStore>();
    final wallet = store.wallet ?? const Wallet();
    final worn = context.select<AppSettings, AikoAccessory>((s) => s.accessory);
    final preview = _preview ?? worn;
    final accessories = store.shop.where((item) => item.isAccessory).toList();
    final boosts = store.shop.where((item) => !item.isAccessory).toList();
    final previewItem = accessories.where((item) => item.accessory == preview).firstOrNull;

    return Scaffold(
      backgroundColor: AikoColors.lavenderBg,
      appBar: AppBar(
        backgroundColor: AikoColors.lavenderBg,
        title: const Text('Tienda de AiKO', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(child: CoinPill(amount: store.wallet?.monedas)),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: store.refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
          children: [
            if (store.error != null && store.wallet == null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(store.error!,
                    style: const TextStyle(color: AikoColors.error, fontWeight: FontWeight.w700)),
              ),
            _Preview(
              accessory: preview,
              owned: wallet.owns(preview),
              worn: preview == worn,
              price: previewItem?.precio,
              busy: _busy,
              onBuy: previewItem == null ? null : () => _buy(previewItem),
              onWear: () => _wear(preview),
            ),
            const SizedBox(height: 22),
            const _Title('Accesorios', 'Toca uno para probárselo a AiKO'),
            if (store.loading && store.shop.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.74,
              children: [
                _AccessoryTile(
                  accessory: AikoAccessory.base,
                  selected: preview == AikoAccessory.base,
                  status: worn == AikoAccessory.base ? 'Puesto' : 'Gratis',
                  onTap: () => setState(() => _preview = AikoAccessory.base),
                ),
                for (final item in accessories)
                  if (item.accessory case final accessory?)
                    _AccessoryTile(
                      accessory: accessory,
                      selected: preview == accessory,
                      status: worn == accessory
                          ? 'Puesto'
                          : wallet.owns(accessory)
                              ? 'Tuyo'
                              : null,
                      price: item.precio,
                      onTap: () => setState(() => _preview = accessory),
                    ),
              ],
            ),
            const SizedBox(height: 24),
            const _Title('Potenciadores', 'Ayudas para tu progreso'),
            for (final item in boosts)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _BoostCard(
                  item: item,
                  status: item.tipo == 'potenciador'
                      ? (wallet.potenciadorXpRestante > 0
                          ? 'Activo: ${wallet.potenciadorXpRestante} ${wallet.potenciadorXpRestante == 1 ? 'ejercicio' : 'ejercicios'} con XP doble'
                          : 'Sin potenciador activo')
                      : 'Tienes ${wallet.salvadoresRacha} de ${Wallet.maxSavers}',
                  enabled: !_busy &&
                      !(item.tipo == 'salvador' && wallet.salvadoresRacha >= Wallet.maxSavers),
                  onBuy: () => _buy(item),
                ),
              ),
            const SizedBox(height: 8),
            Text(
              'Ganas monedas al aprobar ejercicios: más puntaje, más monedas, y un premio extra al terminar cada isla.',
              style: TextStyle(color: AikoColors.inkSoft, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _Preview extends StatelessWidget {
  const _Preview({
    required this.accessory,
    required this.owned,
    required this.worn,
    required this.price,
    required this.busy,
    required this.onBuy,
    required this.onWear,
  });

  final AikoAccessory accessory;
  final bool owned;
  final bool worn;
  final int? price;
  final bool busy;
  final VoidCallback? onBuy;
  final VoidCallback onWear;

  @override
  Widget build(BuildContext context) {
    final Widget action;
    if (worn) {
      action = const _Chip(icon: Icons.check_circle_rounded, text: 'Lo lleva puesto');
    } else if (owned) {
      action = FilledButton.icon(
        onPressed: busy ? null : onWear,
        icon: const Icon(Icons.checkroom_rounded),
        label: const Text('Ponérselo'),
      );
    } else {
      action = FilledButton(
        onPressed: busy || onBuy == null ? null : onBuy,
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Comprar por '),
              const CoinIcon(size: 20),
              Text(' ${price ?? '—'}'),
            ],
          ),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: AikoColors.dark
              ? const [Color(0xFF2B2240), Color(0xFF2E2430)]
              : const [Color(0xFFEDE4FF), Color(0xFFFFF3DD)],
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 320),
            transitionBuilder: (child, animation) => ScaleTransition(
              scale: CurvedAnimation(parent: animation, curve: Curves.easeOutBack),
              child: child,
            ),
            child: Container(
              key: ValueKey(accessory),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AikoColors.surface, shape: BoxShape.circle),
              child: AikoAvatar(size: 160, accessory: accessory, animate: true),
            ),
          ),
          const SizedBox(height: 12),
          Text(accessory.label,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: Center(child: action)),
        ],
      ),
    );
  }
}

class _AccessoryTile extends StatelessWidget {
  const _AccessoryTile({
    required this.accessory,
    required this.selected,
    required this.onTap,
    this.status,
    this.price,
  });

  final AikoAccessory accessory;
  final bool selected;
  final VoidCallback onTap;

  /// "Puesto", "Tuyo" o "Gratis"; si es null se muestra el precio.
  final String? status;
  final int? price;

  @override
  Widget build(BuildContext context) {
    final locked = status == null;
    return Semantics(
      button: true,
      selected: selected,
      label: '${accessory.label}, ${status ?? '${price ?? ''} monedas'}',
      excludeSemantics: true,
      child: Pressable(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: selected ? AikoColors.lilacSoft : AikoColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? AikoColors.violet : Colors.transparent,
              width: 3,
            ),
          ),
          child: FittedBox(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Opacity(
                  opacity: locked ? 0.75 : 1,
                  child: AikoAvatar(size: 64, accessory: accessory),
                ),
                const SizedBox(height: 4),
                SizedBox(
                  width: 86,
                  child: Text(accessory.label,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800)),
                ),
                const SizedBox(height: 4),
                if (locked)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CoinIcon(size: 16),
                      const SizedBox(width: 4),
                      Text('${price ?? '—'}',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                    ],
                  )
                else
                  Text(status!,
                      style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 12.5,
                          color: status == 'Puesto' ? AikoColors.success : AikoColors.violet)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BoostCard extends StatelessWidget {
  const _BoostCard({
    required this.item,
    required this.status,
    required this.enabled,
    required this.onBuy,
  });

  final ShopItem item;
  final String status;
  final bool enabled;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final xp = item.tipo == 'potenciador';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: xp
                  ? AikoColors.tint(AikoColors.star, const Color(0xFFFFF3C4))
                  : AikoColors.peachSoft,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(xp ? Icons.bolt_rounded : Icons.shield_rounded,
                size: 32, color: xp ? AikoColors.starDeep : const Color(0xFFE07B39)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.nombre,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                const SizedBox(height: 2),
                Text(item.descripcion,
                    style: TextStyle(color: AikoColors.inkSoft, fontSize: 13.5)),
                const SizedBox(height: 4),
                Text(status,
                    style: TextStyle(
                        color: AikoColors.violet, fontWeight: FontWeight.w800, fontSize: 13)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size(72, 48),
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            onPressed: enabled ? onBuy : null,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CoinIcon(size: 18),
                const SizedBox(width: 4),
                Text('${item.precio}'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Title extends StatelessWidget {
  const _Title(this.title, this.subtitle);

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              header: true,
              child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            ),
            Text(subtitle, style: TextStyle(color: AikoColors.inkSoft)),
          ],
        ),
      );
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AikoColors.mintSoft,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AikoColors.success),
            const SizedBox(width: 8),
            Text(text,
                style: const TextStyle(fontWeight: FontWeight.w900, color: AikoColors.success)),
          ],
        ),
      );
}
