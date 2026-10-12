import { useEffect, useState } from 'react';
import { categoriesApi, storesApi } from '../../lib/api';
import { FolderOpen, Plus, Edit2, Trash2, X, Tag } from 'lucide-react';
import '../shared/Shared.css';

interface Category {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  product_count?: number;
}

export default function MerchantCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadStore(); }, []);

  const loadStore = async () => {
    try {
      const { data } = await storesApi.myStores();
      if (data.data && data.data.length > 0) {
        const sid = data.data[0].id;
        setStoreId(sid);
        await loadCategories(sid);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (sid: string) => {
    try {
      const { data } = await categoriesApi.listByStore(sid);
      setCategories(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openAdd = () => {
    setEditingCategory(null);
    setForm({ name: '', description: '', sortOrder: categories.length });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setForm({ name: cat.name, description: cat.description || '', sortOrder: cat.sort_order });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setSaving(true);
    try {
      const payload: any = {
        storeId,
        name: form.name,
        sortOrder: form.sortOrder,
      };
      if (form.description) payload.description = form.description;

      if (editingCategory) {
        const { api } = await import('../../lib/api');
        await api.patch(`/categories/${editingCategory.id}`, payload);
        setCategories((prev) =>
          prev.map((c) => c.id === editingCategory.id ? { ...c, ...form, sort_order: form.sortOrder } : c)
        );
      } else {
        const { api } = await import('../../lib/api');
        const { data } = await api.post('/categories', payload);
        setCategories((prev) => [...prev, data.data]);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save category');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this category? Products in it won\'t be deleted.')) return;
    try {
      const { api } = await import('../../lib/api');
      await api.delete(`/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="page animate-fade-in">
      <div className="container" style={{ maxWidth: 700 }}>
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div>
              <h1><FolderOpen size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Categories</h1>
              <p>Organize your products into categories for easy browsing.</p>
            </div>
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={18} /> Add Category
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="glass-card empty-state">
            <Tag size={48} />
            <h3>No categories yet</h3>
            <p>Create categories to organize your store's products.</p>
            <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: '1rem' }}>
              <Plus size={18} /> Create First Category
            </button>
          </div>
        ) : (
          <div className="category-list">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="category-item glass-card" style={{ animationDelay: `${idx * 0.05}s`, animation: 'fadeIn 0.3s ease-out both' }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: `hsl(${(idx * 60) % 360}, 50%, 20%)`,
                    border: `1px solid hsl(${(idx * 60) % 360}, 50%, 35%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Tag size={18} style={{ color: `hsl(${(idx * 60) % 360}, 70%, 65%)` }} />
                  </div>
                  <div>
                    <div className="category-name">{cat.name}</div>
                    {cat.description && (
                      <div className="category-count">{cat.description}</div>
                    )}
                  </div>
                </div>
                <div className="action-btns">
                  <button className="action-btn" title="Edit" onClick={() => openEdit(cat)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="action-btn danger" title="Delete" onClick={() => handleDelete(cat.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'New Category'}</h3>
              <button className="action-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="input-group">
                <label>Category Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Burgers, Drinks, Desserts"
                  required
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label>Description (optional)</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div className="input-group">
                <label>Sort Order</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (editingCategory ? 'Save Changes' : 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
