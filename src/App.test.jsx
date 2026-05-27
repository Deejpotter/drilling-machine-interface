import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import '@testing-library/jest-dom';

describe('Drilling Machine App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the header', () => {
    render(<App />);
    expect(screen.getByText('Drilling Machine Interface')).toBeInTheDocument();
  });

  it('renders profile dropdown with all 8 options', () => {
    render(<App />);
    const select = document.getElementById('sel-profile');
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBe(8);
  });

  it('defaults to 20×40 profile', () => {
    render(<App />);
    expect(document.getElementById('sel-profile').value).toBe('20-2040');
  });

  it('shows hole count, spacing, and from-end inputs', () => {
    render(<App />);
    expect(document.getElementById('count-input')).toBeInTheDocument();
    expect(document.getElementById('from-input')).toBeInTheDocument();
    expect(document.getElementById('spacing-input')).toBeInTheDocument();
  });

  it('shows material length input', () => {
    render(<App />);
    expect(document.getElementById('length-input')).toBeInTheDocument();
  });

  it('has all 4 hole types available for 20-series', () => {
    render(<App />);
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '20-2020' } });
    const holeSelect = document.getElementById('sel-hole');
    const opts = Array.from(holeSelect.options).map(o => o.textContent);
    expect(opts).toContain('5mm hole');
    expect(opts).toContain('5mm slot');
    expect(opts).toContain('8mm hole');
    expect(opts).toContain('12mm hole');
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
    render(<App />);
    const countInput = document.getElementById('count-input');
    fireEvent.change(countInput, { target: { value: '3' } });
    // G-code preview should appear with the summary
    const summaries = await screen.findAllByText(/3 holes.*1000mm extrusion/);
    expect(summaries.length).toBeGreaterThanOrEqual(1);
  });

  it('shows validity error when pattern overruns length', () => {
    render(<App />);
    fireEvent.change(document.getElementById('length-input'), { target: { value: '100' } });
    fireEvent.change(document.getElementById('count-input'), { target: { value: '10' } });
    fireEvent.change(document.getElementById('spacing-input'), { target: { value: '50' } });
    expect(screen.getByText(/Pattern overruns/)).toBeInTheDocument();
  });

  it('shows tight clearance warning when pattern is close to end', () => {
    render(<App />);
    fireEvent.change(document.getElementById('length-input'), { target: { value: '200' } });
    fireEvent.change(document.getElementById('count-input'), { target: { value: '4' } });
    fireEvent.change(document.getElementById('spacing-input'), { target: { value: '50' } });
    expect(screen.getByText(/tight clearance/)).toBeInTheDocument();
  });

  it('download button is disabled when pattern overruns', () => {
    render(<App />);
    fireEvent.change(document.getElementById('length-input'), { target: { value: '50' } });
    fireEvent.change(document.getElementById('count-input'), { target: { value: '5' } });
    const btn = screen.getByText(/Download F1 - S1/);
    expect(btn).toBeDisabled();
  });

  it('download button is enabled for valid pattern', () => {
    render(<App />);
    // Defaults: 20×40, length=1000, count=4, fromEnd=20, spacing=50 -> last hole @ 170, fits
    const btn = screen.getByText(/Download F1 - S1/);
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
    await user.click(document.getElementById('slot-add-btn'));
    expect(document.getElementById('count-input-2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /New job/ }));

    expect(document.getElementById('order-input').value).toBe('');
    expect(document.getElementById('sel-profile').value).toBe('20-2040');
    expect(document.getElementById('count-input-2')).not.toBeInTheDocument();
    expect(screen.getByText(/Download F1 - S1/)).toBeInTheDocument();
  });

  it('can apply pattern to multiple slots on one face', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(document.getElementById('slot-add-btn'));
    expect(screen.getByText(/Download F1 - S1, S2/)).toBeInTheDocument();
    const preview = await screen.findByText(/extrusion · 2 slots/);
    expect(preview).toBeInTheDocument();
  });

  it('can copy previous slot pattern values', async () => {
    render(<App />);
    const user = userEvent.setup();
    fireEvent.change(document.getElementById('count-input'), { target: { value: '6' } });
    fireEvent.change(document.getElementById('from-input'), { target: { value: '40' } });
    fireEvent.change(document.getElementById('spacing-input'), { target: { value: '30' } });
    await user.click(document.getElementById('slot-add-btn'));
    const copyButtons = screen.getAllByRole('button', { name: 'Copy prev' });
    await user.click(copyButtons[1]);

    expect(document.getElementById('count-input-2').value).toBe('6');
    expect(document.getElementById('from-input-2').value).toBe('40');
    expect(document.getElementById('spacing-input-2').value).toBe('30');
  });

  it('restores profile and slot patterns from local storage', async () => {
    const firstRender = render(<App />);
    const user = userEvent.setup();
    fireEvent.change(document.getElementById('order-input'), { target: { value: 'ORD-9001' } });
    await user.click(document.getElementById('slot-add-btn'));
    expect(screen.getByText(/Download F1 - S1, S2/)).toBeInTheDocument();
    firstRender.unmount();

    render(<App />);
    expect(screen.getByText(/Download F1 - S1, S2/)).toBeInTheDocument();
    expect(document.getElementById('order-input').value).toBe('ORD-9001');
  });

  it('includes order number input instead of job name', () => {
    render(<App />);
    expect(document.getElementById('order-input')).toBeInTheDocument();
    expect(document.getElementById('job-name')).not.toBeInTheDocument();
  });

  it('renders G-code in preview for valid pattern', async () => {
    render(<App />);
    fireEvent.change(document.getElementById('count-input'), { target: { value: '2' } });
    // Should contain custom header block
    const preview = await screen.findByText(/G17.*Set XY plane/s);
    expect(preview).toBeInTheDocument();
  });

  it('updates hole count in G-code summary', async () => {
    render(<App />);
    const countInput = document.getElementById('count-input');
    fireEvent.change(countInput, { target: { value: '7' } });
    const summaries = await screen.findAllByText(/7 holes/);
    expect(summaries.length).toBeGreaterThanOrEqual(1);
  });
});
