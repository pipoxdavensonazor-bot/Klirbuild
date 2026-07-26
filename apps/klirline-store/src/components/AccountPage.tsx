import { useState, useEffect } from 'react';
import { ArrowLeft, User, MapPin, Plus, CreditCard as Edit2, Trash2, Check, ShoppingBag, Heart, Star, Shield, ChevronRight, Phone, Mail } from 'lucide-react';
import { supabase, type Address, type Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AccountPageProps {
  onBack: () => void;
  onMyOrdersClick: () => void;
  onWishlistClick: () => void;
}

const EMPTY_ADDRESS: Omit<Address, 'id' | 'user_id' | 'created_at'> = {
  full_name: '', phone: '', street: '', city: '',
  state_dept: '', postal_code: '', country: 'Haiti', is_default: false,
};

export const AccountPage = ({ onBack, onMyOrdersClick, onWishlistClick }: AccountPageProps) => {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<'profile' | 'addresses' | 'security'>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, []);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name ?? '');
      setPhone(data.phone ?? '');
    }
  };

  const fetchAddresses = async () => {
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .order('is_default', { ascending: false });
    if (data) setAddresses(data);
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    await supabase
      .from('profiles')
      .upsert({ id: user!.id, display_name: displayName.trim(), phone: phone.trim() });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
    setProfileLoading(false);
    await fetchProfile();
  };

  const openNewAddress = () => {
    setEditingAddress(null);
    setAddressForm(EMPTY_ADDRESS);
    setAddressError('');
    setShowAddressForm(true);
  };

  const openEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddressForm({
      full_name: addr.full_name,
      phone: addr.phone ?? '',
      street: addr.street,
      city: addr.city,
      state_dept: addr.state_dept ?? '',
      postal_code: addr.postal_code ?? '',
      country: addr.country,
      is_default: addr.is_default,
    });
    setAddressError('');
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');
    setAddressLoading(true);

    const payload = {
      full_name: addressForm.full_name.trim(),
      phone: (addressForm.phone ?? '').trim() || null,
      street: addressForm.street.trim(),
      city: addressForm.city.trim(),
      state_dept: (addressForm.state_dept ?? '').trim() || null,
      postal_code: (addressForm.postal_code ?? '').trim() || null,
      country: addressForm.country,
      is_default: addressForm.is_default,
    };

    if (addressForm.is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id);
    }

    const { error } = editingAddress
      ? await supabase.from('addresses').update(payload).eq('id', editingAddress.id)
      : await supabase.from('addresses').insert(payload);

    if (error) {
      setAddressError(error.message);
    } else {
      setShowAddressForm(false);
      await fetchAddresses();
    }
    setAddressLoading(false);
  };

  const handleDeleteAddress = async (id: string) => {
    await supabase.from('addresses').delete().eq('id', id);
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    await fetchAddresses();
  };

  const setAddr = (field: string, value: string | boolean) =>
    setAddressForm(f => ({ ...f, [field]: value }));

  const tabs = [
    { key: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { key: 'addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4" /> },
    { key: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-[#131921] text-white px-4 py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm hover:text-orange-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-lg font-bold">Your Account</h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Account overview card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {profile?.display_name || 'Complete your profile'}
            </p>
            <p className="text-sm text-gray-500 truncate flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              {user?.email}
            </p>
            {profile?.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                {profile.phone}
              </p>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={onMyOrdersClick}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
          >
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">My Orders</p>
              <p className="text-xs text-gray-500">Track & manage</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
          <button
            onClick={onWishlistClick}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
          >
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Wishlist</p>
              <p className="text-xs text-gray-500">Saved items</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors flex-1 justify-center ${
                  tab === t.key
                    ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Profile tab */}
            {tab === 'profile' && (
              <div className="space-y-4 max-w-md">
                <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+509 __ __ __ __"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    profileSaved
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {profileSaved ? <><Check className="w-4 h-4" /> Saved!</> : profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Addresses tab */}
            {tab === 'addresses' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Delivery Addresses</h2>
                  <button
                    onClick={openNewAddress}
                    className="flex items-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Address
                  </button>
                </div>

                {/* Address form */}
                {showAddressForm && (
                  <form onSubmit={handleSaveAddress} className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
                    <h3 className="font-semibold text-sm text-gray-800">
                      {editingAddress ? 'Edit Address' : 'New Address'}
                    </h3>
                    {addressError && (
                      <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addressError}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name *</label>
                        <input required value={addressForm.full_name} onChange={e => setAddr('full_name', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Full name" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                        <input value={addressForm.phone ?? ''} onChange={e => setAddr('phone', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="+509 __ __ __ __" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Street Address *</label>
                        <input required value={addressForm.street} onChange={e => setAddr('street', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Street address, apartment, etc." />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">City *</label>
                        <input required value={addressForm.city} onChange={e => setAddr('city', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="City" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">State / Department</label>
                        <input value={addressForm.state_dept ?? ''} onChange={e => setAddr('state_dept', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="e.g. Ouest" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={addressForm.is_default}
                        onChange={e => setAddr('is_default', e.target.checked)}
                        className="rounded accent-orange-500" />
                      <span className="text-sm text-gray-700">Set as default address</span>
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowAddressForm(false)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={addressLoading}
                        className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg text-sm font-semibold transition-colors">
                        {addressLoading ? 'Saving...' : editingAddress ? 'Update' : 'Add Address'}
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 && !showAddressForm ? (
                  <div className="text-center py-10">
                    <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No addresses saved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr.id} className={`border rounded-xl p-4 ${addr.is_default ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-gray-900">{addr.full_name}</p>
                              {addr.is_default && (
                                <span className="text-[11px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{addr.street}</p>
                            <p className="text-sm text-gray-600">
                              {addr.city}{addr.state_dept ? `, ${addr.state_dept}` : ''}{addr.postal_code ? ` ${addr.postal_code}` : ''}
                            </p>
                            <p className="text-sm text-gray-600">{addr.country}</p>
                            {addr.phone && <p className="text-xs text-gray-500 mt-0.5">{addr.phone}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!addr.is_default && (
                              <button onClick={() => handleSetDefault(addr.id)}
                                className="text-xs text-blue-600 hover:text-orange-500 underline px-1">
                                Set default
                              </button>
                            )}
                            <button onClick={() => openEditAddress(addr)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteAddress(addr.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Security tab */}
            {tab === 'security' && (
              <div className="max-w-md space-y-4">
                <h2 className="font-semibold text-gray-900 mb-4">Security Settings</h2>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Email Authentication</p>
                      <p className="text-xs text-gray-500 mt-0.5">Your account is protected with email and password.</p>
                      <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Active
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Account Email</p>
                      <p className="text-xs text-gray-500 mt-0.5 break-all">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => { signOut(); onBack(); }}
                    className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    Sign out of all devices
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
