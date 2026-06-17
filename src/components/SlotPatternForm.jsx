import React from 'react';
import { createDefaultPattern } from '../hooks/useJobState';

export default function SlotPatternForm({
  profile, face, faceNumber, materialLength, orderNumber, repetitions,
  slotPatternsSorted, slotMap, remainingSlots, slotToAdd, setSlotToAdd,
  filteredHoleTypes, availableHolesForFace, slotFitChecks,
  setOrderNumber, setMaterialLength, setRepetitions,
  updatePattern, addSlotPattern, removeSlotPattern,
  addPatternToSlotHandler, removePatternFromSlotHandler, copyPreviousPattern,
  handleProfileChange, handleFaceChange,
  filteredProfiles, selectedFaceIndex,
}) {
  return (
    <div className="form">
      {/* Top row: Order, Profile, Face */}
      <div className="form-row-group">
        <div className="form-row">
          <label htmlFor="order-input">Order Number</label>
          <input id="order-input" type="text" className="select"
            placeholder="e.g. ORD-12345"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="sel-profile">Profile</label>
          <select id="sel-profile" className="select"
            value={profile.id}
            onChange={handleProfileChange}
          >
            {filteredProfiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.series}-series
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="sel-face">Face</label>
          <select id="sel-face" className="select"
            value={selectedFaceIndex}
            onChange={handleFaceChange}
          >
            {profile.faces.map((f, idx) => (
              <option key={f.id} value={idx}>
                F{idx + 1} ({f.slots.length} slot{f.slots.length !== 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Repetitions */}
      <div className="form-row-group repetitions-row">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={repetitions > 1}
            onChange={e => setRepetitions(e.target.checked ? 2 : 1)}
          />
          Repetitions
        </label>
        {repetitions > 1 && (
          <input
            type="number"
            className="select repetitions-input"
            min={2}
            max={100}
            value={repetitions}
            onChange={e => setRepetitions(Number(e.target.value))}
            onBlur={() => setRepetitions(prev => Math.max(2, Number(prev) || 2))}
          />
        )}
      </div>

      {/* Slot pattern rows */}
      <div className="form-section">
        <label>Slot Patterns on F{faceNumber}</label>
        <div className="slot-controls">
          <select
            id="slot-add-select"
            className="select"
            disabled={remainingSlots.length === 0}
            value={slotToAdd}
            onChange={e => setSlotToAdd(e.target.value)}
          >
            {remainingSlots.length === 0 ? (
              <option value="">All slots added</option>
            ) : (
              remainingSlots.map(slot => (
                <option key={slot.id} value={slot.id}>
                  Add S{slot.id} @ {slot.position}mm ({slot.width}mm)
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            id="slot-add-btn"
            className="slot-mini-btn"
            disabled={remainingSlots.length === 0}
            onClick={() => {
              const nextId = Number(slotToAdd || remainingSlots[0]?.id);
              if (nextId) addSlotPattern(nextId);
            }}
          >
            Add slot
          </button>
        </div>
        <div id="slot-multi" className="slot-checklist">
          {slotPatternsSorted.map((slot, slotIndex) => {
            const slotInfo = slotMap.get(slot.slotId);
            const availableHoles = availableHolesForFace.filter(h => h.minSlot <= (slotInfo?.width || 0));
            const slotClearance = slotFitChecks.find(check => check.slotId === slot.slotId);
            
            return (
              <div key={slot.slotId} className="slot-pattern-row">
                <div className="slot-pattern-header">
                  <span className="slot-pattern-title">S{slot.slotId} @ {slotInfo?.position}mm ({slotInfo?.width}mm)</span>
                  <div className="slot-pattern-actions">
                    <button
                      type="button"
                      className="slot-mini-btn"
                      onClick={() => copyPreviousPattern(slot.slotId)}
                      disabled={slotIndex === 0}
                    >
                      Copy prev slot
                    </button>
                    <button
                      type="button"
                      className="slot-mini-btn"
                      onClick={() => removeSlotPattern(slot.slotId)}
                      disabled={slotPatternsSorted.length === 1}
                    >
                      Remove slot
                    </button>
                  </div>
                </div>
                {/* Patterns within this slot */}
                <div className="slot-patterns-list">
                  {slot.patterns.map((pattern, patternIndex) => {
                    const prevPattern = patternIndex > 0 ? slot.patterns[patternIndex - 1] : null;
                    const patternMeta = filteredHoleTypes.find(h => h.id === pattern.holeType);
                    const isFixedFitting = !!patternMeta?.isFixedFitting;
                    return (
                      <div key={pattern.id} className="slot-pattern-subrow">
                        <div className="pattern-index">#{patternIndex + 1}</div>
                        <div className="slot-pattern-fields">
                          <div className="form-row">
                            <label>Hole type</label>
                            <select
                              className="select"
                              value={pattern.holeType}
                              onChange={e => updatePattern(slot.slotId, pattern.id, { holeType: e.target.value })}
                            >
                              {availableHoles.map(h => (
                                <option key={h.id} value={h.id}>{h.label}</option>
                              ))}
                            </select>
                          </div>
                          {/* WHY conditional: Central Connector (16mm) and Anchor
                           * Fast (18mm) are fixed-position fittings — fromEnd,
                           * count, and spacing don't apply. We still expose the
                           * referenceEnd toggle so the operator can pick which end
                           * of the beam the fitting goes on. */}
                          {isFixedFitting ? (
                            <div className="form-row">
                              <label
                                className="reference-end-toggle"
                                onClick={() => updatePattern(slot.slotId, pattern.id, {
                                  referenceEnd: pattern.referenceEnd === 'end' ? 'start' : 'end',
                                })}
                                title="Click to swap which end of the beam the fitting goes on"
                              >
                                {pattern.referenceEnd === 'end'
                                  ? `FIXED AT ${patternMeta.fixedOffsetMm}mm FROM END`
                                  : `FIXED AT ${patternMeta.fixedOffsetMm}mm FROM START`}
                              </label>
                            </div>
                          ) : (
                            <>
                              <div className="form-row">
                                {/* WHY clickable label: a toggle that doubles as
                                 * the field label keeps the form compact. The label
                                 * text communicates which end is active — no need
                                 * for a separate state indicator. Operators click to
                                 * flip between measuring from the 0mm end or the
                                 * far end of the extrusion. */}
                                <label
                                  className="reference-end-toggle"
                                  onClick={() => updatePattern(slot.slotId, pattern.id, {
                                    referenceEnd: pattern.referenceEnd === 'end' ? 'start' : 'end',
                                  })}
                                  title="Click to measure from the other end"
                                >
                                  {pattern.referenceEnd === 'end' ? 'FROM END (mm)' : 'FROM START (mm)'}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={pattern.fromEnd}
                                  onChange={e => updatePattern(slot.slotId, pattern.id, { fromEnd: Number(e.target.value) })}
                                  onBlur={e => updatePattern(slot.slotId, pattern.id, { fromEnd: Math.max(0, Number(pattern.fromEnd) || 0) })}
                                />
                              </div>
                              <div className="form-row">
                                <label>Count</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={pattern.count}
                                  onChange={e => updatePattern(slot.slotId, pattern.id, { count: Number(e.target.value) })}
                                  onBlur={e => updatePattern(slot.slotId, pattern.id, { count: Math.max(1, Number(pattern.count) || 1) })}
                                />
                              </div>
                              {pattern.count > 1 && (
                                <div className="form-row">
                                  <label>Spacing (mm)</label>
                                  <input
                                    type="number"
                                    /* Milled slots are 20mm long; Patch requires
                                     * at least 25mm between consecutive slots. */
                                    min={pattern.holeType === 'slotted-hole' ? 25 : 1}
                                    value={pattern.spacing}
                                    onChange={e => updatePattern(slot.slotId, pattern.id, { spacing: Number(e.target.value) })}
                                    onBlur={e => {
                                      const min = pattern.holeType === 'slotted-hole' ? 25 : 1;
                                      updatePattern(slot.slotId, pattern.id, { spacing: Math.max(min, Number(pattern.spacing) || min) });
                                    }}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="pattern-actions">
                          {patternIndex === slot.patterns.length - 1 && (
                            <button
                              type="button"
                              className="slot-mini-btn"
                              onClick={() => addPatternToSlotHandler(slot.slotId, prevPattern || pattern)}
                            >
                              + Add pattern
                            </button>
                          )}
                          {slot.patterns.length > 1 && (
                            <button
                              type="button"
                              className="slot-mini-btn danger"
                              onClick={() => removePatternFromSlotHandler(slot.slotId, pattern.id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {slotClearance && slotClearance.clearanceEnd < 0 && (
                  <div className="slot-row-warning">
                    S{slot.slotId} overruns by {Math.abs(slotClearance.clearanceEnd).toFixed(0)}mm
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Material length */}
      <div className="form-section">
        <label htmlFor="length-input">Material length (mm)</label>
        <input id="length-input" type="number" min={10} max={6000}
          value={materialLength}
          onChange={e => setMaterialLength(Number(e.target.value))}
          onBlur={e => setMaterialLength(prev => Math.max(10, Number(prev) || 10))}
        />
      </div>
    </div>
  );
}
