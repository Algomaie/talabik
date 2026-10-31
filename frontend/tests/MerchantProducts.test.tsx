import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MerchantProductsPage from '../src/pages/merchant/MerchantProductsPage';
import { storesApi, productsApi, categoriesApi } from '../src/lib/api';
vi.mock('../src/lib/api', () => ({
  storesApi: { myStores: vi.fn().mockResolvedValue({ data: { data: { stores: [{ id: 's', name: 'Test Store' }] } } }) },
  productsApi: { list: vi.fn().mockResolvedValue({ data: { data: [{ id: 'p', name: 'Test Burger', price: 25, quantity: 10, categoryId: 'c' }] } }) },
  categoriesApi: { listByStore: vi.fn().mockResolvedValue({ data: { data: { categories: [{ id: 'c', name: 'Burgers' }] } } }) },
  api: {},
}));
it('renders products using the actual nested categories response contract', async () => {
  vi.mocked(storesApi.myStores).mockResolvedValue({ data: { data: { stores: [{ id: 's', name: 'Test Store' }] } } } as any);
  vi.mocked(productsApi.list).mockResolvedValue({ data: { data: [{ id: 'p', name: 'Test Burger', price: 25, quantity: 10, categoryId: 'c' }] } } as any);
  vi.mocked(categoriesApi.listByStore).mockResolvedValue({ data: { data: { categories: [{ id: 'c', name: 'Burgers' }] } } } as any);
  render(<MerchantProductsPage />);
  expect(await screen.findByText('Test Burger')).toBeInTheDocument();
});
