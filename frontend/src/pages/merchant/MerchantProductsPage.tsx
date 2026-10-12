import { useEffect, useState } from 'react';
import { storesApi, productsApi, categoriesApi } from '../../lib/api';
import { Package, Plus, Edit2, Trash2, Tag, Image as ImageIcon, X } from 'lucide-react';
import '../customer/CustomerPages.css';

export default function MerchantProductsPage() {
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', category_id: '', image_url: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const storesRes = await storesApi.myStores();
      if (storesRes.data.data.stores?.length > 0) {
        const myStore = storesRes.data.data.stores[0];
        setStore(myStore);
        
        // Load products and categories concurrently
        const [prodRes, catRes] = await Promise.all([
          productsApi.list({ storeId: myStore.id }),
          categoriesApi.listByStore(myStore.id)
        ]);
        
        setProducts(prodRes.data.data.products || []);
        setCategories(catRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    
    try {
      setFormLoading(true);
      const payload: any = {
        storeId: store.id,
        categoryId: formData.category_id || undefined,
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
      };
      
      if (formData.image_url) payload.imageUrl = formData.image_url;
      
      await productsApi.create(payload);
      setIsModalOpen(false);
      setFormData({ name: '', description: '', price: '', category_id: '', image_url: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create product');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <div className="page animate-fade-in"><div className="container"><div className="loading-screen"><div className="spinner" /></div></div></div>;
  }

  if (!store) {
    return (
      <div className="page container animate-fade-in">
        <div className="empty-state glass-card">
          <h3>No Store Found</h3>
          <p>You need to create a store first to manage products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header flex justify-between items-center" style={{ marginBottom: '2rem' }}>
          <div>
            <h1>Products</h1>
            <p>Manage your menu items and catalog.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div className="empty-state glass-card">
            <Package size={64} />
            <h3>No products found</h3>
            <p>Start adding items to your menu to receive orders.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setIsModalOpen(true)}>
              Add First Product
            </button>
          </div>
        ) : (
          <div className="table-container glass-card">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div 
                          style={{ 
                            width: 40, height: 40, borderRadius: 8, 
                            background: product.image_url ? `url(${product.image_url}) center/cover` : 'var(--bg-tertiary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          {!product.image_url && <ImageIcon size={20} color="var(--text-muted)" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{product.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '250px' }}>
                            {product.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-tertiary)' }}>
                        <Tag size={12} style={{ marginRight: 4 }} />
                        {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{product.price} SAR</td>
                    <td>
                      <span className="badge badge-success">Active</span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-icon btn-ghost" title="Edit (Coming soon)">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-icon btn-ghost" style={{ color: 'var(--error)' }} title="Delete (Coming soon)">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Product Modal */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
            <div className="modal">
              <div className="modal-header">
                <h3>Add New Product</h3>
                <button className="btn-icon" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateProduct} className="flex flex-col gap-3">
                <div className="input-group">
                  <label>Product Name</label>
                  <input className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Double Burger" />
                </div>
                
                <div className="input-group">
                  <label>Price (SAR)</label>
                  <input className="input" type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 25.50" />
                </div>

                <div className="input-group">
                  <label>Category</label>
                  <select className="input" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                    <option value="">Uncategorized</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>Image URL (Optional)</label>
                  <input className="input" type="url" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://example.com/image.jpg" />
                </div>

                <div className="input-group">
                  <label>Description</label>
                  <textarea className="input" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Brief description of the item" />
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={formLoading}>
                    {formLoading ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


