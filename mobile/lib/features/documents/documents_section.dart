import 'dart:io';
import 'dart:typed_data';

import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:pdfx/pdfx.dart';

import '../../core/crypto/key_vault.dart';
import '../../core/data/property_kind.dart';
import '../../core/data/repository.dart';
import '../../core/l10n.dart';
import '../../core/offline/sync.dart';
import '../../core/providers.dart';
import '../common.dart';

/// Documents for a plot/apartment. Scanning uses the platform document
/// scanner (ML Kit on Android, VisionKit on iOS) with edge detection and
/// perspective correction, producing a PDF directly.
class DocumentsSection extends ConsumerStatefulWidget {
  const DocumentsSection({super.key, required this.kind, required this.propertyId});
  final PropertyKind kind;
  final String propertyId;

  @override
  ConsumerState<DocumentsSection> createState() => _DocumentsSectionState();
}

class _DocumentsSectionState extends ConsumerState<DocumentsSection> {
  bool _busy = false;

  Future<void> _scan() async {
    final paths = await CunningDocumentScanner.getPictures(asPdf: true);
    if (paths == null || paths.isEmpty) return;
    final stamp = DateFormat('yyyy-MM-dd HH.mm').format(DateTime.now());
    await _upload('Scan $stamp.pdf', await File(paths.first).readAsBytes());
  }

  Future<void> _pick() async {
    final file = await FilePicker.pickFile(type: FileType.custom, allowedExtensions: ['pdf']);
    if (file == null) return;
    await _upload(file.name, await file.readAsBytes());
  }

  Future<void> _upload(String name, Uint8List bytes) async {
    setState(() => _busy = true);
    final l = context.l10n;
    try {
      await ref.read(repositoryProvider).uploadDocument(
          widget.kind, widget.propertyId, name, bytes, ref.read(keyVaultProvider));
      if (mounted) showMessage(context, l.uploaded);
    } on DocumentValidationException catch (e) {
      if (mounted) showMessage(context, l.documentError(e.error));
    } catch (e) {
      if (mounted) {
        showMessage(context, isOfflineError(e) ? l.documentsNeedConnection : l.errorMessage('$e'));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _open(DbRow doc) async {
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      final bytes = await ref
          .read(repositoryProvider)
          .downloadDocument(widget.kind, doc, ref.read(keyVaultProvider));
      if (!mounted) return;
      await Navigator.of(context).push(MaterialPageRoute<void>(
        builder: (_) => PdfViewerScreen(title: doc['file_name'] as String, bytes: bytes),
      ));
    } on LockedException {
      if (mounted) showMessage(context, l.documentLocked);
    } catch (e) {
      if (mounted) {
        showMessage(context, isOfflineError(e) ? l.documentsNeedConnection : l.errorMessage('$e'));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(DbRow doc) async {
    if (!await confirmDelete(context)) return;
    try {
      await ref.read(repositoryProvider).deleteDocument(widget.kind, doc);
    } catch (e) {
      if (mounted) showMessage(context, context.l10n.errorMessage('$e'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final docs = ref.watch(documentsProvider((widget.kind, widget.propertyId))).value ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.documents,
            trailing: _busy
                ? const SizedBox.square(dimension: 24, child: CircularProgressIndicator())
                : null),
        Card(
          child: Column(
            children: [
              if (docs.isEmpty) ListTile(title: Text(l.noDocuments)),
              for (final doc in docs)
                ListTile(
                  leading: Icon(doc['is_encrypted'] == true
                      ? Icons.lock_outline
                      : Icons.picture_as_pdf_outlined),
                  title: Text(doc['file_name'] as String? ?? ''),
                  subtitle: Text(_size(doc['file_size_bytes'])),
                  onTap: _busy ? null : () => _open(doc),
                  trailing: IconButton(
                    tooltip: l.delete,
                    icon: const Icon(Icons.delete_outline),
                    onPressed: _busy ? null : () => _delete(doc),
                  ),
                ),
              OverflowBar(
                alignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: _busy ? null : _pick,
                    icon: const Icon(Icons.upload_file),
                    label: Text(l.pickPdf),
                  ),
                  FilledButton.icon(
                    onPressed: _busy ? null : _scan,
                    icon: const Icon(Icons.document_scanner_outlined),
                    label: Text(l.scanDocument),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _size(Object? bytes) =>
      bytes is num ? '${(bytes / 1024 / 1024).toStringAsFixed(1)} MB' : '';
}

class PdfViewerScreen extends StatefulWidget {
  const PdfViewerScreen({super.key, required this.title, required this.bytes});
  final String title;
  final Uint8List bytes;

  @override
  State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
  late final _controller = PdfControllerPinch(document: PdfDocument.openData(widget.bytes));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        body: PdfViewPinch(controller: _controller),
      );
}
