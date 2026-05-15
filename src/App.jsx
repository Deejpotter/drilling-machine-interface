import React, { useMemo, useState } from 'react';

const HOLE_LIBRARY = [
  { label: 'Through hole', type: 'hole', shape: 'through', diameter: 11, advance: 48 },
  { label: '5mm slot', type: 'hole', shape: 'slot', width: 5, length: 24, advance: 52 },
  { label: 'M8 counterbore', type: 'hole', shape: 'counterbore', diameter: 8, counterbore: 15, advance: 54 },
  { label: 'Offset hole', type: 'hole', shape: 'offset', diameter: 6, advance: 38 },
];

const PRESETS = [
  {
    id: 'fortis',
    name: 'FORTIS standard',
    blurb: 'A reusable block for standard drilling patterns and the common FORTIS export path.',
    blocks: [
      { type: 'start', label: 'Start job', params: {} },
      { type: 'profile', label: 'Standard profile: FORTIS', params: { profile: 'FORTIS_STD' } },
      { type: 'move', label: 'Move to origin', params: { dx: 42, dy: 0 } },
      { type: 'hole', label: 'Through hole 11mm', params: { shape: 'through', diameter: 11, advance: 48 } },
      { type: 'move', label: 'Offset to next point', params: { dx: 28, dy: 10 } },
      { type: 'hole', label: '5mm slot', params: { shape: 'slot', width: 5, length: 24, advance: 50 } },
      { type: 'end', label: 'End / Next', params: {} },
    ],
  },
  {
    id: 'other-holes',
    name: 'Standard other holes',
    blurb: 'For variants like counterbores and offset hole patterns that still follow a common export shape.',
    blocks: [
      { type: 'start', label: 'Start job', params: {} },
      { type: 'profile', label: 'Standard profile: Other holes', params: { profile: 'STANDARD_OTHER' } },
      { type: 'move', label: 'Move to face 1', params: { dx: 36, dy: 0 } },
      { type: 'hole', label: 'M8 counterbore', params: { shape: 'counterbore', diameter: 8, counterbore: 15, advance: 56 } },
      { type: 'move', label: 'Offset for inside corner', params: { dx: 24, dy: -12 } },
      { type: 'hole', label: 'Offset hole', params: { shape: 'offset', diameter: 6, advance: 40 } },
      { type: 'end', label: 'End / Next', params: {} },
    ],
  },
  {
    id: 'custom',
    name: 'Custom drilling',
    blurb: 'A blanker prototype with a reusable sequence for one-off customer patterns.',
    blocks: [
      { type: 'start', label: 'Start job', params: {} },
      { type: 'move', label: 'Move to start point', params: { dx: 30, dy: 0 } },
      { type: 'hole', label: 'Through hole', params: { shape: 'through', diameter: 11, advance: 42 } },
      { type: 'end', label: 'End / Next', params: {} },
    ],
  },
];

const STEP_COLORS = {
  start: '#7cfa91',
  move: '#67d2ff',
  hole: '#ffbf66',
  profile: '#c98cff',
  end: '#ff7a7a',
};

function cloneBlock(block) {
  return {
    ...block,
    id: `${block.type}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`,
  };
}

function buildMarks(blocks) {
  let cursor = { x: 74, y: 90 };
  const marks = [];

  blocks.forEach((block, index) => {
    if (block.type === 'start') marks.push({ kind: 'start', x: cursor.x, y: cursor.y, label: block.label, index });
    if (block.type === 'profile') marks.push({ kind: 'profile', x: cursor.x, y: cursor.y - 20, label: block.label, index });
    if (block.type === 'move') {
      const next = {
        x: cursor.x + Number(block.params.dx ?? 30),
        y: cursor.y + Number(block.params.dy ?? 0),
      };
      marks.push({ kind: 'move', from: { ...cursor }, to: next, label: block.label, index });
      cursor = next;
    }
    if (block.type === 'hole') {
      marks.push({ kind: 'hole', x: cursor.x, y: cursor.y, label: block.label, params: block.params, index });
      cursor = { x: cursor.x + Number(block.params.advance ?? 44), y: cursor.y };
    }
    if (block.type === 'end') marks.push({ kind: 'end', x: cursor.x, y: cursor.y, label: block.label, index });
  });

  return marks;
}

function exportScript(meta, blocks) {
  const lines = [
    `JOB "${meta.jobName}"`,
    `CUSTOMER "${meta.customer}"`,
    `SIDE ${meta.side}`,
    `PROFILE "${meta.profileName}"`,
    `SOURCE "Patch export"`,
    '',
  ];

  for (const block of blocks) {
    if (block.type === 'start') {
      lines.push('START');
    } else if (block.type === 'move') {
      lines.push(`MOVE dx=${block.params.dx ?? 0} dy=${block.params.dy ?? 0}`);
    } else if (block.type === 'hole') {
      const parts = [`HOLE shape=${block.params.shape}`];
      if (block.params.diameter != null) parts.push(`diameter=${block.params.diameter}`);
      if (block.params.width != null) parts.push(`width=${block.params.width}`);
      if (block.params.length != null) parts.push(`length=${block.params.length}`);
      if (block.params.counterbore != null) parts.push(`counterbore=${block.params.counterbore}`);
      lines.push(parts.join(' '));
    } else if (block.type === 'profile') {
      lines.push(`PROFILE_BLOCK ${block.params.profile}`);
    } else if (block.type === 'end') {
      lines.push('END / NEXT');
    }
  }

  lines.push('', `NOTES ${meta.notes || 'None'}`);
  return lines.join('\\n');
}

function exportJSON(meta, blocks) {
  return JSON.stringify(
    {
      app: 'Extrusion Drilling Machine React Prototype',
      version: '0.1',
      job: meta,
      blocks: blocks.map((block, index) => ({
        step: index + 1,
        type: block.type,
        label: block.label,
        params: block.params,
      })),
      integration: {
        target: 'Patch program',
        file_naming: 'Steve + Patch',
        sender: 'Warehouse G-code sender',
        reusable_gcode_blocks: true,
      },
    },
    null,
    2
  );
}

function App() {
  const preset = PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState(preset.id);
  const [jobName, setJobName] = useState('FORTIS custom drill job');
  const [customer, setCustomer] = useState('Customer / warehouse job');
  const [side, setSide] = useState('Side 1');
  const [notes, setNotes] = useState('Friday deadline, Monday testing, and confirm the exact Patch export contract.');
  const [blocks, setBlocks] = useState(() => preset.blocks.map(cloneBlock));

  const activePreset = PRESETS.find((item) => item.id === selectedPresetId) || preset;
  const marks = useMemo(() => buildMarks(blocks), [blocks]);
  const meta = useMemo(() => ({ jobName, customer, side, profileName: activePreset.name, notes }), [jobName, customer, side, activePreset.name, notes]);
  const exportScriptText = useMemo(() => exportScript(meta, blocks), [meta, blocks]);
  const exportJsonText = useMemo(() => exportJSON(meta, blocks), [meta, blocks]);

  function applyPreset(nextPreset) {
    setSelectedPresetId(nextPreset.id);
    setBlocks(nextPreset.blocks.map(cloneBlock));
    setJobName(nextPreset.name === 'Custom drilling' ? 'Custom drilling customer job' : `${nextPreset.name} customer job`);
  }

  function addBlock(block) {
    setBlocks((prev) => [...prev, cloneBlock(block)]);
  }

  function pushMove(dx = 40, dy = 0) {
    addBlock({ type: 'move', label: `Move ${dx}, ${dy}`, params: { dx, dy } });
  }

  function pushEnd() {
    addBlock({ type: 'end', label: 'End / Next', params: {} });
  }

  function pushHole(template) {
    addBlock({ type: 'hole', label: template.label, params: { ...template } });
  }

  async function copyExport() {
    await navigator.clipboard.writeText(exportJsonText);
  }

  function downloadExport() {
    const blob = new Blob([exportJsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobName.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'drilling-job'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function resetPrototype() {
    applyPreset(preset);
  }

  return (
    <div className="shell">
      <div className="hero">
        <div className="hero-card">
          <h1>Extrusion Drilling Machine React Prototype</h1>
          <p>
            A first-pass interface for building drilling patterns, previewing the block sequence, and exporting a shape that
            Patch&apos;s program can turn into G-code for the warehouse team.
          </p>
          <div className="hero-meta">
            <span className="tag">Standard profiles + custom patterns</span>
            <span className="tag">Reusable G-code blocks</span>
            <span className="tag">Export preview for Patch</span>
            <span className="tag">Side selection and help notes</span>
          </div>
        </div>
        <div className="hero-side">
          <div className="callout">
            <strong>What this prototype is proving</strong>
            <ul>
              <li>Can an operator switch between standard and custom patterns quickly?</li>
              <li>Can the export be made predictable enough for Patch&apos;s generator?</li>
              <li>Do we have enough controls for start, move, hole, and end/next steps?</li>
            </ul>
          </div>
          <div className="callout">
            <strong>Current open questions</strong>
            <ul>
              <li>Exact Patch input/output format</li>
              <li>Side 1 / 2 / 3 / 4 behaviour</li>
              <li>File naming rules</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="banner">
        Whiteboard cues captured: standard profiles, custom drilling, reusable blocks of G-code, Start / Move / Hole / End-Next,
        11mm through holes, 5mm slots, counterbores, offset holes, help section, and Monday testing.
      </div>

      <div className="grid">
        <section className="panel">
          <h2>Job setup</h2>
          <div className="stack">
            <div className="field">
              <label>Job name</label>
              <input value={jobName} onChange={(e) => setJobName(e.target.value)} />
            </div>
            <div className="field">
              <label>Customer / reference</label>
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>
            <div className="field">
              <label>Side</label>
              <div className="chip-row">
                {['Side 1', 'Side 2', 'Side 3', 'Side 4'].map((value) => (
                  <button key={value} className={`chip ${side === value ? 'active' : ''}`} onClick={() => setSide(value)}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Preset pattern</label>
              <div className="preset-grid">
                {PRESETS.map((item) => (
                  <button key={item.id} className={`preset-card ${selectedPresetId === item.id ? 'active' : ''}`} onClick={() => applyPreset(item)}>
                    <strong>{item.name}</strong>
                    <small>{item.blurb}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Quick add blocks</label>
              <div className="toolbar">
                <button onClick={() => addBlock({ type: 'start', label: 'Start job', params: {} })}>Start</button>
                <button onClick={() => pushMove(40, 0)}>Move</button>
                {HOLE_LIBRARY.map((item) => (
                  <button key={item.label} onClick={() => pushHole(item)}>{item.label}</button>
                ))}
                <button onClick={pushEnd}>End / Next</button>
              </div>
            </div>
            <div className="field">
              <label>Project notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="toolbar">
              <button onClick={resetPrototype} className="ghost">Reset to standard</button>
              <button onClick={() => setBlocks([])} className="ghost">Clear blocks</button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="preview-wrap">
            <div>
              <h2>Pattern preview</h2>
              <div className="subtle">
                A simple visual mock of the job path. It is intentionally rough - just enough to show the block flow and the idea
                of re-usable drilling steps.
              </div>
            </div>
            <div className="svg-wrap">
              <svg viewBox="0 0 860 460" width="100%" height="460" role="img" aria-label="Pattern preview">
                <defs>
                  <marker id="arrow" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto">
                    <path d="M0,0 L12,6 L0,12 z" fill="#67d2ff" />
                  </marker>
                </defs>
                <rect x="26" y="24" width="808" height="410" rx="20" fill="#0b1118" stroke="#314056" />
                <text x="48" y="56" fill="#9fb0c4" fontSize="14">Board / extrusion face preview</text>
                <text x="682" y="56" fill="#9fb0c4" fontSize="14">{side}</text>

                {marks.map((mark, index) => {
                  if (mark.kind === 'move') {
                    return (
                      <g key={`move-${index}`}>
                        <line
                          x1={mark.from.x + 26}
                          y1={mark.from.y + 24}
                          x2={mark.to.x + 26}
                          y2={mark.to.y + 24}
                          stroke="#67d2ff"
                          strokeWidth="2.5"
                          strokeDasharray="7 7"
                          markerEnd="url(#arrow)"
                        />
                      </g>
                    );
                  }
                  if (mark.kind === 'hole') {
                    const x = mark.x + 26;
                    const y = mark.y + 24;
                    const shape = mark.params.shape;
                    if (shape === 'slot') {
                      return (
                        <g key={`hole-${index}`}>
                          <rect x={x - 18} y={y - 8} width="36" height="16" rx="8" fill="#ffbf66" opacity="0.95" />
                          <circle cx={x - 10} cy={y} r="3.2" fill="#10151d" />
                          <circle cx={x + 10} cy={y} r="3.2" fill="#10151d" />
                          <text x={x + 22} y={y + 4} fill="#d8e6ff" fontSize="12">5mm slot</text>
                        </g>
                      );
                    }
                    if (shape === 'counterbore') {
                      return (
                        <g key={`hole-${index}`}>
                          <circle cx={x} cy={y} r="15" fill="none" stroke="#ffbf66" strokeWidth="3" />
                          <circle cx={x} cy={y} r="6" fill="#ffbf66" opacity="0.8" />
                          <text x={x + 22} y={y + 4} fill="#d8e6ff" fontSize="12">M8 counterbore</text>
                        </g>
                      );
                    }
                    if (shape === 'offset') {
                      return (
                        <g key={`hole-${index}`}>
                          <circle cx={x + 8} cy={y - 6} r="7" fill="#ffbf66" />
                          <circle cx={x + 8} cy={y - 6} r="13" fill="none" stroke="#ffbf66" strokeDasharray="4 4" />
                          <text x={x + 24} y={y - 2} fill="#d8e6ff" fontSize="12">Offset hole</text>
                        </g>
                      );
                    }
                    return (
                      <g key={`hole-${index}`}>
                        <circle cx={x} cy={y} r="11" fill="#67d2ff" opacity="0.95" />
                        <circle cx={x} cy={y} r="4" fill="#0b1118" />
                        <text x={x + 18} y={y + 4} fill="#d8e6ff" fontSize="12">Through 11mm</text>
                      </g>
                    );
                  }
                  if (mark.kind === 'start') {
                    return (
                      <g key={`start-${index}`}>
                        <circle cx={mark.x + 26} cy={mark.y + 24} r="11" fill="#7cfa91" />
                        <text x={mark.x + 42} y={mark.y + 29} fill="#d8ffe1" fontSize="12">{mark.label}</text>
                      </g>
                    );
                  }
                  if (mark.kind === 'profile') {
                    return (
                      <g key={`profile-${index}`}>
                        <rect x={mark.x + 12} y={mark.y + 10} width="170" height="24" rx="12" fill="#c98cff" opacity="0.17" stroke="#c98cff" />
                        <text x={mark.x + 24} y={mark.y + 26} fill="#e7d4ff" fontSize="12">{mark.label}</text>
                      </g>
                    );
                  }
                  if (mark.kind === 'end') {
                    return (
                      <g key={`end-${index}`}>
                        <rect x={mark.x + 18} y={mark.y + 14} width="18" height="18" fill="#ff7a7a" rx="4" />
                        <text x={mark.x + 44} y={mark.y + 28} fill="#ffd7d7" fontSize="12">{mark.label}</text>
                      </g>
                    );
                  }
                  return null;
                })}
              </svg>
            </div>
            <div className="legend">
              <span><i className="dot" style={{ background: STEP_COLORS.start }}></i>Start</span>
              <span><i className="dot" style={{ background: STEP_COLORS.move }}></i>Move</span>
              <span><i className="dot" style={{ background: STEP_COLORS.hole }}></i>Hole</span>
              <span><i className="dot" style={{ background: STEP_COLORS.profile }}></i>Profile</span>
              <span><i className="dot" style={{ background: STEP_COLORS.end }}></i>End / Next</span>
            </div>
            <div>
              <h3>Sequence</h3>
              <div className="sequence">
                {blocks.map((block, index) => (
                  <div className="sequence-item" key={block.id}>
                    <div className="kind" style={{ background: STEP_COLORS[block.type] || '#44526b' }}>{index + 1}</div>
                    <div>
                      <strong>{block.label}</strong>
                      <div className="meta">
                        <code>{block.type}</code>
                        {block.params && Object.keys(block.params).length > 0 ? (
                          <span> - {JSON.stringify(block.params)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="small">{index === 0 ? 'first' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="export-head">
            <div>
              <h2>Export preview</h2>
              <div className="subtle">This is the shape I would hand to Patch&apos;s program, or use as the basis for a parser.</div>
            </div>
            <div className="export-actions">
              <button onClick={copyExport}>Copy JSON</button>
              <button onClick={downloadExport}>Download JSON</button>
            </div>
          </div>

          <div className="stack">
            <div className="field">
              <label>Patch script preview</label>
              <pre>{exportScriptText}</pre>
            </div>
            <div className="field">
              <label>JSON export</label>
              <textarea readOnly value={exportJsonText} />
            </div>
            <div className="note-box">
              <strong>Help / implementation notes</strong>
              <ul className="help-list">
                <li>Keep standard profiles obvious and one click away.</li>
                <li>Let operators drop in start, move, hole, and end steps quickly.</li>
                <li>Confirm the export contract before building the parser for Patch&apos;s program.</li>
                <li>Use the same file naming convention for Steve and Patch so everyone can trace jobs.</li>
              </ul>
            </div>
            <div className="note-box">
              <strong>Captured whiteboard details</strong>
              <div className="details-list" style={{ marginTop: 10 }}>
                <div>Standard profiles - standard drilling patterns for FORTIS etc.</div>
                <div>Possible extra option for standard other holes.</div>
                <div>Reusable blocks of G-code - Patch.</div>
                <div>Friday deadline / Monday testing.</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="foot">
        React prototype only - built locally with Vite so it renders without external Babel/CDN dependencies.
      </div>
    </div>
  );
}

export default App;
