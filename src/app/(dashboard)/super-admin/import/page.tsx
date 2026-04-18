'use client';
import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, ChevronDown, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const ENTITY_OPTIONS: { value: string; label: string; group: string }[] = [
  { value: 'tutors',           label: 'Tutors',                    group: 'People'   },
  { value: 'students',         label: 'Students',                  group: 'People'   },
  { value: 'parents',          label: 'Parents',                   group: 'People'   },
  { value: 'courses',          label: 'Courses',                   group: 'Academic' },
  { value: 'assignments',      label: 'Tutor Course Assignments',  group: 'Academic' },
  { value: 'enrollments',      label: 'Student Enrollments',       group: 'Academic' },
  { value: 'schedules',        label: 'Schedules',                 group: 'Sessions' },
  { value: 'sessions',         label: 'Sessions',                  group: 'Sessions' },
  { value: 'activities',       label: 'Class Activities',          group: 'Sessions' },
  { value: 'grades',           label: 'Grade Book',                group: 'Academic' },
  { value: 'messages_admin',   label: 'Messages (Admin)',          group: 'Messages' },
  { value: 'messages_parent',  label: 'Messages (Parent)',         group: 'Messages' },
  { value: 'messages_student', label: 'Messages (Student)',        group: 'Messages' },
  { value: 'messages_tutor',   label: 'Messages (Tutor)',          group: 'Messages' },
];

interface Academy {
  id: number;
  academy_id: string;
  academy_name: string;
  is_active: boolean;
}

interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
  log?: string[];
  total: number;
  defaultPassword?: string;
}

export default function SuperAdminImportPage() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [academiesLoading, setAcademiesLoading] = useState(true);
  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showLog, setShowLog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/super-admin/academies')
      .then(r => r.json())
      .then(d => { setAcademies(d.academies || []); })
      .catch(() => toast.error('Failed to load academies'))
      .finally(() => setAcademiesLoading(false));
  }, []);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) { toast.error('Only .csv files are accepted'); return; }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcademyId) { toast.error('Select an academy'); return; }
    if (!entityType) { toast.error('Select an entity type'); return; }
    if (!file) { toast.error('Select a CSV file'); return; }
    setLoading(true); setResult(null); setShowLog(false);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.replace(/\r$/, ''));
      const header = lines[0];
      const dataLines = lines.slice(1).filter(l => l.trim() !== '');

      const CHUNK_SIZE = 500;
      const chunks: string[][] = [];
      for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
        chunks.push(dataLines.slice(i, i + CHUNK_SIZE));
      }
      if (chunks.length === 0) { toast.error('CSV file is empty'); return; }

      const aggregated: ImportResult = { inserted: 0, skipped: 0, errors: [], log: [], total: 0 };

      for (let i = 0; i < chunks.length; i++) {
        setProgress(`Sending batch ${i + 1} of ${chunks.length}…`);
        const chunkCsv = [header, ...chunks[i]].join('\n');
        const blob = new Blob([chunkCsv], { type: 'text/csv' });
        const form = new FormData();
        form.append('type', entityType);
        form.append('file', blob, file.name);
        form.append('academy_id', selectedAcademyId);

        const res = await fetch('/api/super-admin/import', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || 'Import failed'); return; }

        aggregated.inserted += data.inserted;
        aggregated.skipped += data.skipped;
        aggregated.errors.push(...(data.errors ?? []));
        aggregated.total += data.total;
        if (data.log) aggregated.log!.push(...data.log);
        if (data.defaultPassword) aggregated.defaultPassword = data.defaultPassword;
      }

      setResult(aggregated);
      if (aggregated.inserted > 0) toast.success(`${aggregated.inserted} record${aggregated.inserted !== 1 ? 's' : ''} imported`);
      else if (aggregated.errors.length === 0) toast.success('Import complete — all records already existed');
    } catch { toast.error('Network error during import'); }
    finally { setLoading(false); setProgress(''); }
  };

  const selectedAcademy = academies.find(a => String(a.id) === selectedAcademyId);
  const entityLabel = ENTITY_OPTIONS.find(o => o.value === entityType)?.label ?? '';

  return (
    <DashboardLayout title="Import CSV">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Upload size={22} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Super Admin — CSV Import</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select an academy, choose an entity type, and upload a Formidable Forms CSV export.
                Existing records are skipped (idempotent). New user accounts are created with default password{' '}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Tutzlly@123</code>.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Academy <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={selectedAcademyId}
                onChange={e => { setSelectedAcademyId(e.target.value); setResult(null); }}
                required
                disabled={academiesLoading}
                className="w-full pl-9 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:opacity-50"
              >
                <option value="">{academiesLoading ? 'Loading academies…' : 'Select academy…'}</option>
                {academies.map(a => (
                  <option key={a.id} value={String(a.id)}>{a.academy_name} ({a.academy_id})</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {selectedAcademy && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block" />
                Importing into: <strong>{selectedAcademy.academy_name}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={entityType}
                onChange={e => { setEntityType(e.target.value); setResult(null); setShowLog(false); }}
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent pr-10"
              >
                <option value="">Select entity type…</option>
                {['People', 'Academic', 'Sessions', 'Messages'].map(group => (
                  <optgroup key={group} label={group}>
                    {ENTITY_OPTIONS.filter(o => o.group === group).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File <span className="text-red-500">*</span>
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                dragging ? 'border-amber-400 bg-amber-50' :
                file ? 'border-green-400 bg-green-50' :
                'border-gray-200 bg-gray-50 hover:border-amber-300 hover:bg-amber-50/50'
              )}
            >
              {file ? (
                <>
                  <FileText size={28} className="text-green-500" />
                  <div className="text-center">
                    <p className="font-medium text-green-700 text-sm">{file.name}</p>
                    <p className="text-xs text-green-600 mt-0.5">{(file.size / 1024).toFixed(1)} KB — click to replace</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={28} className={dragging ? 'text-amber-500' : 'text-gray-400'} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Drop your CSV here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-0.5">.csv files only</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          <Button type="submit" disabled={loading || !selectedAcademyId || !entityType || !file} className="w-full">
            {loading
              ? (progress || 'Importing…')
              : `Import${entityLabel ? ` ${entityLabel}` : ''}${selectedAcademy ? ` → ${selectedAcademy.academy_name}` : ''}`}
          </Button>
        </form>

        {result && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Import Results</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.inserted}</p>
                <p className="text-xs text-green-600 mt-1">Inserted</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                <p className="text-xs text-amber-600 mt-1">Skipped</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                <p className="text-xs text-red-600 mt-1">Errors</p>
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl text-sm',
              result.errors.length === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            )}>
              {result.errors.length === 0
                ? <><CheckCircle size={16} /> {result.inserted} of {result.total} records imported successfully.</>
                : <><AlertCircle size={16} /> {result.inserted} inserted, {result.errors.length} row error{result.errors.length !== 1 ? 's' : ''}. Successful rows were committed.</>}
            </div>
            {result.defaultPassword && result.inserted > 0 && (
              <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Login accounts created with default password:{' '}
                  <code className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">{result.defaultPassword}</code>
                </span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Row Errors</p>
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <XCircle size={12} className="shrink-0 mt-0.5" />
                    <span className="font-mono">{err}</span>
                  </div>
                ))}
              </div>
            )}
            {result.log && result.log.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowLog(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ChevronDown size={13} className={cn('transition-transform', showLog && 'rotate-180')} />
                    Debug Log ({result.log.length} lines)
                  </button>
                  {showLog && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(result.log!.join('\n'))}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      Copy
                    </button>
                  )}
                </div>
                {showLog && (
                  <pre className="text-xs font-mono bg-gray-950 rounded-xl p-4 max-h-96 overflow-auto leading-relaxed">
                    {result.log.map((line, i) => {
                      const color =
                        line.startsWith('[OK]')   ? 'text-green-400' :
                        line.startsWith('[SKIP]') ? 'text-amber-300' :
                        line.startsWith('[ERR]')  ? 'text-red-400'   :
                        line.startsWith('[WARN]') ? 'text-yellow-300' : 'text-gray-400';
                      return <span key={i} className={`block ${color}`}>{line}</span>;
                    })}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
