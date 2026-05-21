import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import '@testing-library/jest-dom';

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

  it('excludes M8 counterbore from 20-series (6mm slot)', () => {
    render(<App />);
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '20-2020' } });
    const holeSelect = document.getElementById('sel-hole');
    const opts = Array.from(holeSelect.options).map(o => o.textContent);
    expect(opts).not.toContain('M8 counterbore');
    expect(opts).toContain('Through hole');
    expect(opts).toContain('5mm slot');
    expect(opts).toContain('Offset hole');
  });

  it('includes M8 counterbore for 40-series (8mm slot)', () => {
    render(<App />);
    fireEvent.change(document.getElementById('sel-profile'), { target: { value: '40-4040' } });
    const holeSelect = document.getElementById('sel-hole');
    const opts = Array.from(holeSelect.options).map(o => o.textContent);
    expect(opts).toContain('M8 counterbore');
  });

  it('shows G-code preview when valid pattern is set', async () => {
    render(<App />);
    const countInput = document.getElementById('count-input');
    fireEvent.change(countInput, { target: { value: '3' } });
    // G-code preview should appear
    const previews = await screen.findAllByText('Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);
    const summaries = screen.getAllByText(/3 holes/);
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
    const btn = screen.getByText('Download G-code (.NC)');
    expect(btn).toBeDisabled();
  });

  it('download button is enabled for valid pattern', () => {
    render(<App />);
    // Defaults: 20×40, length=1000, count=4, fromEnd=20, spacing=50 -> last hole @ 170, fits
    const btn = screen.getByText('Download G-code (.NC)');
    expect(btn).not.toBeDisabled();
  });

  it('includes job name input', () => {
    render(<App />);
    expect(document.getElementById('job-name')).toBeInTheDocument();
  });

  it('renders G-code in preview for valid pattern', async () => {
    render(<App />);
    fireEvent.change(document.getElementById('count-input'), { target: { value: '2' } });
    // Should contain safe startup block
    const preview = await screen.findByText(/G17 G21/);
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
