import React from 'react';

export default function ExtrusionViz({ vizRows, materialLength, faceWidth, vizScale, fits, faceNumber }) {
  if (vizRows.length === 0) return null;

  const svgHeight = Math.max(110, (50 + vizRows.length * 34) * vizScale);
  const bodyHeight = Math.max(70, (22 + vizRows.length * 34) * vizScale);
  const bottomY = Math.max(72, (30 + vizRows.length * 34) * vizScale) + 20;

  return (
    <div className="form-section">
      <label>Visualisation — F{faceNumber}, {vizRows.length} slot{vizRows.length !== 1 ? 's' : ''}</label>
      <svg viewBox={`0 0 340 ${svgHeight}`} className="extrusion-viz">
        {/* Extrusion body — height scaled to face width */}
        <rect x="6" y="4" width="328" height={bodyHeight} rx="4" fill={fits ? '#e2e8f0' : '#fee2e2'} stroke={fits ? '#94a3b8' : '#fca5a5'} strokeWidth="1" />
        {/* Extrusion end markers */}
        <rect x="4" y="0" width="4" height={Math.max(80, bodyHeight + 34)} rx="1" fill={fits ? '#64748b' : '#ef4444'} />
        <rect x="332" y="0" width="4" height={Math.max(80, bodyHeight + 34)} rx="1" fill={fits ? '#64748b' : '#ef4444'} />
        {vizRows.map((row, rowIndex) => {
          const rowCount = vizRows.length;
          const slotPositionRatio = row.position / faceWidth;
          const baseY = 4 + bodyHeight * slotPositionRatio;
          return (
            <g key={row.slotId}>
              <line x1="12" y1={baseY} x2="328" y2={baseY} stroke={row.rowColor} strokeWidth="2.5" strokeDasharray="5 4" opacity="0.8" />
              {/* Slot label placed above the line, high enough to clear
               * deconflicted hole labels (which alternate at ±14px). */}
              <text x="16" y={baseY - 20} fontSize="9" fill="#475569" fontFamily="sans-serif">
                {row.label} @ {row.position}mm
              </text>
              {(() => {
                /* Deconflict labels: alternate above/below when too close */
                const MIN_GAP_PX = 28;
                const positions = row.holePositions.map(hp => hp.pos);
                const xPositions = positions.map(pos => 12 + 316 * (pos / materialLength));
                
                /* First pass: determine vertical offset for each label */
                const offsets = [];
                let lastX = -Infinity;
                let lastOffset = 0; // +1 = below, -1 = above
                for (let i = 0; i < xPositions.length; i++) {
                  const x = xPositions[i];
                  if (x - lastX < MIN_GAP_PX) {
                    lastOffset = lastOffset === 1 ? -1 : 1;
                  } else {
                    lastOffset = 1; // default below
                  }
                  offsets.push(lastOffset);
                  lastX = x;
                  lastOffset = lastOffset;
                }

                return row.holePositions.map((holePos, holeIndex) => {
                  const pos = holePos.pos;
                  const pct = pos / materialLength;
                  const x = 12 + 316 * pct;
                  const overrun = pos > materialLength;
                  const r = Math.max(4, (holePos.holeDiameter || row.holeDiameter || 7) * 0.5);
                  const clampedX = Math.min(x, 332);
                  const labelY = baseY + offsets[holeIndex] * 14;
                  const lineToLabel = offsets[holeIndex] > 0;
                  /* WHY slotLength: slotted holes are elongated (50mm),
                   * not round. Render them as rectangles to show their
                   * actual physical extent along the material length. */
                  const slotLen = holePos.slotLength || 0;
                  const slotWidthPx = slotLen > 0 ? 316 * (slotLen / materialLength) : 0;
                  
                  return (
                    <g key={`${row.slotId}-${holeIndex}`}>
                      {slotLen > 0 ? (
                        <rect
                          x={clampedX}
                          y={baseY - r}
                          width={slotWidthPx}
                          height={r * 2}
                          rx="3"
                          fill={overrun ? '#ef4444' : row.rowColor}
                          stroke="white" strokeWidth="2"
                        />
                      ) : (
                        <circle cx={clampedX} cy={baseY} r={r}
                          fill={overrun ? '#ef4444' : row.rowColor}
                          stroke="white" strokeWidth="2"
                        />
                      )}
                      {/* Leader line from hole to label */}
                      <line
                        x1={clampedX} y1={baseY + (lineToLabel ? r + 1 : -r - 1)}
                        x2={clampedX} y2={labelY + (lineToLabel ? -3 : 3)}
                        stroke="#94a3b8" strokeWidth="0.5"
                      />
                      <text x={clampedX} y={labelY} textAnchor="middle"
                        fontSize="7" fill="#64748b" fontFamily="sans-serif">
                        {pos}
                      </text>
                    </g>
                  );
                });
              })()}
            </g>
          );
        })}
        {/* Material length label — right end */}
        <text x="332" y={bottomY} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">
          {materialLength}
        </text>
        <text x="8" y={bottomY} textAnchor="start" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
          0
        </text>
        {/* Face width dimension label */}
        <text x="345" y={bottomY / 2 + 4} textAnchor="start" fontSize="9" fill="#64748b" fontFamily="sans-serif" transform={`rotate(90, 345, ${bottomY / 2 + 4})`}>
          {faceWidth}mm face
        </text>
      </svg>
      <div className="viz-legend">
        <span className="viz-legend-dot" style={{ background: '#3b82f6' }} />
        <span className="viz-legend-label">Each row is one slot on F{faceNumber}; numbers show distance from end.</span>
      </div>
    </div>
  );
}
