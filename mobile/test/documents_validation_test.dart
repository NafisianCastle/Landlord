import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/validation/documents.dart';

Uint8List pdf(String body) => Uint8List.fromList(latin1.encode(body));

void main() {
  test('accepts a well-formed PDF', () {
    expect(validatePdf('deed.pdf', pdf('%PDF-1.7\n...\n%%EOF\n')), isNull);
  });

  test('rejects spoofed or bad files', () {
    expect(validatePdf('deed.txt', pdf('%PDF-1.7 %%EOF')), DocumentError.onlyPdf);
    expect(validatePdf('deed.pdf', Uint8List(0)), DocumentError.choosePdf);
    expect(validatePdf('deed.pdf', pdf('hello %%EOF')),
        DocumentError.invalidPdfContent);
    expect(validatePdf('deed.pdf', pdf('%PDF-1.7 no trailer')),
        DocumentError.invalidPdfContent);
  });

  test('safePdfName produces names the server accepts', () {
    expect(validPdfName(safePdfName('/tmp/scan:1')), isTrue);
    expect(safePdfName('.hidden.PDF'), 'hidden.PDF');
    expect(validPdfName(safePdfName('${'a' * 300}.pdf')), isTrue);
  });
}
