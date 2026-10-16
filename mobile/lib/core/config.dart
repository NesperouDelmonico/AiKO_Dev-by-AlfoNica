/// URL base de la API. Se puede cambiar al compilar:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/v1
class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://ai-ko-dev-by-alfo-nica.vercel.app/v1',
  );
}
