import 'dart:convert';
import 'dart:typed_data';

/// Port of the web app's lib/validation/documents.ts.
const maxDocumentBytes = 20 * 1024 * 1024;

enum DocumentError { onlyPdf, choosePdf, fileTooLarge, invalidPdfContent }

bool validPdfName(String name) =>
    name.length > 4 &&
    name.length <= 180 &&
    name.trim() == name &&
    !RegExp(r'[\u0000-\u001f\u007f/\\:<>"|?*]').hasMatch(name) &&
    !name.startsWith('.') &&
    name.toLowerCase().endsWith('.pdf');

DocumentError? validatePdf(String name, Uint8List bytes) {
  if (!validPdfName(name)) return DocumentError.onlyPdf;
  if (bytes.isEmpty) return DocumentError.choosePdf;
  if (bytes.length > maxDocumentBytes) return DocumentError.fileTooLarge;
  final header = latin1.decode(bytes.sublist(0, bytes.length < 8 ? bytes.length : 8));
  if (!RegExp(r'^%PDF-(?:1\.[0-7]|2\.0)').hasMatch(header)) {
    return DocumentError.invalidPdfContent;
  }
  final tail = latin1.decode(
      bytes.sublist(bytes.length > 1024 ? bytes.length - 1024 : 0));
  return RegExp(r'%%EOF[\t\n\r\f ]*$').hasMatch(tail)
      ? null
      : DocumentError.invalidPdfContent;
}

/// Scanner/picker file names aren't always valid for the server's checks.
String safePdfName(String raw) {
  var name = raw.split(RegExp(r'[/\\]')).last.trim();
  name = name.replaceAll(RegExp(r'[\u0000-\u001f\u007f:<>"|?*]'), '_');
  while (name.startsWith('.')) {
    name = name.substring(1);
  }
  if (!name.toLowerCase().endsWith('.pdf')) name = '$name.pdf';
  if (name.length > 180) name = '${name.substring(0, 176)}.pdf';
  return name.length > 4 ? name : 'document.pdf';
}
