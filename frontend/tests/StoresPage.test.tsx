import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StoresPage from '../src/pages/customer/StoresPage';
import { storesApi } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({ storesApi: { list: vi.fn() } }));
const list = vi.mocked(storesApi.list);
const renderPage = () => render(<MemoryRouter><StoresPage /></MemoryRouter>);
beforeEach(() => vi.resetAllMocks());

describe('Stores REST interaction', () => {
  it('renders loading then API data, and filters through the search field', async () => {
    let resolve!: (value: any) => void;
    list.mockImplementation(() => new Promise(r => { resolve = r; }));
    renderPage();
    expect(screen.getByText('Discovering stores near you...')).toBeInTheDocument();
    resolve({ data: { data: [{ id: 'store-1', name: 'Fresh Bites' }] } });
    expect(await screen.findByText('Fresh Bites')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(1, 100);
    fireEvent.change(screen.getByPlaceholderText(/Search stores/), { target: { value: 'missing' } });
    expect(screen.getByText('No stores found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));
    expect(screen.getByText('Fresh Bites')).toBeInTheDocument();
  });
  it('shows a network failure and recovers with Retry', async () => {
    list.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { data: [] } } as any);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load stores');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No stores found')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
