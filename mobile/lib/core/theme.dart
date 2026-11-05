import 'package:flutter/material.dart';

/// Colors from brand/BRAND-GUIDE.md.
class Brand {
  static const forest = Color(0xFF164B3F);
  static const paper = Color(0xFFF7F8F2);
  static const lime = Color(0xFFD9F279);
  static const ink = Color(0xFF163D33);
  static const sage = Color(0xFFA3BC9C);
  static const quiet = Color(0xFF54695B);
}

ThemeData buildTheme(Brightness brightness) {
  final light = brightness == Brightness.light;
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.forest,
    brightness: brightness,
  ).copyWith(
    primary: light ? Brand.forest : Brand.lime,
    onPrimary: light ? Colors.white : Brand.ink,
    secondary: light ? Brand.quiet : Brand.sage,
    surface: light ? Brand.paper : const Color(0xFF0F2A23),
    onSurface: light ? Brand.ink : Brand.paper,
  );
  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    scaffoldBackgroundColor: scheme.surface,
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
    cardTheme: const CardThemeData(margin: EdgeInsets.zero),
  );
}
