-- GPS-derived area_sq_meters can drift from paperwork/reality (survey error,
-- manual boundary draw, encroachment, dolil mistakes). Track both figures
-- separately so users can spot and explain the gap instead of trusting one number.

alter table land_plots
  add column dolil_area numeric,
  add column dolil_area_unit text,
  add column actual_area numeric,
  add column actual_area_unit text;
