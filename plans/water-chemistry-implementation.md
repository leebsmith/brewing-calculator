# Water Chemistry Implementation

Implementation notes for water chemistry: salt dosing volumes, ion targets, and
the points in the process where adjustments are applied.

This document is the *implementation* companion to the water treatment
algorithm document. Where the algorithm document defines *what* the target ion
profile is, this document defines *against which volume* each adjustment is
computed and *where* in the process it is applied.

See `plans/vessel-loss-model.md` §4.4 (HLT water budget) and §4.5 (salt
adjustment points) for the underlying water accounting.

---

## 1. Salt Adjustment Points

Water chemistry is adjusted at **two distinct points** in a batch-sparge
process, and the two adjustments are computed against different volumes:

1. **Mash tun salts** — dosed into the mash tun *before underletting*, against
   the mash water volume (`V_strike_drawn` plus any mash-in top-up water).
   These salts set the mash pH and the mash ion profile.

2. **HLT sparge salts** — dosed into the HLT, against the volume of liquor
   that will actually be delivered as sparge water. See §2 for the volume
   definition, which is subtler than it first appears.

---

## 2. Sparge Salt Dosing Volume

### 2.1 The Base Definition

The sparge salt dosing volume is the total liquor in the HLT at sparge time,
**including the permanently undeliverable debt**:

```
V_sparge_salted = V_hlt_after_strike + V_hlt_top_up
```

The debt (`V_hlt_debt = hlt_dead_space_l + hlt_transfer_loss_l`) is included
because the HLT is a single homogeneous solution: the liquor trapped below the
drain port and held in the hose/pump is at the same ion concentration as the
liquor that gets delivered. Omitting the debt would under-mineralize the
sparge water by the debt fraction.

Equivalently, in terms of the solver's outputs:

```
V_sparge_salted = V_sparge_deliverable + V_hlt_debt
```

### 2.2 The Surplus Case (HLT Over-Filled)

The base definition above assumes the HLT is filled to *just* meet the sparge
demand. When the HLT is over-filled — which is the **default**, because
`hlt_starting_volume_l` is pre-filled from `max_hlt_volume_l`
(fill-to-capacity) — the HLT holds more deliverable liquor than the sparge
requires:

```
V_sparge_deliverable > V_sparge_demand
```

Dosing salts against the full `V_sparge_salted` in this case would mineralize
the surplus liquor, which never touches the grain. The surplus is then
discarded (or repurposed), and the salts dosed into it are wasted — and worse,
the *delivered* sparge water is still correctly mineralized, so the error is
silent: the brewer over-doses salts without any visible effect on the wort.

**Resolution:** dose sparge salts against the volume that will actually be
delivered, plus the debt:

```
V_sparge_salted = min(V_sparge_deliverable, V_sparge_demand) + V_hlt_debt
```

When the HLT is filled to just meet demand, `min(...) == V_sparge_demand` and
this reduces to the base definition in §2.1. When the HLT is over-filled, it
caps the dosing volume at the demand, so surplus liquor is not mineralized.

### 2.3 Worked Example

A batch with:

| Quantity | Value |
|---|---|
| `V_strike` | 3.56 gal |
| `V_sparge_demand` | 5.16 gal |
| `V_hlt_top_up` | 0 gal |
| `V_sparge_deliverable` | 10.86 gal |
| `V_hlt_debt` | 0.50 gal |

The HLT is over-filled (deliverable 10.86 gal vs. demand 5.16 gal), so the
surplus is 5.70 gal. The salt dosing volume is:

```
V_sparge_salted = min(10.86, 5.16) + 0.50 = 5.66 gal
```

Not 11.36 gal (the full HLT contents), and not 10.86 gal (the full
deliverable). The 5.70 gal surplus is excluded.

---

## 3. Open Questions

- Should the surplus liquor be surfaced to the user as a warning when it
  exceeds some threshold (e.g. "you are mineralizing 5.7 gal of surplus
  sparge water")? Or is the §2.2 cap sufficient?
- Should mash-in top-up water (if any) be included in the mash salt dosing
  volume, or dosed separately?
- How should the two dosing points interact when the brewer uses a single
  blended salt addition rather than separate mash/sparge additions?
