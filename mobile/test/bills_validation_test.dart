import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/validation/bills.dart';

Uint8List bytes(List<int> b) => Uint8List.fromList(b);

void main() {
  final png = bytes([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
  final jpg = bytes([255, 216, 255, 224, 0]);
  final webp = Uint8List.fromList(latin1.encode('RIFF\x00\x00\x00\x00WEBPVP8 '));
  final pdf = Uint8List.fromList(latin1.encode('%PDF-1.7\n...\n%%EOF\n'));

  test('accepts matching signatures (lib/validation/bills.ts)', () {
    expect((validateBillFile('bill.png', png) as BillFile).contentType, 'image/png');
    expect((validateBillFile('bill.JPEG', jpg) as BillFile).extension, 'jpg');
    expect((validateBillFile('bill.webp', webp) as BillFile).extension, 'webp');
    expect((validateBillFile('bill.pdf', pdf) as BillFile).contentType, 'application/pdf');
  });

  test('rejects spoofed, empty, oversized and unsafe files', () {
    expect(validateBillFile('bill.png', jpg), BillFileError.fileType);
    expect(validateBillFile('bill.svg', latin1.encode('<svg/>')), BillFileError.fileType);
    expect(validateBillFile('bill.pdf', Uint8List(0)), BillFileError.chooseFile);
    expect(validateBillFile('bill.png', Uint8List(maxBillBytes + 1)), BillFileError.fileTooLarge);
    expect(validateBillFile('a/b.png', png), BillFileError.fileType);
  });

  test('bill form rules', () {
    final ok = {'title': 'Electricity', 'amount': '1250.50', 'dueDate': '2026-11-05'};
    expect(validateBill(ok), isNull);
    expect(validateBill({...ok, 'title': ' '}), 'title is required.');
    expect(validateBill({...ok, 'amount': '0'}), 'Invalid amount.');
    expect(validateBill({...ok, 'amount': '1.005'}), 'Invalid amount.');
    expect(validateBill({...ok, 'dueDate': ''}), 'dueDate is required.');
  });

  test('status matches lib/bills.ts billStatus', () {
    final bill = {'paid_at': null, 'due_date': '2026-10-01'};
    expect(billStatus(bill, [], today: '2026-10-21'), 'overdue');
    expect(billStatus({...bill, 'due_date': '2026-11-01'}, [], today: '2026-10-21'), 'unpaid');
    expect(billStatus(bill, [{'status': 'pending'}], today: '2026-10-21'), 'pending');
    expect(billStatus(bill, [{'status': 'rejected'}], today: '2026-10-21'), 'overdue');
    expect(billStatus({...bill, 'paid_at': '2026-10-02'}, [], today: '2026-10-21'), 'paid');
  });
}
