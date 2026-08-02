import { useState, useEffect, useRef } from 'react';
import {
  X, Package, DollarSign, Tag, ToggleLeft, ToggleRight,
  Plus, Trash2, ChevronDown, Camera, Loader2, ImagePlus,
} from 'lucide-react';
import { supabase, type Category, type Product, BADGE_CONFIG } from '../lib/supabase';
import { resolveProductImageUrl, uploadProductImage } from '../lib/kyc-upload';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editProduct?: Product | null;
}

const MAX_PHOTOS = 4;

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  original_price: '',
  deal_price: '',
  category_id: '',
  in_stock: true,
  brand: '',
  badge: '',
  about_items: [] as string[],
};

const BADGES = Object.entries(BADGE_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));

function normalizeGallery(product: Product): string[] {
  const main = product.image_url?.trim() || '';
  const extras = Array.isArray(product.images)
    ? product.images.map(u => String(u).trim()).filter(Boolean)
    : [];
  const merged = [main, ...extras].filter(Boolean);
  const unique = [...new Set(merged)];
  return unique.slice(0, MAX_PHOTOS);
}

export const AddProductModal = ({ isOpen, onClose, onSuccess, editProduct }: AddProductModalProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [aboutInput, setAboutInput] = useState('');
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
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
        category_id: editProduct.category_id ?? '',
        in_stock: editProduct.in_stock,
        brand: editProduct.brand ?? '',
        badge: editProduct.badge ?? '',
        about_items: Array.isArray(editProduct.about_items) ? editProduct.about_items : [],
      });
      setPhotos(normalizeGallery(editProduct));
    } else {
      setForm(EMPTY_FORM);
      setPhotos([]);
    }
    setAboutInput('');
    setError('');
    setUploadingSlot(null);
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

  const onPhotoFile = async (slot: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choisissez une image (JPG, PNG ou WebP).');
      return;
    }
    setError('');
    setUploadingSlot(slot);
    try {
      const url = await uploadProductImage(file, slot);
      setPhotos(prev => {
        const next = [...prev];
        if (slot < next.length) next[slot] = url;
        else next.push(url);
        return next.slice(0, MAX_PHOTOS);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec upload photo');
    } finally {
      setUploadingSlot(null);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const gallery = photos.map(p => p.trim()).filter(Boolean);
    if (gallery.length === 0) {
      setError('Ajoutez au moins 1 photo du produit (jusqu’à 4).');
      return;
    }
    if (!form.description.trim() || form.description.trim().length < 20) {
      setError('La description doit faire au moins 20 caractères.');
      return;
    }

    const price = parseFloat(form.price);
    const originalPrice = form.original_price ? parseFloat(form.original_price) : null;
    const dealPrice = form.deal_price ? parseFloat(form.deal_price) : null;

    if (originalPrice !== null && originalPrice <= price) {
      setError('Le prix barré doit être supérieur au prix actuel.');
      return;
    }
    if (dealPrice !== null && dealPrice >= price) {
      setError('Le prix promo doit être inférieur au prix actuel.');
      return;
    }

    setLoading(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      original_price: originalPrice,
      deal_price: dealPrice,
      image_url: gallery[0],
      images: gallery,
      category_id: form.category_id || null,
      in_stock: form.in_stock,
      brand: form.brand.trim() || null,
      badge: form.badge || null,
      about_items: form.about_items.length > 0 ? form.about_items : null,
    };

    const { error: dbError } = isEdit
      ? await supabase.from('products').update(payload).eq('id', editProduct!.id)
      : await supabase.from('products').insert({ ...payload, rating: 0, review_count: 0 });

    if (dbError) {
      setError(dbError.message);
    } else {
      setForm(EMPTY_FORM);
      setPhotos([]);
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto pointer-events-auto">

          <div className="bg-brand-dark text-white px-6 py-5 rounded-t-2xl sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-bold">{isEdit ? 'Modifier le produit' : 'Ajouter un produit'}</h2>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Jusqu’à 4 photos + description détaillée
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Photos — 4 slots */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Photos du produit <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">({photos.length}/{MAX_PHOTOS})</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Photo 1 = image principale. Ajoutez jusqu’à 4 vues (avant, détail, emballage…).
              </p>
              <div className="grid grid-cols-2 gap-3">
                {slots.map((url, i) => {
                  const preview = url ? resolveProductImageUrl(url) : null;
                  const busy = uploadingSlot === i;
                  return (
                    <div key={i} className="relative">
                      <input
                        ref={el => { fileRefs.current[i] = el; }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => onPhotoFile(i, e.target.files?.[0] ?? null)}
                      />
                      {preview ? (
                        <div className="relative aspect-square rounded-xl border border-brand/20 overflow-hidden bg-haiti-sand">
                          <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded">
                            {i === 0 ? 'Principale' : `Photo ${i + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-red-600"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => fileRefs.current[i]?.click()}
                            className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold bg-white/90 text-brand px-2 py-1 rounded"
                          >
                            Remplacer
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || i > photos.length}
                          onClick={() => fileRefs.current[i]?.click()}
                          className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-brand bg-gray-50 flex flex-col items-center justify-center gap-1.5 text-gray-600 disabled:opacity-40"
                        >
                          {busy ? (
                            <Loader2 className="w-6 h-6 animate-spin text-brand" />
                          ) : (
                            <>
                              <ImagePlus className="w-6 h-6 text-brand" />
                              <span className="text-xs font-semibold">Photo {i + 1}</span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Camera className="w-3 h-3" /> Galerie / caméra
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                  maxLength={120}
                  placeholder="Ex. Lampe solaire portable LED"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Boutique / marque
              </label>
              <input
                type="text"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                maxLength={60}
                placeholder="Ex. Kay Soley Énergie"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description du produit <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                required
                rows={6}
                maxLength={4000}
                placeholder="Décrivez l’état, les dimensions, l’usage, le contenu du colis, la garantie… Les acheteurs lisent ceci avant d’acheter."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-y min-h-[120px]"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {form.description.trim().length}/4000 · min. 20 caractères
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Points clés <span className="text-gray-400 font-normal">(liste à puces)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aboutInput}
                  onChange={e => setAboutInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAboutItem(); } }}
                  placeholder="Ex. Batterie rechargeable 8 h"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={addAboutItem}
                  className="bg-brand hover:bg-brand-mid text-white px-3 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {form.about_items.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {form.about_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-brand mt-0.5">•</span>
                      <span className="flex-1">{item}</span>
                      <button type="button" onClick={() => removeAboutItem(i)}>
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 transition-colors" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Prix (HTG) <span className="text-red-500">*</span>
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
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Prix barré <span className="text-gray-400 font-normal text-xs">(avant)</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={form.original_price}
                    onChange={e => set('original_price', e.target.value)}
                    min="1"
                    step="0.01"
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Prix promo (HTG) <span className="text-gray-400 font-normal text-xs">— offre limitée</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                <input
                  type="number"
                  value={form.deal_price}
                  onChange={e => set('deal_price', e.target.value)}
                  min="1"
                  step="0.01"
                  placeholder="Inférieur au prix…"
                  className="w-full pl-9 pr-3 py-2.5 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Catégorie</label>
                <div className="relative">
                  <select
                    value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand appearance-none pr-8"
                  >
                    <option value="">Choisir…</option>
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand appearance-none pr-8"
                  >
                    <option value="">Aucun</option>
                    {BADGES.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">En stock</p>
                  <p className="text-xs text-gray-400">Les clients peuvent ajouter au panier</p>
                </div>
                <button type="button" onClick={() => set('in_stock', !form.in_stock)} className="transition-colors">
                  {form.in_stock
                    ? <ToggleRight className="w-8 h-8 text-brand" />
                    : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || uploadingSlot !== null}
                className="flex-1 py-3 bg-brand hover:bg-brand-mid disabled:bg-brand/40 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEdit ? 'Enregistrement…' : 'Publication…'}
                  </span>
                ) : isEdit ? 'Enregistrer' : 'Publier le produit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
