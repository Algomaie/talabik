import { useEffect, useState } from 'react';
import { storesApi, productsApi, categoriesApi, api } from '../../lib/api';
import { Package, Plus, Edit2, Trash2, Tag, Image as ImageIcon, X, AlertTriangle } from 'lucide-react';
import '../customer/CustomerPages.css';

export default function MerchantProductsPage() {
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form / Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const storesRes = await storesApi.myStores();
      const storeList = storesRes.data?.data?.stores || (Array.isArray(storesRes.data?.data) ? storesRes.data.data : []);
      if (storeList.length > 0) {
        const myStore = storeList[0];
        setStore(myStore);

        // Load products and categories concurrently
        const [prodRes, catRes] = await Promise.all([
          productsApi.list({ storeId: myStore.id }),
          categoriesApi.listByStore(myStore.id),
        ]);

        setProducts(prodRes.data?.data?.products || (Array.isArray(prodRes.data?.data) ? prodRes.data.data : []));
        setCategories(catRes.data?.data?.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      image_url: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price !== undefined ? String(product.price) : '',
      category_id: product.category_id || product.categoryId || '',
      image_url: product.image_url || product.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    try {
      setFormLoading(true);

      if (editingProduct) {
        // Update product
        const payload: any = {
          name: formData.name.trim(),
          price: parseFloat(formData.price),
          categoryId: formData.category_id || null,
        };

        if (formData.description !== undefined) {
          payload.description = formData.description;
        }

        if (formData.image_url && formData.image_url.trim()) {
          payload.imageUrl = formData.image_url.trim();
        }

        await productsApi.update(editingProduct.id, payload);
      } else {
        // Create product
        const payload: any = {
          storeId: store.id,
          name: formData.name.trim(),
          price: parseFloat(formData.price),
        };

        if (formData.category_id) {
          payload.categoryId = formData.category_id;
        }

        if (formData.description) {
          payload.description = formData.description;
        }

        if (formData.image_url && formData.image_url.trim()) {
          payload.imageUrl = formData.image_url.trim();
        }

        await productsApi.create(payload);
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', category_id: '', image_url: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || (editingProduct ? 'Failed to update product' : 'Failed to create product'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDeleteModal = (product: any) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/products/${productToDelete.id}`);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete product');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="loading-screen">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
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
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} /> Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div className="empty-state glass-card">
            <Package size={64} />
            <h3>No products found</h3>
            <p>Start adding items to your menu to receive orders.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleOpenAddModal}>
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
                {products.map((product) => {
                  const productImg = product.image_url || product.imageUrl;
                  const productCatId = product.category_id || product.categoryId;
                  const categoryName = categories.find((c) => c.id === productCatId)?.name || 'Uncategorized';

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              background: productImg ? `url(${productImg}) center/cover` : 'var(--bg-tertiary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {!productImg && <ImageIcon size={20} color="var(--text-muted)" />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{product.name}</div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                maxWidth: '250px',
                              }}
                            >
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-tertiary)' }}>
                          <Tag size={12} style={{ marginRight: 4 }} />
                          {categoryName}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{product.price} SAR</td>
                      <td>
                        <span className="badge badge-success">
                          {product.is_active === false || product.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-icon btn-ghost"
                            title="Edit Product"
                            onClick={() => handleOpenEditModal(product)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-icon btn-ghost"
                            style={{ color: 'var(--error)' }}
                            title="Delete Product"
                            onClick={() => handleOpenDeleteModal(product)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit Product Modal */}
        {isModalOpen && (
          <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && !formLoading && setIsModalOpen(false)}
          >
            <div className="modal" style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => !formLoading && setIsModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitProduct} className="flex flex-col gap-3">
                <div className="input-group">
                  <label>Product Name</label>
                  <input
                    className="input"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Double Burger"
                  />
                </div>

                <div className="input-group">
                  <label>Price (SAR)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 25.50"
                  />
                </div>

                <div className="input-group">
                  <label>Category</label>
                  <select
                    className="input"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Image URL (Optional)</label>
                  <input
                    className="input"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="input-group">
                  <label>Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the item"
                  />
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setIsModalOpen(false)}
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={formLoading}>
                    {formLoading
                      ? editingProduct
                        ? 'Updating...'
                        : 'Saving...'
                      : editingProduct
                      ? 'Update Product'
                      : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && productToDelete && (
          <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && !deleteLoading && setIsDeleteModalOpen(false)}
          >
            <div className="modal" style={{ maxWidth: 440 }}>
              <div className="modal-header">
                <div className="flex items-center gap-2" style={{ color: 'var(--error)' }}>
                  <AlertTriangle size={22} />
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Delete Product</h3>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => !deleteLoading && setIsDeleteModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ margin: '1rem 0' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                  Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{productToDelete.name}"</strong>?
                  This item will be removed from your store menu.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'var(--error)', color: '#fff' }}
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
