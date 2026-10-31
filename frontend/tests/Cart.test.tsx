import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartPage from '../src/pages/customer/CartPage';
import { cartApi, addressesApi, storesApi, ordersApi } from '../src/lib/api';
vi.mock('../src/lib/api', () => ({
  cartApi: { get: vi.fn() }, addressesApi: { list: vi.fn() },
  storesApi: { getById: vi.fn() }, ordersApi: { create: vi.fn() },
}));
it('renders real cart fields, includes VAT and delivery fee, and keeps the key after an uncertain failure', async () => {
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.mocked(cartApi.get).mockResolvedValue({ data: { data: { cart: {
    storeId: 'store', subtotal: 20, items: [{ id: 'item', productId: 'product', productName: 'Test Meal', productPrice: 20, quantity: 1 }],
  } } } } as any);
  vi.mocked(addressesApi.list).mockResolvedValue({ data: { data: { addresses: [{ id: 'address', addressLine: 'Home', isDefault: true }] } } } as any);
  vi.mocked(storesApi.getById).mockResolvedValue({ data: { data: { store: { deliveryFee: 5 } } } } as any);
  vi.mocked(ordersApi.create).mockRejectedValueOnce(new Error('Connection lost after commit')).mockResolvedValueOnce({} as any);
  render(<MemoryRouter><CartPage /></MemoryRouter>);
  expect(await screen.findByText('Test Meal')).toBeInTheDocument();
  expect(screen.getByText('28.00 SAR')).toBeInTheDocument();
  const button = screen.getByRole('button', { name: /Proceed to Checkout/ });
  fireEvent.click(button);
  await waitFor(() => expect(window.alert).toHaveBeenCalled());
  fireEvent.click(button);
  await waitFor(() => expect(ordersApi.create).toHaveBeenCalledTimes(2));
  const calls = vi.mocked(ordersApi.create).mock.calls;
  expect(calls[0][2]).toBeTruthy();
  expect(calls[1][2]).toBe(calls[0][2]);
});
