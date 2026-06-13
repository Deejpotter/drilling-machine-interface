# Multiple Patterns Per Slot — Refactor Plan

## Problem
Current data model only supports one pattern per slot with uniform spacing:
```javascript
{ slotId: 1, holeType: 'single-hole', holeCount: 3, fromEnd: 20, spacing: 50 }
// Generates holes at: 20, 70, 120
```

Can't handle irregular spacing like: 20mm, 45mm, 90mm from end.

## Solution
Each slot contains multiple independent patterns:
```javascript
{
  slotId: 1,
  patterns: [
    { holeType: 'single-hole', fromEnd: 20, count: 1 },
    { holeType: 'single-hole', fromEnd: 45, count: 1 },
    { holeType: 'single-hole', fromEnd: 90, count: 1 },
  ]
}
```

## Data Model Changes

### Before
```javascript
slotPatterns: [
  { slotId: 1, holeType: 'single-hole', holeCount: 3, fromEnd: 20, spacing: 50 }
]
```

### After
```javascript
slotPatterns: [
  {
    slotId: 1,
    patterns: [
      { id: 'p1', holeType: 'single-hole', fromEnd: 20, count: 1, spacing: 0 },
      { id: 'p2', holeType: 'single-hole', fromEnd: 45, count: 1, spacing: 0 },
    ]
  }
]
```

## UI Changes

### Slot Row Structure
Each slot row now shows:
- Slot header (S1 @ 20mm)
- **List of patterns** (replaces single pattern fields)
  - Pattern 1: hole type, fromEnd, count, spacing
  - Pattern 2: hole type, fromEnd, count, spacing
  - [+ Add pattern] button
  - [Remove pattern] button (if > 1 pattern)
- [Remove slot] button

### Default Values
- First pattern `fromEnd`: 20mm (for 40-series L-joins)
- Additional patterns: previous pattern's fromEnd + 25mm (sensible default)

## G-code Generation

### Before
One macro call series per slot pattern:
```gcode
; Slot S1, 3 holes @ 20, 70, 120
M98 P4110  ; hole at 20
M98 P4110  ; hole at 70
M98 P4110  ; hole at 120
```

### After
One macro call per hole in each pattern:
```gcode
; Pattern 1: Single hole @ 20
; HARD-40S-4040-END-FAST-A (7mm hole @ 20mm)
M98 P4110

; Pattern 2: Single hole @ 45
; HARD-40S-4040-END-FAST-A (7mm hole @ 45mm)
M98 P4110

; Pattern 3: Single hole @ 90
; HARD-40S-4040-END-FAST-A (7mm hole @ 90mm)
M98 P4110
```

## Visualization

Render all holes from all patterns on the slot line:
- Collect all hole positions from all patterns in the slot
- Draw circles at each position
- Double-hole shows two circles (±4px offset)

## Filename

`<order>-<profile>_<totalPatterns>-<face>-<ddmmyy>.nc`

Example: `180000-40x40_3-F1-130626.nc` (3 patterns total)

## Implementation Steps

1. [ ] Update `createDefaultPattern()` to return pattern array structure
2. [ ] Add unique ID generator for patterns
3. [ ] Update slot pattern state management (add/remove/update patterns)
4. [ ] Update UI rendering for multiple patterns per slot
5. [ ] Update visualization to render all pattern holes
6. [ ] Update job building for G-code generator
7. [ ] Update download button to show pattern count
8. [ ] Update storage/load to handle new structure
9. [ ] Test with irregular spacing scenarios

## Migration

Existing saved patterns need migration:
```javascript
// Old structure → New structure
{ slotId: 1, holeType: 'single-hole', holeCount: 3, fromEnd: 20, spacing: 50 }
// Becomes:
{ slotId: 1, patterns: [
    { id: 'p1', holeType: 'single-hole', fromEnd: 20, count: 1, spacing: 0 },
    { id: 'p2', holeType: 'single-hole', fromEnd: 70, count: 1, spacing: 0 },
    { id: 'p3', holeType: 'single-hole', fromEnd: 120, count: 1, spacing: 0 },
  ]
}
```
