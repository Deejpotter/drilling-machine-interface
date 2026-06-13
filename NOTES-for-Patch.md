# Questions for Patch

## Double-Hole Macro Behavior (P4111)

**Question:** Does `M98 P4111` drill BOTH holes in one macro call, or do I need to call it twice (once at Y, once at Y+40)?

**Context:**
- Single hole (P4110): drills one 7mm hole at the current Y position
- Double hole (P4111): should drill two 7mm holes, 40mm apart

**Current assumption in code:**
```gcode
; Double hole at 90mm from end
G55 G0 Z60
G55 G0 X0 Y90.0
G10 L20 P3 X0 Y0 Z60
M98 P4111  ; Does this drill BOTH holes (at Y90 and Y130)?
```

**If P4111 drills both holes:**
- One macro call is sufficient
- The macro internally handles the 40mm spacing

**If P4111 drills one hole:**
- Need to call it twice: once at Y90, once at Y130
- Or the macro handles the spacing internally but needs two calls

**Please confirm the expected behavior.**

---

## Other Notes

### SKU Naming Convention
- `HARD-40S-4040-END-FAST-A` — single 7mm hole (end fastener, alan key access)
- `HARD-40S-4080-END-FAST-A` — double 7mm hole, 40mm apart (end fastener)
- `HARD-40S-4040-END-FAST-A` — slotted 7mm hole (adjustable, same product as single)
- `BOLT-M8-CAP` — M8 counterbore (short or long bolt)
- `HARD-40S-CENTRAL-CONNECTOR` — central connector feature
- `HARD-40S-ANCHOR-FAST` — anchor fast feature

### Filename Format
`<order number>-<profile>_<modifier>-<face>-<ddmmyy>.nc`

Examples:
- `180000-40x40_1-F1-130626.nc` (single pattern)
- `180000-40x80_2-F1-130626.nc` (two patterns on same face)

### Default fromEnd for 40-Series
- **20mm from end** — makes outer edge flush with end for L-shaped joins
