/**
 * Universal Unit Registry & Conversion Engine
 */
export const UNIT_REGISTRY = {
  mass: {
    base_unit: 'kg',
    units: {
      kg: { label: 'kg', factor: 1.0, precision: 3 },
      g:  { label: 'g',  factor: 0.001, precision: 1 },
      lb: { label: 'lb', factor: 0.45359237, precision: 2 },
      oz: { label: 'oz', factor: 0.028349523, precision: 2 }
    }
  },
  volume: {
    base_unit: 'L',
    units: {
      L:   { label: 'L',   factor: 1.0, precision: 2 },
      ml:  { label: 'mL',  factor: 0.001, precision: 0 },
      gal: { label: 'gal', factor: 3.785411784, precision: 2 },
      qt:  { label: 'qt',  factor: 0.946352946, precision: 2 }
    }
  },
  temperature: {
    base_unit: 'C',
    units: {
      C: { label: '°C', to_base: (v) => v, from_base: (v) => v, precision: 1 },
      F: { label: '°F', to_base: (v) => (v - 32) * (5/9), from_base: (v) => (v * (9/5)) + 32, precision: 1 }
    }
  },
  gravity: {
    base_unit: 'SG',
    units: {
      SG:    { label: 'SG',    to_base: (v) => v, from_base: (v) => v, precision: 3 },
      Plato: {
        label: '°P',
        // Exact numerical inverse of the ASBC cubic below, via Newton-Raphson.
        // Guarantees SG -> Plato -> SG round-trips are lossless.
        to_base: (p) => {
          const sgFromPlato = (plato) =>
            (-1 * 616.868) + (1111.14 * plato) - (630.272 * Math.pow(plato, 2)) + (135.997 * Math.pow(plato, 3));
          // Solve sgFromPlato(sg) = p for sg using Newton-Raphson.
          let sg = 1.0 + (p / 258.6); // initial guess (linearized)
          for (let i = 0; i < 8; i++) {
            const f = sgFromPlato(sg) - p;
            const df = 1111.14 - (2 * 630.272 * sg) + (3 * 135.997 * Math.pow(sg, 2));
            if (Math.abs(df) < 1e-12) break;
            sg -= f / df;
          }
          return sg;
        },
        from_base: (sg) => (-1 * 616.868) + (1111.14 * sg) - (630.272 * Math.pow(sg, 2)) + (135.997 * Math.pow(sg, 3)),
        precision: 1
      }
    }
  },
  percentage: {
    base_unit: 'fraction',
    units: {
      fraction: { label: 'fraction', to_base: (v) => v, from_base: (v) => v, precision: 3 },
      '%':      { label: '%',        to_base: (v) => v / 100, from_base: (v) => v * 100, precision: 1 }
    }
  },
  compound: {
    base_unit: 'L/kg',
    units: {
      'L/kg':   { label: 'L/kg',   to_base: (v) => v, from_base: (v) => v, precision: 2 },
      // Mash thickness is conventionally expressed in quarts per pound in
      // imperial brewing practice, not gallons per pound. 1 qt/lb =
      // 0.946353 L / 0.45359237 kg = 2.08635 L/kg.
      'qt/lb':  { label: 'qt/lb',  to_base: (v) => v * 2.08635, from_base: (v) => v / 2.08635, precision: 2 }
    }
  },
  mash_thickness: {
    // Volume-per-mass ratio (L/kg <-> qt/lb). Numerically identical to the
    // `compound` domain, but registered separately because the Mash Card's
    // mash-thickness field is a distinct user preference from the Step 5
    // intensive value (design record Q8).
    base_unit: 'L/kg',
    units: {
      'L/kg':   { label: 'L/kg',   to_base: (v) => v, from_base: (v) => v, precision: 2 },
      'qt/lb':  { label: 'qt/lb',  to_base: (v) => v * 2.08635, from_base: (v) => v / 2.08635, precision: 2 }
    }
  },
  extract_potential: {
    base_unit: 'L·°/kg',
    units: {
      'L·°/kg':      { label: 'L·°/kg',      to_base: (v) => v, from_base: (v) => v, precision: 2 },
      'gal·°/lb':   { label: 'gal·°/lb',   to_base: (v) => v, from_base: (v) => v, precision: 2 },
      'pts·gal/lb': { label: 'pts·gal/lb', to_base: (v) => v, from_base: (v) => v, precision: 2 }
    }
  },
  total_extract: {
    // Total kettle extract S_kettle = V2 * G2, a volume x gravity-points
    // product. Base unit is L·° (liter-degrees); imperial is gal·pts
    // (gallon-points). 1 gal = 3.785411784 L, so 1 gal·pts = 3.785411784 L·°.
    base_unit: 'L·°',
    units: {
      'L·°':     { label: 'L·°',     to_base: (v) => v, from_base: (v) => v, precision: 1 },
      'gal·pts': { label: 'gal·pts', to_base: (v) => v * 3.785411784, from_base: (v) => v / 3.785411784, precision: 1 }
    }
  },
  color: {
    // Base unit is Lovibond, matching the stored data (malts.json
    // color_lovibond, MaltPrimitive.color_lovibond). The EBC factor is the
    // legacy SRM->EBC factor (1.97) reinterpreted as Lovibond->EBC; it is an
    // approximation, not a definition. A true Lovibond->EBC conversion would
    // be ~1.379 (via SRM = Lovibond * 0.7), but that would shift every
    // displayed EBC value by ~30%, so the legacy factor is retained.
    base_unit: 'Lovibond',
    units: {
      Lovibond: { label: 'Lovibond', to_base: (v) => v, from_base: (v) => v, precision: 1 },
      ECB: { label: 'ECB', to_base: (v) => v / 1.97, from_base: (v) => v * 1.97, precision: 1 }
    }
  },
  grist_potential_unit: {
    base_unit: 'pts·gal/lb',
    units: {
      'pts·gal/lb': { label: 'pts·gal/lb', to_base: (v) => v, from_base: (v) => v, precision: 1 },
      'L·°/kg':     { label: 'L·°/kg',     to_base: (v) => v, from_base: (v) => v, precision: 1 }
    }
  }
};
