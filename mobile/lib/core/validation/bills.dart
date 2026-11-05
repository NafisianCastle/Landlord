import 'dart:convert';
import 'dart:typed_data';

import 'documents.dart';
import 'forms.dart';

/// Port of the web app's lib/validation/bills.ts. Bill copies and payment
/// proofs are JPEG, PNG, WebP or PDF, up to 10 MiB, and the bytes must match
/// the extension (never active SVG/HTML). Phones don't give us a reliable
/// MIME type, so the type comes from the extension and is then confirmed by
/// the file signature, as the web does with the browser's type.
const maxBillBytes = 10 * 1024 * 1024;
const billFileExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

enum BillFileError { chooseFile, fileTooLarge, fileType }

class BillFile {
  const BillFile(this.extension, this.contentType);
  final String extension;
  final String contentType;
}

/// Returns the storage extension and content type, or the error to show.
Object validateBillFile(String name, Uint8List bytes) {
  if (bytes.isEmpty) return BillFileError.chooseFile;
  if (bytes.length > maxBillBytes) return BillFileError.fileTooLarge;
  if (name.length > 180 || RegExp(r'[\u0000-\u001f\u007f/\\]').hasMatch(name)) {
    return BillFileError.fileType;
  }
  String ascii(int start, int end) =>
      bytes.length >= end ? latin1.decode(bytes.sublist(start, end)) : '';
  final lower = name.toLowerCase();
  if (lower.endsWith('.png') &&
      bytes.length >= 8 &&
      const [137, 80, 78, 71, 13, 10, 26, 10].indexed.every((e) => bytes[e.$1] == e.$2)) {
    return const BillFile('png', 'image/png');
  }
  if (RegExp(r'\.jpe?g$').hasMatch(lower) &&
      bytes.length >= 3 &&
      bytes[0] == 255 &&
      bytes[1] == 216 &&
      bytes[2] == 255) {
    return const BillFile('jpg', 'image/jpeg');
  }
  if (lower.endsWith('.webp') && ascii(0, 4) == 'RIFF' && ascii(8, 12) == 'WEBP') {
    return const BillFile('webp', 'image/webp');
  }
  if (lower.endsWith('.pdf') && validatePdf(name, bytes) == null) {
    return const BillFile('pdf', 'application/pdf');
  }
  return BillFileError.fileType;
}

final _twoDecimals = RegExp(r'^\d+(?:\.\d{1,2})?$');

/// Mirrors validateBill: title, amount (at least 0.01, two decimals at
/// most), due date. The tenant is chosen from a list, so always valid here.
String? validateBill(Map<String, String> values) {
  final error = validateFields(values, const {
    'title': Rule(max: 200, required: true),
    'amount': Rule(kind: RuleKind.number, max: 32, required: true),
    'dueDate': Rule(kind: RuleKind.date, max: 10, required: true),
  });
  if (error != null) return error;
  final amount = values['amount']!.trim();
  if (!_twoDecimals.hasMatch(amount) || num.parse(amount) < 0.01) return 'Invalid amount.';
  return null;
}

/// Same rules as lib/bills.ts billStatus.
String billStatus(Map<String, dynamic> bill, List<Map<String, dynamic>> proofs,
    {String? today}) {
  if (bill['paid_at'] != null) return 'paid';
  if (proofs.any((p) => p['status'] == 'pending')) return 'pending';
  final now = today ?? DateTime.now().toIso8601String().substring(0, 10);
  return (bill['due_date'] as String).compareTo(now) < 0 ? 'overdue' : 'unpaid';
}
