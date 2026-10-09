# Vessel Loss Model

## 1. Purpose

This document defines the canonical taxonomy of liquid losses in the brewing
system, which vessel each loss belongs to, and how those losses propagate
through the process chain from strike water to packaged beer.

It exists to resolve two classes of ambiguity that have crept into the codebase:

1. **Terminology drift** — "dead space", "trub loss", and "equipment loss" have
   been used loosely and interchangeably, when they are physically distinct and
   occur at different points in the process.
2. **Inconsistent application** — losses have been summed into a single scalar
   (`calculateFixedLoss`) and applied at a single point, when in fact they
   occur at three distinct stages: pre-mash, pre-boil, and post-boil.

---

## 2. Vessel Inventory

The system comprises three vessels, each with distinct physical roles:

| Vessel | Role | False bottom? | Trub? | Thermal shrinkage? |
|---|---|---|---|---|
| **Mash tun** | Mashing and lautering | ✅ Yes | ❌ No | ❌ No |
| **Boil kettle** | Wort boiling | ❌ No | ✅ Yes | ✅ Yes |
| **HLT** (Hot Liquor Tank) | Heating strike and sparge water | ❌ No | ❌ No | ❌ No |

The HLT may contain a HERMS coil (heat exchange coil immersed in the liquor).
This is not a loss mechanism, but it imposes a **minimum operating volume**
(see §4.3).

---

## 3. Loss Taxonomy

Every vessel has two categories of unrecoverable liquid loss:

### 3.1 Vessel Dead Space (per-vessel, intrinsic)

Liquid that remains in the vessel after draining, due to its physical geometry.

- **Mash tun dead space** — liquid trapped below the false bottom. This is
  *wort* that has already absorbed sugars and cannot be recovered.
- **Boil kettle dead space** — liquid trapped below the drain port / whirlpool
  pickup. This is *wort* at full gravity.
- **HLT dead space** — liquid trapped below the HLT drain port. This is
  *water*, not wort, and therefore does not affect extract mass balance.

  > **Terminology note:** the word "loss" is retained here only for naming
  > consistency with the mash tun and boil kettle. HLT dead space is not a
  > loss to the batch — it is a loss to the *water budget*, not the *extract
  > budget*. It is subtracted in §4.4 solely to compute deliverable sparge
  > volume, and it never enters either scalar in §5.2. See §3.5.

### 3.2 Transfer Loss (per-vessel, extrinsic)

Liquid retained in hoses, pumps, and fittings during transfer *out of* a
vessel. This is distinct from dead space: dead space is a property of the
vessel's geometry, whereas transfer loss is a property of the plumbing
connected to it.

- **Mash tun transfer loss** — wort left in the mash tun drain hose and pump.
- **Boil kettle transfer loss** — wort left in the kettle drain hose and pump
  during transfer to the fermenter.
- **HLT transfer loss** — water left in the HLT hose and pump.

  > **Terminology note:** as with HLT dead space above, this is a water-budget
  > term, not an extract loss. It is subtracted in §4.4 to compute deliverable
  > sparge volume and never enters the wort mass balance. See §3.5.

### 3.3 Trub Loss (boil kettle only)

Protein, hop matter, and cold-break material that settles in the kettle after
the boil and is deliberately left behind. This is *not* a dead-space loss — it
is a process loss that scales with the recipe (hop load, protein content), not
with the vessel's geometry.

### 3.5 HLT "Losses" Are Water Debt, Not Extract Losses

The HLT is the one vessel whose "losses" do not belong in the same conceptual
category as the mash tun's and boil kettle's. The distinction is worth stating
explicitly, because the shared `_loss_l` naming suffix obscures it:

| | Mash tun / Boil kettle | HLT |
|---|---|---|
| Liquid lost | **Wort** (carries extract) | **Water** (carries no extract) |
| Affects extract balance? | ✅ Yes | ❌ No |
| Affects water budget? | ✅ Yes | ✅ Yes |
| Enters `Loss_preboil` / `Loss_postboil`? | ✅ Yes | ❌ No |
| Used for | Wort mass balance | Sparge volume & salt dosing (§4.4, §4.5) |

So `hlt_dead_space_l` and `hlt_transfer_loss_l` are **water-accounting terms**,
not process losses. They sit alongside `hlt_coil_floor_l` and
`hlt_starting_volume_l` as constraints on how much liquor the HLT can actually
deliver, rather than alongside `trub_loss_l` as a loss of product.

**Terminology: debt, not loss.** A *loss* is liquid that leaves the system. A
*debt* is liquid that remains in the system but can never be delivered to the
mash tun. The HLT's undeliverable volume is a debt: it must be "paid" before
any liquor reaches the mash tun, but it is not lost — it is simply
unreachable. The `_loss_l` suffix is retained on the schema fields for
consistency with the other vessels, but the conceptual category is debt.

The names are kept as-is for consistency with the other vessels and because the
`_loss_l` suffix is a useful shorthand, but the schema groups them with the
other HLT water-accounting fields to make the distinction visible in code.

### 3.4 Thermal Shrinkage (boil kettle only)

Hot wort contracts as it cools from boiling (~100 °C) to pitching temperature
(~20 °C). This is a volumetric contraction of the *entire* wort volume, not a
loss of liquid to a vessel. It is applied as a multiplicative factor, not an
additive loss.

---

## 4. Special Cases

### 4.1 Mash Tun → Kettle Mass Balance

What actually makes it into the boil kettle from the mash tun is:

```
V_kettle_in = V_mash_liquid
            − V_grain_absorption
            − V_mash_dead_space
            − V_mash_transfer_loss
```

Where:

- `V_mash_liquid` is the total liquid volume in the mash tun (strike water +
  sparge water).
- `V_grain_absorption` is liquid retained by the grain bed
  (`grain_absorption_factor_l_per_kg × grain_mass_kg`).
- `V_mash_dead_space` is liquid trapped below the false bottom.
- `V_mash_transfer_loss` is liquid retained in the mash tun's hose and pump.

**Important consequence:** the manifest's `preboil_volume_l` (solver variable
`V1`) is defined as *wort collected in the kettle prior to boil* — i.e. it is
already the result of the above subtraction. The solver must **not** subtract
mash dead space or mash transfer loss from `V1` again. Those losses are
accounted for upstream, when the brewer measures or computes `V1`.

### 4.2 Boil Kettle → Fermenter Mass Balance

What actually makes it into the fermenter from the boil kettle is:

```
V_packaged = (V_postboil × (1 − shrinkage_pct))
           − V_trub_loss
           − V_kettle_dead_space
           − V_kettle_transfer_loss
```

Note the ordering: thermal shrinkage is applied to the *entire* hot volume
first, because contraction affects all the liquid uniformly. The additive
losses (trub, dead space, transfer) are then subtracted from the contracted
volume. Applying shrinkage to the net volume would incorrectly shrink the
losses themselves.

### 4.3 HLT Coil Floor (Not a Loss)

The HLT's `hlt_coil_floor_l` is the **minimum volume of liquor required to
cover the HERMS coil**. It is not a loss — it is an operating constraint.

Its role is to bound the *usable* HLT volume:

```
V_hlt_usable = V_hlt_total − hlt_coil_floor_l
```

This constraint matters for sparge water planning: the brewer cannot draw the
last `hlt_coil_floor_l` of liquor without exposing the coil. It does **not**
appear in any wort mass balance, because HLT liquor is water, not wort.

> **Naming note:** this field was previously called `hlt_min_volume_l`. It was
> renamed to `hlt_coil_floor_l` to make its non-loss nature explicit in the
> schema. Any code or seed data referencing the old name must be updated.

### 4.4 HLT Top-Up and Sparge Water Accounting

#### 4.4.1 The Four Water-System Components

The HLT water system comprises four physical components. Only the fourth is
deliverable to the mash tun; the first three are permanently undeliverable
**debt**:

| # | Component | Field | Deliverable? |
|---|---|---|---|
| 1 | HLT vessel interior below the dip tube | `hlt_dead_space_l` | ❌ Never |
| 2 | Transfer hose(s) internal volume | `hlt_transfer_loss_l` | ❌ Never |
| 3 | Pump(s) internal volume | `hlt_transfer_loss_l` | ❌ Never |
| 4 | HLT vessel interior above the dip tube | — | ✅ Yes |

Components 1–3 are all the same category: liquor that is permanently in the
system but can never reach the mash tun. They are summed into a single
**undeliverable debt**:

```
V_hlt_debt = hlt_dead_space_l + hlt_transfer_loss_l
```

The hose and pump are **always primed**. The transfer hose is disconnected
*while full* and reconnected to the next vessel with closed valves holding the
liquid in place, so it never empties between draws. The hose and pump volumes
are therefore permanent debt, not a per-draw priming cost. (This corrects an
earlier model that treated `hlt_transfer_loss_l` as a recurring loss.)

#### 4.4.2 Top-Up Decision

Strike water is delivered into the mash tun **from the HLT**. Drawing the
strike water lowers the HLT's total volume:

```
V_hlt_after_strike = V_hlt_starting_volume_l − V_strike_drawn
```

Where `V_hlt_starting_volume_l` is the volume of liquor in the HLT at the
start of the brew day. This is a **batch-level parameter**, not an equipment
parameter — the brewer may fill the HLT to different levels on different brew
days. It defaults to `max_hlt_volume_l` (fill to capacity).

After the strike draw, the HLT must satisfy **two** conditions before the
sparge:

1. **The coil must be covered** — `V_hlt_after_strike >= hlt_coil_floor_l`.
2. **There must be enough deliverable liquor to sparge** —
   `V_hlt_after_strike − V_hlt_debt >= V_sparge_demand`.

The top-up target is the larger of the two requirements:

```
V_hlt_required = V_sparge_demand + V_hlt_debt
V_hlt_target   = max(hlt_coil_floor_l, V_hlt_required)
V_hlt_top_up   = max(0, V_hlt_target − V_hlt_after_strike)
```

Note that the top-up target is `max(coil_floor, sparge_demand + debt)`, not
just `coil_floor`. The earlier model topped up only to cover the coil, which
could leave the HLT short of the sparge demand.

#### 4.4.3 Deliverable Sparge Volume

The sparge volume actually deliverable to the mash tun is:

```
V_sparge_deliverable = V_hlt_after_strike + V_hlt_top_up − V_hlt_debt
```

When the top-up is active, this equals `V_sparge_demand` exactly. The coil
floor is *not* subtracted, because the top-up has already ensured the coil is
covered — the floor volume is usable for sparging.

#### 4.4.4 Capacity Gate

If `V_hlt_target > max_hlt_volume_l`, the HLT physically cannot hold enough
liquor to cover the coil and deliver the sparge. This is a hard validation
error (`HLT_TOO_SMALL`), not a silent shortfall.

### 4.5 Salt Adjustment Points

Water chemistry is adjusted at **two distinct points** in a batch-sparge
process, and the two adjustments are computed against different volumes:

1. **Mash tun salts** — dosed into the mash tun *before underletting*, against
   the mash water volume (`V_strike_drawn` plus any mash-in top-up water).
   These salts set the mash pH and the mash ion profile.

2. **HLT sparge salts** — dosed into the HLT, against the volume of liquor
   that will actually be delivered as sparge water. Critically, this volume
   includes the top-up:

   ```
   V_sparge_salted = V_hlt_after_strike + V_hlt_top_up
   ```

   If the top-up is omitted from the salt calculation, the sparge water's ion
   concentrations will be diluted by the top-up factor, and the resulting
   wort will be under-mineralized relative to the target profile.

This is the reason the HLT's losses and coil floor are tracked as separate
fields rather than collapsed into a single "HLT loss" scalar: the top-up
calculation needs the coil floor, the sparge salt calculation needs the
post-top-up volume, and neither can be recovered from a single summed value.

> **Surplus case:** the formula above assumes the HLT is filled to *just* meet
> the sparge demand. When the HLT is over-filled (the default, since
> `hlt_starting_volume_l` is pre-filled from `max_hlt_volume_l`), dosing
> against the full post-top-up volume would mineralize surplus liquor that
> never reaches the grain. The dosing volume must be capped at the sparge
> demand. See `plans/water-chemistry-implementation.md` §2.2 for the
> corrected formula and a worked example.

---

## 5. Storage vs. Application

### 5.1 Storage: Collect Separately

The equipment profile stores each loss as a **separate scalar field**, because
they are physically distinct and may be tuned independently:

| Field | Vessel | Category | Scope |
|---|---|---|---|
| `mash_dead_space_l` | Mash tun | Dead space | Equipment |
| `mash_transfer_loss_l` | Mash tun | Transfer | Equipment |
| `kettle_dead_space_l` | Boil kettle | Dead space | Equipment |
| `kettle_transfer_loss_l` | Boil kettle | Transfer | Equipment |
| `trub_loss_l` | Boil kettle | Process | Equipment |
| `hlt_dead_space_l` | HLT | Debt (vessel) | Equipment |
| `hlt_transfer_loss_l` | HLT | Debt (hose + pump) | Equipment |
| `hlt_coil_floor_l` | HLT | Constraint (not a debt) | Equipment |

The `Scope` column distinguishes **equipment-level** fields (properties of the
hardware, stored in the equipment profile) from **batch-level** fields
(properties of a particular brew day, stored in the manifest).

`hlt_starting_volume_l` is **batch-level** and therefore lives on the batch
solver request, not on the equipment profile. The frontend pre-fills it from
the equipment profile's `max_hlt_volume_l` (fill-to-capacity default), but the
brewer may override it for a given brew day — e.g. under-filling the HLT to
avoid heating unnecessary liquor on a small batch.

### 5.2 Application: Collapse to Scalars

At the point of use, the solver collapses these into **two scalars**, one per
mass-balance stage:

```
Loss_preboil  = mash_dead_space_l + mash_transfer_loss_l
Loss_postboil = trub_loss_l + kettle_dead_space_l + kettle_transfer_loss_l
```

- `Loss_preboil` is applied **upstream** of the solver (it determines what
  `V1` the brewer measures). The solver itself does not consume it.
- `Loss_postboil` is applied **downstream** of the solver, in the chilling
  bridge that computes `V_packaged`.

HLT debt (`hlt_dead_space_l`, `hlt_transfer_loss_l`) does not enter either
scalar, because HLT liquor is water and does not carry extract.

---

## 6. Process Chain (End to End)

```
   [ HLT ]
        │  V_hlt_starting_volume_l
        │  − V_strike_drawn  ──────────────┐
        │  + V_hlt_top_up (if needed)       │
        │  − V_hlt_debt                     │
        │    (= hlt_dead_space_l            │
        │       + hlt_transfer_loss_l)      │
        ▼                                   │
   V_sparge (salted in HLT)                 │
        │                                   │
        │                                   ▼
        │                            [ MASH TUN ]
        │                                   │  + V_strike_drawn
        │                                   │  − grain absorption
        │                                   │  − mash dead space
        │                                   │  − mash transfer loss
        │                                   ▼
        │                            V1 (pre-boil wort in kettle)  ◄── solver input
        │                                   │
        │                                   ▼
        │                            [ BOIL KETTLE ]
        │                                   │  − boil-off (R_boil × t)
        │                                   ▼
        │                            V2 (post-boil hot wort)       ◄── solver output
        │                                   │
        │                                   │  × (1 − shrinkage_pct)
        │                                   │  − trub loss
        │                                   │  − kettle dead space
        │                                   │  − kettle transfer loss
        │                                   ▼
        │                            V_packaged (into fermenter)
        │
        └──► (mash salts dosed into mash tun before underletting;
              sparge salts dosed into HLT against V_sparge_salted)
```

---

## 7. Implications for the Solver

1. **`calculateFixedLoss` must be split.** The current single-scalar function
   conflates pre-boil and post-boil losses. Replace with:
   - `calculatePreBoilLoss(mashDeadSpace, mashTransferLoss)`
   - `calculatePostBoilLoss(trubLoss, kettleDeadSpace, kettleTransferLoss)`

2. **`calculatePackagedVolume` signature is correct** — it already applies
   shrinkage before subtracting additive losses. Its `kettleLoss` argument
   should be documented as "sum of all post-boil additive losses".

3. **Mash dead space must not be subtracted from `V1`.** `V1` is defined as
   post-lauter wort in the kettle. Subtracting mash dead space again would
   double-count it.

4. **HLT debt is water accounting, not an extract loss.** It never enters the
   wort mass balance (`Loss_preboil` / `Loss_postboil`), because HLT liquor is
   water and carries no extract. It *does* enter the water budget:
   `hlt_dead_space_l` and `hlt_transfer_loss_l` are summed into `V_hlt_debt`
   and subtracted in §4.4 to compute deliverable sparge volume, and the
   post-top-up volume drives sparge salt dosing (§4.5). The solver ignores
   them; the water-planning and water-chemistry modules consume them.

5. **HLT top-up is a derived value, not a solver variable.** It is computed
   from `hlt_starting_volume_l`, `V_strike_drawn`, `hlt_coil_floor_l`,
   `V_hlt_debt`, and `V_sparge_demand`, and is displayed read-only. It does
   not participate in the 2-DOF boil solver. It *is* consumed downstream,
   however: it feeds the deliverable sparge volume (§4.4) and the sparge salt
   dosing volume (§4.5), so it must be computed before either of those.

6. **Sparge salt dosing must use the post-top-up volume.** Any water-chemistry
   module must compute sparge salt quantities against
   `V_hlt_after_strike + V_hlt_top_up`, not against the pre-strike HLT volume.
   This is a correctness requirement, not a convenience.

---

## 8. Open Questions

- ~~Should `hlt_min_volume_l` be renamed to `hlt_coil_floor_l`?~~ **Resolved:**
  yes, renamed. The rename touches the backend schema, seed data, and the
  equipment drawer form.
- ~~Should transfer losses be estimated from hose diameter and length, or
  entered directly by the user?~~ **Resolved:** direct entry. Estimation from
  geometry is deferred indefinitely.
- ~~Should `hlt_starting_volume_l` default to `max_hlt_volume_l` (fill to
  capacity), or to a computed "just enough" value derived from the batch's
  total water demand?~~ **Resolved:** the field is batch-level and lives on the
  batch solver request. The frontend pre-fills it from `max_hlt_volume_l`
  (fill-to-capacity default), and the brewer may override it per brew day. A
  computed "just enough" default remains a possible future enhancement.
- Should the HLT top-up be surfaced as an explicit user-facing field, or
  computed silently and shown as a read-only derived value? (Deferred —
  computed and shown read-only, consistent with the solver's other derived
  outputs.)
- ~~Should the water budget be shown in a dedicated wizard step or inline?~~
  **Resolved:** inline "Water Plan" section within the Step 5 results panel.
  A dedicated step would have required renumbering the contiguous step roster
  and would only re-render values Step 5 already holds.
- ~~Should the surplus sparge volume be shown, warned about, or ignored?~~
  **Resolved:** shown as a footnote on the "Sparge Deliverable" row, labeled
  "surplus sparge capacity" to distinguish it from the liquor remaining in the
  HLT after the sparge.
- ~~Should the brewer be able to override `v_strike` or `v_sparge`?~~
  **Resolved:** no. Both are derived extensive outputs; overriding them would
  break the extract balance. The intended levers are the intensive constraints
  (`R_L:G` / `r`) and the batch size, with the HLT budget as the surface for
  water constraints.
- ~~Is `hlt_transfer_loss_l` a recurring per-draw loss or a permanent debt?~~
  **Resolved:** permanent debt. The transfer hose is disconnected *while full*
  and reconnected with closed valves holding the liquid in place, so it never
  empties between draws. `hlt_dead_space_l` and `hlt_transfer_loss_l` are
  therefore the same category (permanently undeliverable) and are summed into
  `V_hlt_debt`.
