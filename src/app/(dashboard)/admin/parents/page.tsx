'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Plus, Eye, Edit } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Parent {
  parent_id: string; fullname_first: string; fullname_last: string;
  email: string; phone_no: string; sex: string; no_of_students: number;
  student1: string; student_id1: string; student2: string; student_id2: string;
  student3: string; student_id3: string; student4: string; student_id4: string;
  student5: string; student_id5: string; created_at: string;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<{student_id: string; firstname: string; surname: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selected, setSelected] = useState<Parent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullname_first: '', fullname_last: '', email: '', password: '', phone_no: '', sex: '',
    date_of_birth: '', address_line1: '', address_line2: '', address_city: '',
    address_state: '', address_zip: '', address_country: '', short_bio: '',
    no_of_students: '0',
    student1: '', student_id1: '', student2: '', student_id2: '',
    student3: '', student_id3: '', student4: '', student_id4: '',
    student5: '', student_id5: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetch('/api/parents'), fetch('/api/students')]);
      const [pData, sData] = await Promise.all([pRes.json(), sRes.json()]);
      setParents(pData.parents || []);
      setStudents(sData.students || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStudentSelect = (index: number, studentId: string) => {
    const s = students.find(s => s.student_id === studentId);
    const updates: Record<string, string> = {};
    updates[`student${index}`] = s ? `${s.firstname} ${s.surname}` : '';
    updates[`student_id${index}`] = studentId;
    setForm(f => ({ ...f, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/parents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Parent registered!');
      setModalOpen(false);
      fetchData();
    } catch { toast.error('Failed to register parent'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'fullname', label: 'Parent', render: (_: unknown, row: Parent) => (
      <div className="flex items-center gap-3">
        <Avatar name={`${row.fullname_first} ${row.fullname_last}`} size="sm" />
        <div>
          <p className="font-medium">{row.fullname_first} {row.fullname_last}</p>
          <p className="text-xs text-gray-400">{row.parent_id}</p>
        </div>
      </div>
    )},
    { key: 'email', label: 'Email' },
    { key: 'phone_no', label: 'Phone' },
    { key: 'no_of_students', label: 'Children', render: (v: unknown) =>
      <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">{v as number}</span>
    },
    { key: 'created_at', label: 'Registered', render: (v: unknown) => formatDate(v as string) },
  ];

  return (
    <DashboardLayout title="Parents Management">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Parents</h2>
            <p className="text-gray-500 text-sm mt-0.5">{parents.length} registered parents</p>
          </div>
          <Button icon={Plus} onClick={() => setModalOpen(true)}>Register Parent</Button>
        </div>

        <DataTable data={parents} columns={columns} loading={loading}
          searchKeys={['fullname_first', 'fullname_last', 'email', 'parent_id']}
          emptyMessage="No parents registered yet"
          actions={(row) => (
            <button onClick={() => { setSelected(row); setViewModalOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Eye size={15} /></button>
          )}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register New Parent" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required><Input value={form.fullname_first} onChange={e => setForm({...form, fullname_first: e.target.value})} required /></FormField>
            <FormField label="Last Name" required><Input value={form.fullname_last} onChange={e => setForm({...form, fullname_last: e.target.value})} required /></FormField>
            <FormField label="Email" required><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></FormField>
            <FormField label="Password" required><Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></FormField>
            <FormField label="Phone"><Input value={form.phone_no} onChange={e => setForm({...form, phone_no: e.target.value})} /></FormField>
            <FormField label="Sex"><Select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})}><option value="">Select</option><option>Male</option><option>Female</option></Select></FormField>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Children (up to 5)</h4>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i}</span>
                  <Select className="flex-1"
                    value={form[`student_id${i}` as keyof typeof form] as string}
                    onChange={e => handleStudentSelect(i, e.target.value)}>
                    <option value="">Select Student {i}</option>
                    {students.map(s => <option key={s.student_id} value={s.student_id}>{s.firstname} {s.surname}</option>)}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <FormField label="Short Bio"><Textarea rows={2} value={form.short_bio} onChange={e => setForm({...form, short_bio: e.target.value})} /></FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Register Parent</Button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Parent Profile" size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <Avatar name={`${selected.fullname_first} ${selected.fullname_last}`} size="xl" />
              <div>
                <h3 className="text-xl font-bold">{selected.fullname_first} {selected.fullname_last}</h3>
                <p className="text-sm text-gray-500">{selected.parent_id}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Email', selected.email], ['Phone', selected.phone_no], ['Sex', selected.sex], ['Joined', formatDate(selected.created_at)]].map(([label, value]) => (
                <div key={label}>
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="font-medium text-gray-900">{value || '—'}</p>
                </div>
              ))}
            </div>
            {selected.no_of_students > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Children</p>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => {
                    const name = selected[`student${i}` as keyof Parent] as string;
                    if (!name) return null;
                    return (
                      <div key={i} className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg">
                        <Avatar name={name} size="sm" />
                        <span className="text-sm font-medium text-purple-900">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
