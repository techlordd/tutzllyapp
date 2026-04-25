'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { User, Lock, Save, Eye, EyeOff, MapPin, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type ProfileData = Record<string, string | null | undefined>;

const formatDateForInput = (val: string | null | undefined) => {
  if (!val) return '';
  try { return new Date(val).toISOString().split('T')[0]; } catch { return ''; }
};

export default function ProfilePage() {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const [form, setForm] = useState<ProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          const normalized = {
            ...d.profile,
            date_of_birth: formatDateForInput(d.profile.date_of_birth),
          };
          setForm(normalized);
          setEmail(d.profile.email || '');
          setRole(d.role || user?.role || '');
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); toast.error('Failed to load profile'); });
  }, [user?.role]);

  const val = (key: string) => (form[key] ?? '') as string;
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to save'); return; }
      const normalized = { ...data.profile, date_of_birth: formatDateForInput(data.profile?.date_of_birth) };
      setForm(normalized);
      if (user && data.profile?.username) setUser({ ...user, username: data.profile.username });
      toast.success('Profile updated successfully');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error('All password fields are required'); return; }
    if (newPw !== confirmPw) { toast.error('New passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setChangingPw(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to change password'); return; }
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch { toast.error('Network error'); }
    finally { setChangingPw(false); }
  };

  const displayName = role === 'parent'
    ? `${val('full_name_first_name')} ${val('full_name_last_name')}`.trim()
    : role === 'admin'
    ? val('username')
    : `${val('firstname')} ${val('surname')}`.trim();

  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)
    : (user?.username?.[0] ?? '?').toUpperCase();

  const entityId = val('student_id') || val('tutor_id') || val('parent_id') || val('user_id') || '';

  const roleBadgeClass = role === 'admin' ? 'bg-red-100 text-red-700' :
    role === 'tutor' ? 'bg-blue-100 text-blue-700' :
    role === 'student' ? 'bg-green-100 text-green-700' :
    'bg-purple-100 text-purple-700';

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const disabledClass = 'w-full text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100';

  const Field = ({ label, fieldKey, type = 'text', readOnly = false, placeholder = '' }: {
    label: string; fieldKey: string; type?: string; readOnly?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {readOnly
        ? <p className={disabledClass}>{val(fieldKey) || '—'}</p>
        : <input type={type} value={val(fieldKey)} onChange={e => set(fieldKey, e.target.value)}
            placeholder={placeholder} className={inputClass} />
      }
    </div>
  );

  const SelectField = ({ label, fieldKey, options }: { label: string; fieldKey: string; options: string[] }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select value={val(fieldKey)} onChange={e => set(fieldKey, e.target.value)} className={inputClass}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const SectionHeading = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
      <Icon size={12} /> {label}
    </p>
  );

  const AddressFields = () => (
    <div>
      <SectionHeading icon={MapPin} label="Address" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Address" fieldKey="address" />
        <Field label="Address Line 1" fieldKey="address_line_1" />
        <Field label="Address Line 2" fieldKey="address_line_2" />
        <Field label="City" fieldKey="address_city" />
        <Field label="State / Province" fieldKey="address_state_province" />
        <Field label="Zip / Postal Code" fieldKey="address_zip_postal" />
        <Field label="Country" fieldKey="address_country" />
      </div>
    </div>
  );

  const BioField = () => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Short Bio</label>
      <textarea value={val('short_bio')} onChange={e => set('short_bio', e.target.value)}
        rows={3} placeholder="Tell us about yourself..."
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    </div>
  );

  const PwInput = ({ label, pwKey, showKey }: { label: string; pwKey: 'current' | 'new' | 'confirm'; showKey: keyof typeof showPw }) => {
    const value = pwKey === 'current' ? currentPw : pwKey === 'new' ? newPw : confirmPw;
    const onChange = pwKey === 'current' ? setCurrentPw : pwKey === 'new' ? setNewPw : setConfirmPw;
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <div className="relative">
          <input type={showPw[showKey] ? 'text' : 'password'} value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={pwKey === 'new' ? 'Minimum 8 characters' : ''}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button"
            onClick={() => setShowPw(p => ({ ...p, [showKey]: !p[showKey] }))}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
            {showPw[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {pwKey === 'confirm' && newPw && confirmPw && newPw !== confirmPw && (
          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
        )}
      </div>
    );
  };

  if (loading) return (
    <DashboardLayout title="Profile">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{displayName || 'My Profile'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{email || user?.email || ''}</p>
              <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${roleBadgeClass}`}>
                {role}
              </span>
            </div>
            {entityId && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400">ID</p>
                <p className="text-sm font-mono text-gray-600">{entityId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <User size={18} className="text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
          </div>

          {role === 'admin' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Username" fieldKey="username" />
              <Field label="Email" fieldKey="email" readOnly />
              <Field label="Role" fieldKey="role" readOnly />
            </div>
          ) : role === 'parent' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" fieldKey="full_name_first_name" />
                <Field label="Last Name" fieldKey="full_name_last_name" />
                <Field label="Phone Number" fieldKey="phone_no" />
                <SelectField label="Sex" fieldKey="sex" options={['Male', 'Female']} />
                <Field label="Date of Birth" fieldKey="date_of_birth" type="date" />
                <Field label="Email" fieldKey="email" readOnly />
              </div>
              <AddressFields />
              <BioField />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" fieldKey="firstname" />
                <Field label="Last Name" fieldKey="surname" />
                <Field label="Phone Number" fieldKey="phone_no" />
                <SelectField label="Sex" fieldKey="sex" options={['Male', 'Female']} />
                <Field label="Date of Birth" fieldKey="date_of_birth" type="date" />
                <Field label="Email" fieldKey="email" readOnly />
                {role === 'student' && <Field label="Grade" fieldKey="grade" placeholder="e.g. Grade 5" />}
                {role === 'student' && <Field label="School" fieldKey="school" placeholder="School name" />}
              </div>

              {role === 'student' && (
                <div>
                  <SectionHeading icon={UserCircle} label="Parent / Guardian Info" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Mother's Name" fieldKey="mothers_name" />
                    <Field label="Mother's Email" fieldKey="mothers_email" type="email" />
                    <Field label="Father's Name" fieldKey="fathers_name" />
                    <Field label="Father's Email" fieldKey="fathers_email" type="email" />
                  </div>
                </div>
              )}

              <AddressFields />
              <BioField />
            </div>
          )}

          <div className="flex justify-end mt-6 pt-5 border-t border-gray-100">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              <Save size={15} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={18} className="text-amber-500" />
            <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
          </div>
          <div className="max-w-md space-y-4">
            <PwInput label="Current Password" pwKey="current" showKey="current" />
            <PwInput label="New Password" pwKey="new" showKey="new" />
            <PwInput label="Confirm New Password" pwKey="confirm" showKey="confirm" />
            <button onClick={handlePasswordChange} disabled={changingPw}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              <Lock size={15} />
              {changingPw ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
