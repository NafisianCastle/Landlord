import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/property_kind.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/validation/forms.dart';
import '../common.dart';

/// "Shared with" on a plot/apartment (web: PlotCollaborators). Owners invite
/// existing Landlord accounts as viewer or editor and remove them;
/// collaborators see their own role. Tenants (bills only) are managed in the
/// apartment's Bills section.
class SharingSection extends ConsumerWidget {
  const SharingSection({super.key, required this.kind, required this.propertyId});
  final PropertyKind kind;
  final String propertyId;

  Future<void> _invite(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final email = TextEditingController();
    var role = 'editor';
    final result = await showDialog<(String, String)>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(l.inviteCollaborator),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
              controller: email,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(labelText: l.inviteEmail),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: role,
              isExpanded: true,
              decoration: InputDecoration(labelText: l.collaboratorRole),
              items: [
                DropdownMenuItem(value: 'viewer', child: Text(l.roleViewer)),
                DropdownMenuItem(value: 'editor', child: Text(l.roleEditor)),
              ],
              onChanged: (v) => setState(() => role = v ?? 'editor'),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
            FilledButton(
              onPressed: () {
                final value = email.text.trim();
                if (value.length <= 254 && emailPattern.hasMatch(value)) {
                  Navigator.pop(context, (value, role));
                }
              },
              child: Text(l.invite),
            ),
          ],
        ),
      ),
    );
    if (result == null || !context.mounted) return;
    await runOnlineAction(
      context,
      () => ref.read(repositoryProvider).inviteCollaborator(kind, propertyId, result.$1, result.$2),
      success: l.invited,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final role = ref.watch(myRoleProvider((kind, propertyId))).value;
    final collaborators = ref.watch(collaboratorsProvider((kind, propertyId))).value ?? [];
    String roleLabel(Object? r) => r == 'viewer' ? l.role_viewer : l.role_editor;

    if (role != 'owner') {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SectionHeader(l.sharedWith),
        Card(
          child: ListTile(
            leading: const Icon(Icons.people_outline),
            title: Text('${l.sharedByOwner} ${l.sharedAsRole(roleLabel(role))}'),
          ),
        ),
      ]);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.sharedWith,
            trailing: TextButton.icon(
              icon: const Icon(Icons.person_add_alt),
              label: Text(l.inviteCollaborator),
              onPressed: () => _invite(context, ref),
            )),
        Card(
          child: Column(children: [
            if (collaborators.isEmpty) ListTile(title: Text(l.noCollaborators)),
            for (final c in collaborators)
              ListTile(
                leading: const Icon(Icons.person_outline),
                title: Text(c['invited_email'] as String? ?? ''),
                subtitle: Text(roleLabel(c['role'])),
                trailing: TextButton(
                  child: Text(l.remove),
                  onPressed: () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        content: Text(l.removeCollaboratorConfirm(c['invited_email'] as String)),
                        actions: [
                          TextButton(
                              onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
                          FilledButton(
                              onPressed: () => Navigator.pop(context, true), child: Text(l.remove)),
                        ],
                      ),
                    );
                    if (ok == true && context.mounted) {
                      await runOnlineAction(context,
                          () => ref.read(repositoryProvider).removeCollaborator(kind, c));
                    }
                  },
                ),
              ),
          ]),
        ),
      ],
    );
  }
}
