import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/l10n.dart';
import 'package:landlord_mobile/core/providers.dart';
import 'package:landlord_mobile/features/common.dart';

void main() {
  late int commits;
  late ProviderContainer container;

  Future<void> pumpRow(WidgetTester tester) async {
    commits = 0;
    container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: Consumer(builder: (context, ref, _) {
            final hidden = ref.watch(hiddenRowsProvider);
            return ListView(children: [
              if (!hidden.contains('row-1'))
                SwipeToDelete(
                  id: 'row-1',
                  onDelete: () async => commits++,
                  child: const ListTile(title: Text('Row one')),
                ),
            ]);
          }),
        ),
      ),
    ));
  }

  Future<void> swipeAway(WidgetTester tester) async {
    await tester.drag(find.text('Row one'), const Offset(-600, 0));
    await tester.pumpAndSettle();
  }

  testWidgets('Undo restores the row without deleting', (tester) async {
    await pumpRow(tester);
    await swipeAway(tester);
    expect(find.text('Row one'), findsNothing);
    expect(find.text('Deleted'), findsOneWidget);

    await tester.tap(find.text('Undo'));
    await tester.pumpAndSettle();
    expect(find.text('Row one'), findsOneWidget);
    expect(commits, 0);
  });

  testWidgets('the delete commits once the snackbar times out', (tester) async {
    await pumpRow(tester);
    await swipeAway(tester);
    expect(commits, 0);

    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(commits, 1);
    expect(find.text('Row one'), findsNothing);
    expect(container.read(hiddenRowsProvider), contains('row-1'));
  });
}
