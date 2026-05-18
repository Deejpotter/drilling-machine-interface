import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import '@testing-library/jest-dom';

function selectFace() {
  const svg = document.querySelector('.profile-diagram');
  const faces = svg.querySelectorAll('rect[style*="cursor: pointer"]');
  return { svg, faces };
}

describe('Drilling Machine App', () => {
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

  it('defaults to 20×20 profile', () => {
    render(<App />);
    expect(document.getElementById('sel-profile').value).toBe('20-2020');
  });

  it('renders the profile diagram SVG', () => {
    render(<App />);
    expect(document.querySelector('.profile-diagram')).toBeInTheDocument();
  });

  it('shows face info after clicking a face on the diagram', async () => {
    render(<App />);
    const { faces } = selectFace();
    expect(faces.length).toBeGreaterThanOrEqual(4);
    await userEvent.click(faces[0]);
    // face-info div contains the selected label
    expect(document.querySelector('.face-info')).toHaveTextContent(/slot/);
    expect(document.querySelector('.face-info')).toHaveTextContent('Top');
  });

  it('shows hole parameters after face selection', async () => {
    render(<App />);
    const { faces } = selectFace();
    await userEvent.click(faces[0]);
    expect(screen.getByText('Hole type')).toBeInTheDocument();
    expect(document.getElementById('count-input')).toBeInTheDocument();
    expect(document.getElementById('from-input')).toBeInTheDocument();
    expect(document.getElementById('spacing-input')).toBeInTheDocument();
  });

  it('changes profile and resets face selection', async () => {
    render(<App />);
    const { faces } = selectFace();
    await userEvent.click(faces[0]);
    expect(document.querySelector('.face-info')).toBeInTheDocument();

    const select = document.getElementById('sel-profile');
    fireEvent.change(select, { target: { value: '40-4080' } });
    // face-info should be gone since selection resets
    expect(document.querySelector('.face-info')).not.toBeInTheDocument();
  });

  it('download button hidden before face selection', () => {
    render(<App />);
    expect(screen.queryByText(/download json/i)).not.toBeInTheDocument();
  });

  it('download button appears after face selection', async () => {
    render(<App />);
    const { faces } = selectFace();
    await userEvent.click(faces[0]);
    expect(screen.getByText(/download json/i)).toBeInTheDocument();
  });

  it('changes hole count updates preview', async () => {
    render(<App />);
    const { faces } = selectFace();
    await userEvent.click(faces[0]);

    const countInput = document.getElementById('count-input');
    fireEvent.change(countInput, { target: { value: '6' } });
    // Preview label shows count
    expect(screen.getByText(/6 holes/)).toBeInTheDocument();
  });

  it('excludes M8 counterbore from 20-series (6mm slot)', async () => {
    render(<App />);
    const { faces } = selectFace();
    await userEvent.click(faces[0]);

    const holeSelect = document.getElementById('sel-hole');
    const opts = Array.from(holeSelect.options).map(o => o.textContent);
    expect(opts).not.toContain('M8 counterbore');
    expect(opts).toContain('Through hole');
    expect(opts).toContain('5mm slot');
    expect(opts).toContain('Offset hole');
  });

  it('includes M8 counterbore for 40-series (8mm slot)', async () => {
    render(<App />);
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '40-4040' } });
    const { faces } = selectFace();
    await userEvent.click(faces[0]);

    const holeSelect = document.getElementById('sel-hole');
    const opts = Array.from(holeSelect.options).map(o => o.textContent);
    expect(opts).toContain('M8 counterbore');
  });

  it('C-Beam shows open face as disabled', () => {
    render(<App />);
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '20-cbeam' } });
    const svg = document.querySelector('.profile-diagram');
    // The C-Beam has one face with not-allowed cursor
    const notAllowed = svg.querySelectorAll('rect[style*="cursor: not-allowed"]');
    expect(notAllowed.length).toBe(1);
  });

  it('C-Beam open face is not selectable', async () => {
    render(<App />);
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '20-cbeam' } });
    const svg = document.querySelector('.profile-diagram');
    const disabled = svg.querySelector('rect[style*="cursor: not-allowed"]');
    expect(disabled).toBeInTheDocument();

    await userEvent.click(disabled);
    expect(document.querySelector('.face-info')).not.toBeInTheDocument();
  });

  it('renders hole preview with correct distance labels', async () => {
    render(<App />);
    const { faces } = selectFace();
    await userEvent.click(faces[0]);

    // Default: 4 holes, fromEnd=20, spacing=50 → 20mm, 70mm, 120mm, 170mm
    // These appear in the hole-preview bar, use getAllByText since SVG has 20mm too
    expect(screen.getAllByText('20mm').length).toBeGreaterThanOrEqual(2); // SVG dims + preview
    expect(screen.getByText('70mm')).toBeInTheDocument();
    expect(screen.getByText('120mm')).toBeInTheDocument();
    expect(screen.getByText('170mm')).toBeInTheDocument();
  });
});
