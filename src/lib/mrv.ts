/**
 * BIOTRACE — Illustrative MRV Calculation Module
 *
 * Structure: ACM0003 v9.0 (Consolidated methodology for grid-connected
 * electricity generation from renewable sources / fuel switching in industry)
 * as an illustrative reference framework.
 *
 * IMPORTANT LIMITATIONS
 * ─────────────────────
 * 1. This module produces ILLUSTRATIVE estimates only.
 * 2. It has NOT been validated or approved under any recognised carbon
 *    standard (CDM, Gold Standard, VCS/Verra, etc.).
 * 3. Default factor values are drawn from published sources (IPCC, CDM,
 *    UNFCCC) but their applicability to a specific Nigerian cement plant
 *    project must be confirmed by a qualified methodologist.
 * 4. A real ACM0003 calculation requires plant-specific baseline data,
 *    approved monitoring plans, and third-party verification.
 * 5. Results from this module CANNOT be used to issue carbon credits.
 * 6. Do not present output from this module as a verified or certified
 *    emissions reduction.
 *
 * REFERENCES
 * ──────────
 * - ACM0003 v9.0 (UNFCCC CDM, 2018)
 *   https://cdm.unfccc.int/methodologies/DB/ACM0003
 * - IPCC AR5 WG1 Table 8.A.1 — Global Warming Potentials
 * - IPCC 2006 Guidelines Vol.2 Ch.2 — Stationary Combustion
 *   Table 2.2 (emission factors) and Table 1.2 (net calorific values)
 * - CDM Tool 33 v1 — Default values for common parameters
 * - Nigerian EPA / NESREA emissions data where available
 */

// ─── Documented reference factors ────────────────────────────────────────────

/**
 * Net calorific values (NCV) — GJ per tonne of dry matter.
 * Source: IPCC 2006 Guidelines Vol.2, Table 1.2 (selected values).
 * These are IPCC central estimates. Actual values vary by moisture content,
 * species, and processing. A project must use laboratory-measured values.
 */
export const NCV_GJ_PER_T: Record<string, { value: number; source: string; note: string }> = {
  'Palm kernel shell': {
    value: 16.2,
    source: 'IPCC 2006 Vol.2 Table 1.2 / CDM Tool 33',
    note: 'Dry basis. Moisture reduces effective NCV. Verify with lab analysis.',
  },
  'Rice husk': {
    value: 13.5,
    source: 'IPCC 2006 Vol.2 Table 1.2',
    note: 'Dry basis. High ash content (15–20%) reduces combustion efficiency.',
  },
  'Wood chips (sustainable residue)': {
    value: 15.6,
    source: 'IPCC 2006 Vol.2 Table 1.2 (hardwood/softwood average)',
    note: 'Dry basis. Sustainable residue must be verified under ACM0003 eligibility criteria.',
  },
  'Sawdust briquettes': {
    value: 17.0,
    source: 'IPCC 2006 Vol.2 Table 1.2 (processed wood)',
    note: 'Briquetting increases effective energy density. Verify actual NCV.',
  },
  'Cotton stalk bales': {
    value: 14.2,
    source: 'IPCC 2006 Vol.2 Table 1.2 (agricultural residue)',
    note: 'Dry basis. Variable quality; lab test recommended.',
  },
  'Cocoa husk': {
    value: 12.8,
    source: 'IPCC 2006 Vol.2 Table 1.2 (agricultural residue)',
    note: 'Dry basis. Limited published data — use with caution.',
  },
}

/**
 * Fossil-fuel baseline emission factors — tCO₂e per GJ.
 * Source: IPCC 2006 Guidelines Vol.2 Table 2.2.
 * These are the emission factors for the fossil fuel being displaced.
 * ACM0003 requires identification of the specific baseline fuel.
 */
export const FOSSIL_EF_TCO2E_PER_GJ: Record<string, { value: number; source: string; note: string }> = {
  coal: {
    value: 0.0946,
    source: 'IPCC 2006 Vol.2 Table 2.2 — Bituminous coal',
    note: 'Most common baseline fuel in Nigerian cement kilns.',
  },
  petcoke: {
    value: 0.1027,
    source: 'IPCC 2006 Vol.2 Table 2.2 — Petroleum coke',
    note: 'Higher carbon content than coal; common in cement industry.',
  },
  heavy_fuel_oil: {
    value: 0.0774,
    source: 'IPCC 2006 Vol.2 Table 2.2 — Residual fuel oil',
    note: 'Lower emission factor than coal.',
  },
}

/**
 * CO₂ emission factor for biomass combustion.
 * Under CDM/ACM0003, sustainably sourced biomass is treated as carbon-neutral
 * (biogenic CO₂ not counted). This default assumes eligibility has been
 * confirmed. If biomass eligibility is uncertain, this assumption must be reviewed.
 */
export const BIOMASS_CO2_EF_TCO2E_PER_GJ = 0.0 // carbon-neutral assumption

/**
 * Transport emission factor — tCO₂e per tonne-kilometre.
 * Source: IPCC 2006 Vol.2 Table 3.2.2 — Heavy-duty road transport.
 * Approximate value; actual factor depends on vehicle type and load.
 */
export const TRANSPORT_EF_TCO2E_PER_TKM = 0.000162

// ─── Input and output types ───────────────────────────────────────────────────

export type BaselineFuelKey = keyof typeof FOSSIL_EF_TCO2E_PER_GJ

export interface MrvInputs {
  /** Delivery reference (for traceability) */
  deliveryReference: string

  /** Biomass type — used to look up default NCV */
  biomassType: string

  /**
   * Measured weight in tonnes (dry-basis assumed unless moistureContentPct is provided).
   * Must be the plant-confirmed measured weight, never the declared weight.
   */
  measuredWeightT: number

  /**
   * Moisture content as a percentage (0–100).
   * If provided, effective dry-matter weight = measuredWeightT × (1 − moisture/100).
   * If omitted, measuredWeightT is treated as dry weight (conservative assumption).
   */
  moistureContentPct?: number

  /** Baseline fossil fuel being displaced */
  baselineFuel: BaselineFuelKey

  /**
   * Override NCV (GJ/t dry matter). If omitted, the published default is used.
   * A real project must supply a lab-measured value.
   */
  ncvOverrideGjPerT?: number

  /**
   * Transport distance one-way in km.
   * Used to calculate transport leakage emissions.
   * If omitted, transport emissions are excluded and flagged as missing.
   */
  transportDistanceKm?: number

  /**
   * Combustion efficiency of the kiln for this biomass (0–1).
   * Defaults to 0.85 if not provided (conservative estimate).
   * A real project must use plant-specific measurements.
   */
  combustionEfficiency?: number
}

export type CalculationStatus = 'complete' | 'illustrative' | 'incomplete'

export interface MrvLineItem {
  label: string
  value: number
  unit: string
  source: string
  note?: string
}

export interface MrvResult {
  /** Human-readable status of this calculation */
  status: CalculationStatus

  /** Messages explaining why status is illustrative or incomplete */
  warnings: string[]

  /** Inputs used (with defaults applied) */
  resolvedInputs: {
    deliveryReference: string
    biomassType: string
    measuredWeightT: number
    dryMatterWeightT: number
    moistureContentPct: number | null
    ncvGjPerT: number
    ncvSource: string
    baselineFuel: string
    baselineEfTco2ePerGj: number
    baselineEfSource: string
    combustionEfficiency: number
    transportDistanceKm: number | null
  }

  /** Step-by-step calculation breakdown */
  steps: MrvLineItem[]

  /** Summary totals */
  grossAvoidedEmissionsTco2e: number
  transportLeakageTco2e: number
  netAvoidedEmissionsTco2e: number

  /** Methodology reference */
  methodologyRef: string
  calculatedAt: string
}

// ─── Calculation engine ───────────────────────────────────────────────────────

/**
 * calculateIllustrativeMrv
 *
 * Produces an illustrative estimate of net avoided emissions for a single
 * biomass delivery, following the ACM0003 v9.0 structure.
 *
 * This is a SIMPLIFIED calculation for demonstration purposes.
 * A full ACM0003 calculation also requires:
 *   - Monitoring period totals (not per-delivery)
 *   - Approved baseline study
 *   - Leakage for biomass collection / land-use change
 *   - Uncertainty analysis
 *   - Third-party verification
 */
export function calculateIllustrativeMrv(inputs: MrvInputs): MrvResult {
  const warnings: string[] = []
  const steps: MrvLineItem[] = []
  const now = new Date().toISOString()

  // ── 1. Resolve NCV ──────────────────────────────────────────────────────
  const ncvEntry = NCV_GJ_PER_T[inputs.biomassType]
  let ncvGjPerT: number
  let ncvSource: string

  if (inputs.ncvOverrideGjPerT !== undefined) {
    ncvGjPerT = inputs.ncvOverrideGjPerT
    ncvSource = 'Project-specific measured value (provided by user)'
  } else if (ncvEntry) {
    ncvGjPerT = ncvEntry.value
    ncvSource = ncvEntry.source
    warnings.push(
      `NCV for "${inputs.biomassType}" is the IPCC published default (${ncvGjPerT} GJ/t). ` +
        `A real project must use a laboratory-measured value. ${ncvEntry.note}`,
    )
  } else {
    // Unknown biomass type — cannot proceed
    return {
      status: 'incomplete',
      warnings: [
        `No default NCV is available for biomass type "${inputs.biomassType}". ` +
          `Provide an ncvOverrideGjPerT value to continue.`,
      ],
      resolvedInputs: {
        deliveryReference: inputs.deliveryReference,
        biomassType: inputs.biomassType,
        measuredWeightT: inputs.measuredWeightT,
        dryMatterWeightT: 0,
        moistureContentPct: inputs.moistureContentPct ?? null,
        ncvGjPerT: 0,
        ncvSource: 'Unknown',
        baselineFuel: inputs.baselineFuel,
        baselineEfTco2ePerGj: 0,
        baselineEfSource: 'Unknown',
        combustionEfficiency: 0,
        transportDistanceKm: inputs.transportDistanceKm ?? null,
      },
      steps: [],
      grossAvoidedEmissionsTco2e: 0,
      transportLeakageTco2e: 0,
      netAvoidedEmissionsTco2e: 0,
      methodologyRef: 'ACM0003 v9.0 (illustrative, not certified)',
      calculatedAt: now,
    }
  }

  // ── 2. Adjust for moisture ───────────────────────────────────────────────
  let dryMatterWeightT: number
  const moisturePct = inputs.moistureContentPct ?? null

  if (moisturePct !== null) {
    if (moisturePct < 0 || moisturePct >= 100) {
      warnings.push(`Moisture content ${moisturePct}% is out of range (0–99). Using 0%.`)
      dryMatterWeightT = inputs.measuredWeightT
    } else {
      dryMatterWeightT = inputs.measuredWeightT * (1 - moisturePct / 100)
    }
  } else {
    dryMatterWeightT = inputs.measuredWeightT
    warnings.push(
      'Moisture content not provided. Measured weight is treated as dry matter. ' +
        'This overestimates energy content if the biomass is wet.',
    )
  }

  steps.push({
    label: 'Dry-matter weight',
    value: dryMatterWeightT,
    unit: 't',
    source: moisturePct !== null ? `Measured weight × (1 − ${moisturePct}% moisture)` : 'Measured weight (no moisture adjustment)',
    note: moisturePct === null ? 'Moisture content not provided — treated as 0%.' : undefined,
  })

  // ── 3. Energy content ────────────────────────────────────────────────────
  const energyContentGj = dryMatterWeightT * ncvGjPerT
  steps.push({
    label: 'Biomass energy content',
    value: energyContentGj,
    unit: 'GJ',
    source: `${dryMatterWeightT.toFixed(3)} t dry matter × ${ncvGjPerT} GJ/t NCV`,
    note: `NCV source: ${ncvSource}`,
  })

  // ── 4. Effective energy delivered (combustion efficiency) ────────────────
  const combustionEfficiency = inputs.combustionEfficiency ?? 0.85
  if (inputs.combustionEfficiency === undefined) {
    warnings.push(
      'Combustion efficiency not provided. Using default 0.85 (85%). ' +
        'A real project must use plant-specific measured values.',
    )
  }

  const effectiveEnergyGj = energyContentGj * combustionEfficiency
  steps.push({
    label: 'Effective energy delivered to kiln',
    value: effectiveEnergyGj,
    unit: 'GJ',
    source: `${energyContentGj.toFixed(3)} GJ × ${combustionEfficiency} combustion efficiency`,
    note: inputs.combustionEfficiency === undefined ? 'Default efficiency applied (85%).' : undefined,
  })

  // ── 5. Baseline emissions (fossil fuel displaced) ────────────────────────
  const baselineEntry = FOSSIL_EF_TCO2E_PER_GJ[inputs.baselineFuel]
  const baselineEf = baselineEntry.value
  const baselineEfSource = baselineEntry.source

  const baselineEmissionsTco2e = effectiveEnergyGj * baselineEf
  steps.push({
    label: `Baseline emissions avoided (${inputs.baselineFuel.replace('_', ' ')} displaced)`,
    value: baselineEmissionsTco2e,
    unit: 'tCO₂e',
    source: `${effectiveEnergyGj.toFixed(3)} GJ × ${baselineEf} tCO₂e/GJ`,
    note: `Emission factor source: ${baselineEfSource}. ${baselineEntry.note}`,
  })

  // ── 6. Project emissions (biomass combustion) ────────────────────────────
  // Under ACM0003, sustainably sourced biomass is carbon-neutral (biogenic CO₂
  // not counted). This assumption must be verified for each project.
  const projectEmissionsTco2e = effectiveEnergyGj * BIOMASS_CO2_EF_TCO2E_PER_GJ
  steps.push({
    label: 'Project emissions (biomass combustion)',
    value: projectEmissionsTco2e,
    unit: 'tCO₂e',
    source: `${effectiveEnergyGj.toFixed(3)} GJ × ${BIOMASS_CO2_EF_TCO2E_PER_GJ} tCO₂e/GJ`,
    note:
      'ACM0003 treats sustainably sourced biomass as carbon-neutral (biogenic CO₂ = 0). ' +
      'Biomass eligibility and sustainability must be independently confirmed.',
  })

  // ── 7. Gross avoided emissions ───────────────────────────────────────────
  const grossAvoided = baselineEmissionsTco2e - projectEmissionsTco2e
  steps.push({
    label: 'Gross avoided emissions',
    value: grossAvoided,
    unit: 'tCO₂e',
    source: 'Baseline emissions − project emissions',
  })

  // ── 8. Transport leakage ─────────────────────────────────────────────────
  let transportLeakageTco2e = 0
  if (inputs.transportDistanceKm !== undefined) {
    // Round trip: × 2
    transportLeakageTco2e =
      inputs.measuredWeightT * inputs.transportDistanceKm * 2 * TRANSPORT_EF_TCO2E_PER_TKM
    steps.push({
      label: 'Transport leakage (road, round trip)',
      value: transportLeakageTco2e,
      unit: 'tCO₂e',
      source:
        `${inputs.measuredWeightT} t × ${inputs.transportDistanceKm} km × 2 × ` +
        `${TRANSPORT_EF_TCO2E_PER_TKM} tCO₂e/t·km`,
      note: `Transport EF source: IPCC 2006 Vol.2 Table 3.2.2 (heavy-duty truck). ` +
        `One-way distance assumed ${inputs.transportDistanceKm} km.`,
    })
  } else {
    warnings.push(
      'Transport distance not provided. Transport leakage is excluded from this estimate. ' +
        'This overstates net avoided emissions.',
    )
  }

  // ── 9. Net avoided emissions ─────────────────────────────────────────────
  const netAvoided = grossAvoided - transportLeakageTco2e
  steps.push({
    label: 'Net avoided emissions (illustrative)',
    value: netAvoided,
    unit: 'tCO₂e',
    source: 'Gross avoided − transport leakage',
    note:
      'ILLUSTRATIVE ONLY. Not a verified or certified result. ' +
      'A full ACM0003 calculation requires additional leakage categories, ' +
      'an approved monitoring plan, and third-party verification.',
  })

  // ── Determine overall status ─────────────────────────────────────────────
  const status: CalculationStatus =
    warnings.length === 0
      ? 'complete'
      : inputs.ncvOverrideGjPerT !== undefined &&
          inputs.moistureContentPct !== undefined &&
          inputs.combustionEfficiency !== undefined &&
          inputs.transportDistanceKm !== undefined
        ? 'complete'
        : 'illustrative'

  return {
    status,
    warnings,
    resolvedInputs: {
      deliveryReference: inputs.deliveryReference,
      biomassType: inputs.biomassType,
      measuredWeightT: inputs.measuredWeightT,
      dryMatterWeightT,
      moistureContentPct: moisturePct,
      ncvGjPerT,
      ncvSource,
      baselineFuel: inputs.baselineFuel,
      baselineEfTco2ePerGj: baselineEf,
      baselineEfSource,
      combustionEfficiency,
      transportDistanceKm: inputs.transportDistanceKm ?? null,
    },
    steps,
    grossAvoidedEmissionsTco2e: grossAvoided,
    transportLeakageTco2e,
    netAvoidedEmissionsTco2e: netAvoided,
    methodologyRef: 'ACM0003 v9.0 (illustrative reference, not certified)',
    calculatedAt: now,
  }
}
