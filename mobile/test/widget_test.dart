import 'package:flutter_test/flutter_test.dart';

import 'package:aiko_mobile/core/api_client.dart';

void main() {
  test('ApiException expone el mensaje', () {
    expect(ApiException(401, 'x').toString(), 'x');
  });
}
