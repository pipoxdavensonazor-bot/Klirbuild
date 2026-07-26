import { useState } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import type { Category } from '../lib/supabase';

export interface Filters {
  categoryId: string;
  department: string;
  minPrice: string;
  maxPrice: string;
  minRating: number;
  inStockOnly: boolean;
  badge: string;
}

interface FilterSidebarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
}

const RATINGS = [4, 3, 2, 1];
const BADGES = [
  { value: 'best_seller',    label: 'Best Seller' },
  { value: 'amazons_choice', label: "Klir's Choice" },
  { value: 'new',            label: 'New Arrivals' },
  { value: 'limited_deal',   label: 'Limited Deals' },
];

export const FilterSidebar = ({ filters, onChange, categories, isOpen, onClose }: FilterSidebarProps) => {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const [expandedSections, setExpandedSections] = useState({
    category: true, price: true, rating: true, stock: true, badge: true,
  });
  const toggle = (k: keyof typeof expandedSections) =>
    setExpandedSections(s => ({ ...s, [k]: !s[k] }));

  const activeCount = [
    filters.categoryId, filters.department, filters.minPrice,
    filters.maxPrice, filters.badge,
    filters.minRating > 0, filters.inStockOnly,
  ].filter(Boolean).length;

  const sidebar = (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 text-lg">Filters</h2>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({ categoryId: '', department: '', minPrice: '', maxPrice: '', minRating: 0, inStockOnly: false, badge: '' })}
            className="text-xs text-blue-600 hover:text-orange-500 underline"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {/* Category */}
      <Section
        title="Department"
        expanded={expandedSections.category}
        onToggle={() => toggle('category')}
      >
        <button
          onClick={() => set({ categoryId: '' })}
          className={`block w-full text-left text-sm py-0.5 hover:text-orange-600 transition-colors ${!filters.categoryId ? 'font-bold text-orange-600' : 'text-gray-700'}`}
        >
          All Departments
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => set({ categoryId: cat.id })}
            className={`block w-full text-left text-sm py-0.5 hover:text-orange-600 transition-colors ${filters.categoryId === cat.id ? 'font-bold text-orange-600' : 'text-gray-700'}`}
          >
            {cat.name}
          </button>
        ))}
      </Section>

      {/* Price */}
      <Section title="Price" expanded={expandedSections.price} onToggle={() => toggle('price')}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Min (HTG)</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={e => set({ minPrice: e.target.value })}
              placeholder="0"
              min="0"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <span className="text-gray-400 mt-4">–</span>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Max (HTG)</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={e => set({ maxPrice: e.target.value })}
              placeholder="Any"
              min="0"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
        </div>
      </Section>

      {/* Rating */}
      <Section title="Customer Rating" expanded={expandedSections.rating} onToggle={() => toggle('rating')}>
        {RATINGS.map(r => (
          <button
            key={r}
            onClick={() => set({ minRating: filters.minRating === r ? 0 : r })}
            className={`flex items-center gap-2 w-full text-left py-0.5 transition-colors group ${filters.minRating === r ? 'text-orange-600 font-semibold' : 'text-gray-700 hover:text-orange-600'}`}
          >
            <div className="flex">
              {Array.from({ length: r }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
              ))}
              {Array.from({ length: 5 - r }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-gray-300" />
              ))}
            </div>
            <span className="text-xs">& Up</span>
          </button>
        ))}
      </Section>

      {/* Availability */}
      <Section title="Availability" expanded={expandedSections.stock} onToggle={() => toggle('stock')}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={e => set({ inStockOnly: e.target.checked })}
            className="rounded accent-orange-500"
          />
          <span className="text-sm text-gray-700">In Stock Only</span>
        </label>
      </Section>

      {/* Badge */}
      <Section title="Featured" expanded={expandedSections.badge} onToggle={() => toggle('badge')}>
        {BADGES.map(b => (
          <button
            key={b.value}
            onClick={() => set({ badge: filters.badge === b.value ? '' : b.value })}
            className={`block w-full text-left text-sm py-0.5 hover:text-orange-600 transition-colors ${filters.badge === b.value ? 'font-bold text-orange-600' : 'text-gray-700'}`}
          >
            {b.label}
          </button>
        ))}
      </Section>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-56 flex-shrink-0">
        {sidebar}
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 overflow-y-auto p-5 shadow-2xl lg:hidden animate-slide-in-left">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">Filters</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
                ✕
              </button>
            </div>
            {sidebar}
          </div>
        </>
      )}
    </>
  );
};

function Section({
  title, expanded, onToggle, children,
}: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 py-3">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left mb-2"
      >
        <span className="font-semibold text-sm text-gray-800">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {expanded && <div className="space-y-1">{children}</div>}
    </div>
  );
}
