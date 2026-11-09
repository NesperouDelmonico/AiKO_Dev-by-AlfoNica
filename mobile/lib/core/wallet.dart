import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import 'api_client.dart';
import 'app_settings.dart';
import 'session.dart';

/// Artículo de la tienda (GET /tienda).
class ShopItem {
  const ShopItem({
    required this.id,
    required this.nombre,
    required this.descripcion,
    required this.precio,
    required this.tipo,
  });

  final String id;
  final String nombre;
  final String descripcion;
  final int precio;

  /// `accesorio`, `potenciador` o `salvador`.
  final String tipo;

  bool get isAccessory => tipo == 'accesorio';

  /// El accesorio del osito que corresponde a este artículo (si lo es).
  AikoAccessory? get accessory => isAccessory ? AikoAccessory.parse(id) : null;

  factory ShopItem.fromJson(Map<String, dynamic> json) => ShopItem(
        id: json['id'] as String? ?? '',
        nombre: json['nombre'] as String? ?? '',
        descripcion: json['descripcion'] as String? ?? '',
        precio: (json['precio'] as num?)?.toInt() ?? 0,
        tipo: json['tipo'] as String? ?? '',
      );
}

/// Monedero del paciente (GET /pacientes/:id/monedero).
class Wallet {
  const Wallet({
    this.monedas = 0,
    this.accesorio = AikoAccessory.base,
    this.accesorios = const {AikoAccessory.base},
    this.potenciadorXpRestante = 0,
    this.salvadoresRacha = 0,
  });

  final int monedas;
  final AikoAccessory accesorio;
  final Set<AikoAccessory> accesorios;

  /// Ejercicios aprobados que aún darán XP doble.
  final int potenciadorXpRestante;
  final int salvadoresRacha;

  static const maxSavers = 3;

  bool owns(AikoAccessory accessory) =>
      accessory == AikoAccessory.base || accesorios.contains(accessory);

  factory Wallet.fromJson(Map<String, dynamic> json) => Wallet(
        monedas: (json['monedas'] as num?)?.toInt() ?? 0,
        accesorio: AikoAccessory.parse(json['accesorio'] as String?),
        accesorios: {
          AikoAccessory.base,
          for (final name in (json['accesorios'] as List? ?? const []).whereType<String>())
            AikoAccessory.parse(name),
        },
        potenciadorXpRestante: (json['potenciador_xp_restante'] as num?)?.toInt() ?? 0,
        salvadoresRacha: (json['salvadores_racha'] as num?)?.toInt() ?? 0,
      );
}

/// Estado de la tienda: monedas, catálogo y compras. El servidor manda; el
/// accesorio puesto también se guarda en [AppSettings] para dibujar el osito
/// sin esperar la red.
class WalletStore extends ChangeNotifier {
  WalletStore(this._session, this._settings) {
    _owner = _session.pacienteId;
    _session.addListener(_onSession);
  }

  final Session _session;
  final AppSettings _settings;
  String? _owner;

  /// Al cerrar sesión o cambiar de cuenta se olvida el monedero anterior.
  void _onSession() {
    final id = _session.pacienteId;
    if (id == _owner) return;
    _owner = id;
    wallet = null;
    error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _session.removeListener(_onSession);
    super.dispose();
  }

  Wallet? wallet;
  List<ShopItem> shop = const [];
  bool loading = false;
  String? error;

  ApiClient get _api => _session.api;
  String? get _base =>
      _session.pacienteId == null ? null : '/pacientes/${_session.pacienteId}';

  Future<void> refresh() async {
    final base = _base;
    if (base == null) return;
    loading = true;
    error = null;
    notifyListeners();
    try {
      final results = await Future.wait<dynamic>([
        _api.get('$base/monedero'),
        _api.get('/tienda'),
      ]);
      _apply(Map<String, dynamic>.from(results[0] as Map));
      shop = [
        for (final item in (results[1] as List? ?? const []).whereType<Map>())
          ShopItem.fromJson(Map<String, dynamic>.from(item)),
      ];
    } on ApiException catch (e) {
      error = e.message;
    } catch (_) {
      error = 'No pudimos cargar la tienda. Revisa tu conexión.';
    }
    loading = false;
    notifyListeners();
  }

  /// Compra un artículo. Devuelve un mensaje de error o null si salió bien.
  Future<String?> buy(ShopItem item) async {
    final base = _base;
    if (base == null) return 'Tu cuenta no tiene un perfil de paciente.';
    try {
      final data = await _api.post('$base/compras', {'articulo_id': item.id});
      _apply(Map<String, dynamic>.from(data as Map));
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'No pudimos completar la compra. Revisa tu conexión.';
    }
  }

  /// Le pone al osito un accesorio comprado.
  Future<String?> wear(AikoAccessory accessory) async {
    final base = _base;
    if (base == null) return 'Tu cuenta no tiene un perfil de paciente.';
    final previous = _settings.accessory;
    await _settings.setAccessory(accessory); // se ve al instante
    try {
      final data = await _api.put('$base/accesorio', {'accesorio': accessory.name});
      _apply(Map<String, dynamic>.from(data as Map));
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      await _settings.setAccessory(previous);
      return e.message;
    } catch (_) {
      await _settings.setAccessory(previous);
      return 'No pudimos guardar el cambio. Revisa tu conexión.';
    }
  }

  void _apply(Map<String, dynamic> json) {
    wallet = Wallet.fromJson(json);
    if (_settings.accessory != wallet!.accesorio) {
      unawaited(_settings.setAccessory(wallet!.accesorio));
    }
  }
}

/// Pide al servidor el monedero (si la app tiene la tienda disponible).
void refreshWalletOf(BuildContext context) {
  try {
    unawaited(context.read<WalletStore>().refresh());
  } on ProviderNotFoundException {
    // Pantallas sueltas (pruebas) sin tienda.
  }
}

/// Monedas del paciente para mostrarlas (null si aún no se cargan o la
/// pantalla no tiene tienda, como en las pruebas).
int? watchCoins(BuildContext context) {
  try {
    return context.select<WalletStore, int?>((store) => store.wallet?.monedas);
  } on ProviderNotFoundException {
    return null;
  }
}
