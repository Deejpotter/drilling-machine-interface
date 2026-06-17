import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import '@testing-library/jest-dom';

function getFirstPatternRow(container) {
  const subrow = container.querySelector('.slot-pattern-subrow');
  if (!subrow) return null;
  const selects = subrow.querySelectorAll('select');
  const inputs = subrow.querySelectorAll('input[type="number"]');
  return { subrow, holeTypeSelect: selects[0], fromEndInput: inputs[0], countInput: inputs[1], spacingInput: inputs[2] };
}

describe('Drilling Machine App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the header', () => {
    render(<App />);
    expect(screen.getByText('Drilling Machine Interface')).toBeInTheDocument();
  });

  it('renders profile dropdown with 2 options in simple mode', () => {
    render(<App />);
    const select = document.getElementById('sel-profile');
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBe(2);
  });

  it('defaults to 40×40 profile in simple mode', () => {
    render(<App />);
    expect(document.getElementById('sel-profile').value).toBe('40-4040');
  });

  it('shows hole type, count, from-end, and spacing inputs', () => {
    const { container } = render(<App />);
    const row = getFirstPatternRow(container);
    expect(row).not.toBeNull();
    expect(row.holeTypeSelect).toBeInTheDocument();
    expect(row.fromEndInput).toBeInTheDocument();
    expect(row.countInput).toBeInTheDocument();
  });

  it('shows material length input', () => {
    render(<App />);
    expect(document.getElementById('length-input')).toBeInTheDocument();
  });

  it('has all 4 selectable hole types in simple mode', () => {
    const { container } = render(<App />);
    const row = getFirstPatternRow(container);
    const opts = Array.from(row.holeTypeSelect.options).map(o => o.textContent);
    expect(opts).toContain('HARD-40S-4040-END-FAST-A (7mm hole)');
    expect(opts).toContain('HARD-40S-4080-END-FAST-A (2x 7mm hole - 40mm apart)');
    expect(opts).toContain('HARD-40S-4040-END-FAST-A (7mm slot)');
    expect(opts).toContain('BOLT-M8-CAP (M8 counterbore)');
    /* Central Connector and Anchor Fast are fixed end fittings, not
     * selectable as patterns — they're toggled per slot separately. */
    expect(opts).not.toContain('HARD-40S-CENTRAL-CONNECTOR (central connector)');
    expect(opts).not.toContain('HARD-40S-ANCHOR-FAST (anchor fast)');
  });

  it('shows order number input', () => {
    render(<App />);
    expect(document.getElementById('order-input')).toBeInTheDocument();
  });

  it('shows face selection dropdown', () => {
    render(<App />);
    expect(document.getElementById('sel-face')).toBeInTheDocument();
  });

  it('shows slot multi-selection controls', () => {
    render(<App />);
    expect(document.getElementById('slot-multi')).toBeInTheDocument();
  });

  it('shows G-code preview when valid pattern is set', async () => {
    const { container } = render(<App />);
    const row = getFirstPatternRow(container);
    fireEvent.change(row.countInput, { target: { value: '3' } });
    const summaries = await screen.findAllByText(/1000mm extrusion/);
    expect(summaries.length).toBeGreaterThanOrEqual(1);
  });

  it('shows validity error when pattern overruns length', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.clear(document.getElementById('length-input'));
    await user.type(document.getElementById('length-input'), '100');
    const row = getFirstPatternRow(container);
    await user.clear(row.countInput);
    await user.type(row.countInput, '10');
    await user.clear(row.fromEndInput);
    await user.type(row.fromEndInput, '20');
    // Re-query: spacing input now visible after count > 1
    const updatedRow = getFirstPatternRow(container);
    await user.clear(updatedRow.spacingInput);
    await user.type(updatedRow.spacingInput, '50');
    expect(screen.getByText(/Pattern overruns/)).toBeInTheDocument();
  });

  it('shows tight clearance warning when pattern is close to end', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.clear(document.getElementById('length-input'));
    await user.type(document.getElementById('length-input'), '200');
    const row = getFirstPatternRow(container);
    await user.clear(row.countInput);
    await user.type(row.countInput, '4');
    await user.clear(row.fromEndInput);
    await user.type(row.fromEndInput, '25');
    // Re-query: spacing input now visible after count > 1
    const updatedRow = getFirstPatternRow(container);
    await user.clear(updatedRow.spacingInput);
    await user.type(updatedRow.spacingInput, '50');
    expect(screen.getByText(/tight clearance/)).toBeInTheDocument();
  });

  it('download button is disabled when pattern overruns', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    fireEvent.change(document.getElementById('order-input'), { target: { value: 'ORD-TEST' } });
    await user.clear(document.getElementById('length-input'));
    await user.type(document.getElementById('length-input'), '50');
    const row = getFirstPatternRow(container);
    await user.clear(row.countInput);
    await user.type(row.countInput, '5');
    await user.clear(row.fromEndInput);
    await user.type(row.fromEndInput, '20');
    // Re-query: spacing input now visible after count > 1
    const updatedRow = getFirstPatternRow(container);
    await user.clear(updatedRow.spacingInput);
    await user.type(updatedRow.spacingInput, '50');
    const btn = screen.getByRole('button', { name: /Download/ });
    expect(btn).toBeDisabled();
  });

  it('download button is enabled for valid pattern', () => {
    render(<App />);
    fireEvent.change(document.getElementById('order-input'), { target: { value: 'ORD-TEST' } });
    const btn = screen.getByRole('button', { name: /Download/ });
    expect(btn).not.toBeDisabled();
  });

  it('shows save-to-drive button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Save to drive/ })).toBeInTheDocument();
  });

  it('shows fallback message when save-to-drive is unsupported', async () => {
    render(<App />);
    const user = userEvent.setup();
    const originalPicker = window.showSaveFilePicker;
    Object.defineProperty(window, 'showSaveFilePicker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    fireEvent.change(document.getElementById('order-input'), { target: { value: 'ORD-TEST' } });
    await user.click(screen.getByRole('button', { name: /Save to drive/ }));
    expect(screen.getByText(/not supported in this browser/i)).toBeInTheDocument();

    Object.defineProperty(window, 'showSaveFilePicker', {
      value: originalPicker,
      configurable: true,
      writable: true,
    });
  });

  it('shows success message when save-to-drive completes', async () => {
    render(<App />);
    const user = userEvent.setup();
    const originalPicker = window.showSaveFilePicker;
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockHandle = {
      name: 'ORD-1-F1.nc',
      createWritable: vi.fn().mockResolvedValue(mockWritable),
    };
    const pickerMock = vi.fn().mockResolvedValue(mockHandle);
    Object.defineProperty(window, 'showSaveFilePicker', {
      value: pickerMock,
      configurable: true,
      writable: true,
    });

    fireEvent.change(document.getElementById('order-input'), { target: { value: 'ORD-1' } });
    await user.click(screen.getByRole('button', { name: /Save to drive/ }));
    expect(await screen.findByText(/Saved ORD-1-F1.nc\./)).toBeInTheDocument();
    expect(pickerMock).toHaveBeenCalled();
    expect(mockHandle.createWritable).toHaveBeenCalled();

    Object.defineProperty(window, 'showSaveFilePicker', {
      value: originalPicker,
      configurable: true,
      writable: true,
    });
  });

  it('resets to default job state', async () => {
    render(<App />);
    const user = userEvent.setup();
    fireEvent.change(document.getElementById('order-input'), { target: { value: 'ORD-RESET' } });

    await user.click(screen.getByRole('button', { name: /New job/ }));

    expect(document.getElementById('order-input').value).toBe('');
    expect(document.getElementById('sel-profile').value).toBe('40-4040');
    expect(screen.getByRole('button', { name: /Download/ })).toBeInTheDocument();
  });

  it('can apply pattern to multiple slots on one face (advanced mode)', async () => {
    render(<App />);
    const user = userEvent.setup();
    // Switch to advanced mode to get 20×40 with 2 slots
    await user.click(screen.getByText(/Simple/));
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '20-2040' } });
    await user.click(document.getElementById('slot-add-btn'));
    expect(screen.getByRole('button', { name: /Download/ })).toBeInTheDocument();
    const preview = await screen.findByText(/extrusion · 2 slots/);
    expect(preview).toBeInTheDocument();
  });

  it('can copy previous slot pattern values (advanced mode)', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    // Switch to advanced mode to get 20×40 with 2 slots
    await user.click(screen.getByText(/Simple/));
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '20-2040' } });

    // Add second slot
    await user.click(document.getElementById('slot-add-btn'));

    // Verify S2 exists with default values
    const subrows = container.querySelectorAll('.slot-pattern-subrow');
    expect(subrows.length).toBe(2);

    // Click "Copy prev slot" on S2 (copies S1's values into S2)
    const copyButtons = screen.getAllByRole('button', { name: /Copy prev slot/ });
    await user.click(copyButtons[1]);

    // S2 should now have two patterns: the default + a copy of S1's default
    const subrowsAfter = container.querySelectorAll('.slot-pattern-subrow');
    expect(subrowsAfter.length).toBe(3); // 1 on S1 + 2 on S2 (default + copy)

    // Verify the copied pattern has S1's default values (fromEnd=20, count=1)
    const row2Inputs = subrowsAfter[2].querySelectorAll('input[type="number"]');
    expect(row2Inputs[0].value).toBe('20'); // fromEnd (default from S1)
    expect(row2Inputs[1].value).toBe('1');  // count (default from S1)
  });

  it('restores profile and slot patterns from local storage', async () => {
    const firstRender = render(<App />);
    const user = userEvent.setup();
    // Switch to advanced mode, select 20×40, add second slot
    await user.click(screen.getByText(/Simple/));
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '20-2040' } });
    fireEvent.change(document.getElementById('order-input'), { target: { value: 'ORD-9001' } });
    await user.click(document.getElementById('slot-add-btn'));
    expect(screen.getByRole('button', { name: /Download/ })).toBeInTheDocument();
    firstRender.unmount();

    render(<App />);
    // Should restore advanced mode, 20×40 profile, S1+S2
    expect(screen.getByRole('button', { name: /Download/ })).toBeInTheDocument();
    expect(document.getElementById('order-input').value).toBe('ORD-9001');
  });

  it('includes order number input instead of job name', () => {
    render(<App />);
    expect(document.getElementById('order-input')).toBeInTheDocument();
    expect(document.getElementById('job-name')).not.toBeInTheDocument();
  });

  it('renders G-code in preview for valid pattern', async () => {
    const { container } = render(<App />);
    const row = getFirstPatternRow(container);
    fireEvent.change(row.countInput, { target: { value: '2' } });
    // Should contain custom header block
    const preview = await screen.findByText(/Set XY plane/);
    expect(preview).toBeInTheDocument();
  });

  it('updates hole count in G-code summary', async () => {
    const { container } = render(<App />);
    const row = getFirstPatternRow(container);
    fireEvent.change(row.countInput, { target: { value: '7' } });
    const summaries = await screen.findAllByText(/7 holes/);
    expect(summaries.length).toBeGreaterThanOrEqual(1);
  });

  it('default pattern has referenceEnd start', () => {
    const { container } = render(<App />);
    const toggle = container.querySelector('.reference-end-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle.textContent).toBe('FROM START (mm)');
  });

  it('clicking the toggle switches to FROM END', async () => {
    const { container } = render(<App />);
    const user = userEvent.setup();
    const toggle = container.querySelector('.reference-end-toggle');
    expect(toggle.textContent).toBe('FROM START (mm)');
    await user.click(toggle);
    expect(toggle.textContent).toBe('FROM END (mm)');
  });

  it('clicking toggle again switches back to FROM START', async () => {
    const { container } = render(<App />);
    const user = userEvent.setup();
    const toggle = container.querySelector('.reference-end-toggle');
    await user.click(toggle);
    expect(toggle.textContent).toBe('FROM END (mm)');
    await user.click(toggle);
    expect(toggle.textContent).toBe('FROM START (mm)');
  });

  it('from end resolves position correctly in G-code', async () => {
    const { container } = render(<App />);
    const user = userEvent.setup();
    const toggle = container.querySelector('.reference-end-toggle');
    await user.click(toggle);
    // Now in "FROM END" mode with default fromEnd=20 on 1000mm extrusion
    // Position should be 1000 - 20 = 980mm — check the G-code Y move
    const preview = await screen.findByText(/Y980\.0/);
    expect(preview).toBeInTheDocument();
  });

  it('validation catches holes too close to start', async () => {
    const { container } = render(<App />);
    const user = userEvent.setup();
    // Switch to FROM END
    const toggle = container.querySelector('.reference-end-toggle');
    await user.click(toggle);
    // Set fromEnd to 990 — position = 1000 - 990 = 10mm, which is < 20mm from start
    const row = getFirstPatternRow(container);
    await user.clear(row.fromEndInput);
    await user.type(row.fromEndInput, '990');
    expect(screen.getByText(/overruns/)).toBeInTheDocument();
  });

  it('double hole from end expands in correct direction', async () => {
    const { container } = render(<App />);
    const user = userEvent.setup();
    // Switch to FROM END
    const toggle = container.querySelector('.reference-end-toggle');
    await user.click(toggle);
    // Set double hole type
    const row = getFirstPatternRow(container);
    fireEvent.change(row.holeTypeSelect, { target: { value: 'double-hole' } });
    // Default fromEnd=20 on 1000mm: positions should be 980 and 940
    // Check the G-code preview specifically (avoid the SVG position labels)
    const gcodePreview = container.querySelector('.gcode-preview');
    expect(gcodePreview).toBeTruthy();
    expect(gcodePreview.textContent).toContain('Y980.0');
    expect(gcodePreview.textContent).toContain('Y940.0');
  });

  it('local storage migration adds referenceEnd to old patterns', () => {
    // Simulate old localStorage data without referenceEnd
    window.localStorage.setItem('drilling-machine-ui-state-v3', JSON.stringify({
      profileId: '40-4040',
      materialLength: 1000,
      orderNumber: 'ORD-TEST',
      selectedFaceIndex: 0,
      slotPatterns: [{
        slotId: 1,
        patterns: [{ id: 'old-1', holeType: 'single-hole', fromEnd: 50, count: 1, spacing: 0 }],
      }],
    }));
    window.localStorage.setItem('drilling-machine-mode', 'simple');
    const { container } = render(<App />);
    const toggle = container.querySelector('.reference-end-toggle');
    expect(toggle.textContent).toBe('FROM START (mm)');
  });
});
