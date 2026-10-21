/// Port of the web app's lib/validation/forms.ts so the app rejects the same
/// input the server actions (and migration 0034's CHECK constraints) would.
library;

enum RuleKind { number, date, email, uuid, phone }

class Rule {
  const Rule({this.max = 255, this.required = false, this.kind, this.choices});
  final int max;
  final bool required;
  final RuleKind? kind;
  final List<String>? choices;
}

const maxMoney = 1000000000000;
final uuidPattern = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    caseSensitive: false);
final emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _decimal = RegExp(r'^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$');
final _control = RegExp('[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]');
final _phone = RegExp(r'^[+\d\s().-]{3,32}$');

bool validDate(String value) {
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) return false;
  if (value.compareTo('1900-01-01') < 0) return false;
  final parsed = DateTime.tryParse('${value}T00:00:00Z');
  return parsed != null && parsed.toIso8601String().substring(0, 10) == value;
}

/// Returns an error message for the first invalid field, or null.
String? validateFields(Map<String, String?> values, Map<String, Rule> rules) {
  for (final MapEntry(key: field, value: rule) in rules.entries) {
    final raw = values[field] ?? '';
    final value = raw.trim();
    if (raw.length > rule.max || _control.hasMatch(raw)) {
      return '$field is too long or contains invalid characters.';
    }
    if (value.isEmpty) {
      if (rule.required) return '$field is required.';
      continue;
    }
    if (rule.choices != null && !rule.choices!.contains(value)) {
      return 'Invalid $field.';
    }
    final ok = switch (rule.kind) {
      RuleKind.number => _decimal.hasMatch(value) &&
          (double.tryParse(value) ?? -1) >= 0 &&
          double.parse(value) <= maxMoney,
      RuleKind.date => validDate(value),
      RuleKind.email => emailPattern.hasMatch(value),
      RuleKind.uuid => uuidPattern.hasMatch(value),
      RuleKind.phone => _phone.hasMatch(value),
      null => true,
    };
    if (!ok) return 'Invalid $field.';
  }
  return null;
}

const money = Rule(kind: RuleKind.number, max: 32);
const _date = Rule(kind: RuleKind.date, max: 10);
const _areaUnits = [
  'decimal', 'bigha', 'katha', 'kani', 'gonda', 'acre', 'sqft', 'sqmeter', //
  'sqm', 'sq_meters', 'sq_ft', 'sq_km', 'sq_mile',
];

const propertyRules = <String, Rule>{
  'name': Rule(max: 200, required: true),
  'upazila': Rule(max: 100),
  'district': Rule(max: 100),
  'division': Rule(max: 100),
  'village': Rule(max: 200),
  'mutationNumber': Rule(max: 100),
  'buildingName': Rule(max: 200),
  'unitNumber': Rule(max: 100),
  'floor': Rule(max: 50),
  'notes': Rule(max: 10000),
  'purchasePrice': money,
  'currentEstimatedValue': money,
  'purchaseDate': _date,
  'dolilArea': money,
  'actualArea': money,
  'size': money,
  'dolilAreaUnit': Rule(choices: _areaUnits),
  'actualAreaUnit': Rule(choices: _areaUnits),
  'sizeUnit': Rule(choices: _areaUnits),
};

const leaseRules = <String, Rule>{
  'tenantName': Rule(max: 200),
  'tenantPhone': Rule(kind: RuleKind.phone, max: 32),
  'tenantEmail': Rule(kind: RuleKind.email, max: 254),
  'rentAmount': money,
  'frequency': Rule(choices: ['monthly', 'quarterly', 'yearly']),
  'startDate': _date,
  'endDate': _date,
  'notes': Rule(max: 10000),
};

const expenseCategories = ['tax', 'insurance', 'utility', 'repair', 'management_fee', 'other'];
const maintenanceStatuses = ['open', 'in_progress', 'resolved'];

const expenseRules = <String, Rule>{
  'category': Rule(choices: expenseCategories),
  'amount': money,
  'expenseDate': _date,
  'notes': Rule(max: 10000),
};

// The web rules also carry vendorId; vendors aren't in the app yet.
const maintenanceRules = <String, Rule>{
  'title': Rule(max: 200),
  'description': Rule(max: 10000),
  'cost': money,
  'reportedDate': _date,
};

String? validateLease(Map<String, String?> values) {
  final error = validateFields(values, leaseRules);
  if (error != null) return error;
  final start = values['startDate'] ?? '';
  final end = values['endDate'] ?? '';
  return start.isNotEmpty && end.isNotEmpty && end.compareTo(start) < 0
      ? 'Lease end date must be on or after its start date.'
      : null;
}
