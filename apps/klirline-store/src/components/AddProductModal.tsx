import { useState, useEffect } from 'react';
import {
  X, Package, DollarSign, Image, Tag, ToggleLeft, ToggleRight,
  Plus, Trash2, ChevronDown,
} from 'lucide-react';
import { supabase, type Category, type Product, BADGE_CONFIG } from '../lib/supabase';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editProduct?: Product | null;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  original_price: '',
  deal_price: '',
  image_url: '',
  category_id: '',
  in_stock: true,
  brand: '',
  badge: '',
  featured: false,
  about_items: [] as string[],
};

const BADGES = Object.entries(BADGE_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));

export const AddProductModal = ({ isOpen, onClose, onSuccess, editProduct }: AddProductModalProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [aboutInput, setAboutInput] = useState('');
  const isEdit = !!editProduct;

  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => { if (data) setCategories(data); });

    if (editProduct) {
      setForm({
        name: editProduct.name,
        description: editProduct.description,
        price: String(editProduct.price),
        original_price: editProduct.original_price != null ? String(editProduct.original_price) : '',
        deal_price: editProduct.deal_price != null ? String(editProduct.deal_price) : '',
        image_url: editProduct.image_url,
        category_id: editProduct.category_id ?? '',
        in_stock: editProduct.in_stock,
        brand: editProduct.brand ?? '',
        badge: editProduct.badge ?? '',
        featured: editProduct.featured ?? false,
        about_items: Array.isArray(editProduct.about_items) ? editProduct.about_items : [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setAboutInput('');
    setError('');
  }, [isOpen, editProduct]);

  if (!isOpen) return null;

  const set = (field: string, value: string | boolean | string[]) =>
    setForm(f => ({ ...f, [field]: value }));

  const addAboutItem = () => {
    const trimmed = aboutInput.trim();
    if (!trimmed) return;
    set('about_items', [...form.about_items, trimmed]);
    setAboutInput('');
  };

  const removeAboutItem = (idx: number) =>
    set('about_items', form.about_items.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const price = parseFloat(form.price);
    const originalPrice = form.original_price ? parseFloat(form.original_price) : null;
    const dealPrice = form.deal_price ? parseFloat(form.deal_price) : null;

    if (originalPrice !== null && originalPrice <= price) {
      setError('Original price must be higher than the current price.');
      return;
    }
    if (dealPrice !== null && dealPrice >= price) {
      setError('Deal price must be lower than the current price.');
      return;
    }

    setLoading(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      original_price: originalPrice,
      deal_price: dealPrice,
      image_url: form.image_url.trim(),
      category_id: form.category_id || null,
      in_stock: form.in_stock,
      brand: form.brand.trim() || null,
      badge: form.badge || null,
      featured: form.featured,
      about_items: form.about_items.length > 0 ? form.about_items : null,
    };

    const { error: dbError } = isEdit
      ? await supabase.from('products').update(payload).eq('id', editProduct!.id)
      : await supabase.from('products').insert({ ...payload, rating: 0, review_count: 0 });

    if (dbError) {
      setError(dbError.message);
    } else {
      setForm(EMPTY_FORM);
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto pointer-events-auto">

          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-5 rounded-t-2xl sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-orange-400" />
                <h2 className="text-xl font-bold">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-orange-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {isEdit ? 'Update your product details' : 'List your product on Klirline Store'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                  maxLength={120}
                  placeholder="e.g. Wireless Bluetooth Speaker"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                maxLength={60}
                placeholder="e.g. Sony, Samsung..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                required
                rows={3}
                maxLength={1000}
                placeholder="Describe your product features, condition, and details..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>

            {/* About this item bullets */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                About This Item <span className="text-gray-400 font-normal">(bullet points)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aboutInput}
                  onChange={e => setAboutInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAboutItem(); } }}
                  placeholder="Add a feature or spec..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={addAboutItem}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {form.about_items.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {form.about_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span className="flex-1">{item}</span>
                      <button type="button" onClick={() => removeAboutItem(i)}>
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 transition-colors" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Price (HTG) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    required
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Original Price <span className="text-gray-400 font-normal text-xs">(was)</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={form.original_price}
                    onChange={e => set('original_price', e.target.value)}
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Deal price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Deal Price (HTG) <span className="text-gray-400 font-normal text-xs">— limited time offer</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                <input
                  type="number"
                  value={form.deal_price}
                  onChange={e => set('deal_price', e.target.value)}
                  min="1"
                  step="0.01"
                  placeholder="Lower than price..."
                  className="w-full pl-9 pr-3 py-2.5 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Shows "Limited time deal" badge on the product</p>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Image URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={form.image_url}
                  onChange={e => set('image_url', e.target.value)}
                  required
                  placeholder="https://..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {form.image_url && (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <p className="text-xs text-gray-500 px-3 py-1.5 bg-gray-50 border-b border-gray-200">Preview</p>
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="w-full h-40 object-contain bg-gray-50 p-2"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {/* Category + Badge */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-8"
                  >
                    <option value="">Select...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Badge</label>
                <div className="relative">
                  <select
                    value={form.badge}
                    onChange={e => set('badge', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-8"
                  >
                    <option value="">None</option>
                    {BADGES.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">Available in stock</p>
                  <p className="text-xs text-gray-400">Customers can add to cart</p>
                </div>
                <button type="button" onClick={() => set('in_stock', !form.in_stock)} className="transition-colors">
                  {form.in_stock
                    ? <ToggleRight className="w-8 h-8 text-orange-500" />
                    : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">Featured product</p>
                  <p className="text-xs text-gray-400">Highlight on the homepage</p>
                </div>
                <button type="button" onClick={() => set('featured', !form.featured)} className="transition-colors">
                  {form.featured
                    ? <ToggleRight className="w-8 h-8 text-orange-500" />
                    : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEdit ? 'Saving...' : 'Publishing...'}
                  </span>
                ) : isEdit ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
