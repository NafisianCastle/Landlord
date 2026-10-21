// Port of the web app's lib/units.ts — keep in sync with it and with the
// Postgres mirror fn_area_conversions (supabase/migrations/0003).

const sqMetersPerDecimal = 40.4686;

const _decimalPerBigha = 33.0;
const _decimalPerKatha = _decimalPerBigha / 20;
const _decimalPerKani = 40.0; // regional approximation (Sylhet convention)
const _decimalPerGonda = _decimalPerKani / 20;

const _sqMetersPerAcre = 4046.8564224;
const _sqMetersPerSqFt = 0.09290304;

class AreaConversions {
  const AreaConversions(this.sqMeters);
  final double sqMeters;

  double get decimal => sqMeters / sqMetersPerDecimal;
  double get bigha => decimal / _decimalPerBigha;
  double get katha => decimal / _decimalPerKatha;

  /// Regional estimate (Sylhet/CHT), not a national standard.
  double get kani => decimal / _decimalPerKani;

  /// Regional estimate (Sylhet/CHT), not a national standard.
  double get gonda => decimal / _decimalPerGonda;
  double get acre => sqMeters / _sqMetersPerAcre;
  double get sqFt => sqMeters / _sqMetersPerSqFt;
}

/// Unit choices offered by the web forms (PlotMetadataForm / ApartmentMetadataForm).
const plotAreaUnits = ['decimal', 'katha', 'bigha', 'acre', 'sqft', 'sqmeter'];
const apartmentSizeUnits = ['sqft', 'sqmeter', 'katha', 'decimal'];
