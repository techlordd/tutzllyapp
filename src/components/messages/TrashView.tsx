'use client';
import { useEffect, useState, useCallback } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Eye, RotateCcw, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TrashMessage {
  record_id: number;
  msg_type: string;
  message_date: string;
  message_time: string;
  subject: string;
  status: string;
  body: string;
  deleted_at: string | null;
  direction: 'sent' | 'received';
  other_party: string;
}

interface TrashViewProps {
  userId: string;
  userRole: string;
}

const TYPE_COLORS: Record<string, string> = {
  admin:   'bg-purple-100 text-purple-700',
  tutor:   'bg-blue-100   text-blue-700',
  student: 'bg-green-100  text-green-700',
  parent:  'bg-amber-100  text-amber-700',
};

export default function TrashView({ userId, userRole }: TrashViewProps) {
  const [messages, setMessages] = useState<TrashMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<TrashMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [acting, setActing] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/trash?user_id=${encodeURIComponent(userId)}&role=${userRole}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { toast.error('Failed to load trash'); }
    setLoading(false);
  }, [userId, userRole]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const allIds    = messages.map(m => m.record_id);
  const allChecked = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const buildItems = () =>
    messages
      .filter(m => selectedIds.has(m.record_id))
      .map(m => ({ id: m.record_id, msg_type: m.msg_type }));

  const handleRestore = async () => {
    if (selectedIds.size === 0) return;
    setActing(true);
    try {
      const res = await fetch('/api/messages/trash', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: buildItems() }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Restored ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      await fetchMessages();
    } catch { toast.error('Restore failed'); }
    setActing(false);
  };

  const handleDeleteForever = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Permanently delete ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setActing(true);
    try {
      const res = await fetch('/api/messages/trash', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: buildItems() }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Permanently deleted ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      await fetchMessages();
    } catch { toast.error('Delete failed'); }
    setActing(false);
  };

  const checkbox = (id?: number) => {
    if (id === undefined) {
      // Header checkbox
      return (
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      );
    }
    return (
      <input
        type="checkbox"
        checked={selectedIds.has(id)}
        onChange={() => toggleSelect(id)}
        onClick={e => e.stopPropagation()}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
    );
  };

  const columns = [
    {
      key: '_select',
      label: checkbox() as unknown as string,
      render: (_: unknown, row: TrashMessage) => checkbox(row.record_id),
    },
    { key: 'message_date', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v as string) },
    { key: 'message_time', label: 'Time', render: (v: unknown) => formatTime(v as string) },
    {
      key: 'direction',
      label: 'Dir.',
      render: (v: unknown) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v === 'sent' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
          {v as string}
        </span>
      ),
    },
    {
      key: 'other_party',
      label: 'Contact',
      sortable: true,
      render: (v: unknown) => <span className="font-medium text-gray-800">{v as string}</span>,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (v: unknown) => <span className="text-gray-900 truncate max-w-[200px] block">{v as string}</span>,
    },
    {
      key: 'msg_type',
      label: 'Type',
      render: (v: unknown) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[v as string] ?? 'bg-gray-100 text-gray-600'}`}>
          {v as string}
        </span>
      ),
    },
    {
      key: 'deleted_at',
      label: 'Deleted',
      render: (v: unknown) => v ? <span className="text-xs text-gray-400">{formatDate(v as string)}</span> : <span className="text-xs text-gray-300">—</span>,
    },
  ];

  return (
    <>
      {/* Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
          <span className="text-sm text-blue-700 font-medium mr-2">{selectedIds.size} selected</span>
          <Button
            variant="secondary"
            onClick={handleRestore}
            disabled={acting}
            className="flex items-center gap-1.5 text-sm py-1.5 px-3 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <RotateCcw size={13} /> Restore ({selectedIds.size})
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteForever}
            disabled={acting}
            className="flex items-center gap-1.5 text-sm py-1.5 px-3"
          >
            <Trash2 size={13} /> Delete Forever ({selectedIds.size})
          </Button>
        </div>
      )}

      <DataTable
        data={messages}
        columns={columns}
        loading={loading}
        searchKeys={['subject', 'other_party']}
        emptyMessage="Trash is empty"
        actions={(row) => (
          <button
            onClick={() => { setSelected(row); setViewOpen(true); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Eye size={15} />
          </button>
        )}
      />

      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Deleted Message" size="lg">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-900 text-base">{selected.subject}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div>
                  <span className="text-gray-400">{selected.direction === 'sent' ? 'To:' : 'From:'}</span>{' '}
                  <span className="text-gray-800 font-medium">{selected.other_party}</span>
                </div>
                <div><span className="text-gray-400">Date:</span> <span className="text-gray-700">{formatDate(selected.message_date)}</span></div>
                {selected.message_time && (
                  <div><span className="text-gray-400">Time:</span> <span className="text-gray-700">{formatTime(selected.message_time)}</span></div>
                )}
                <div>
                  <span className="text-gray-400">Type:</span>{' '}
                  <span className={`capitalize text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[selected.msg_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {selected.msg_type}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{selected.body}</p>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    setViewOpen(false);
                    setSelectedIds(new Set([selected.record_id]));
                    await handleRestore();
                  }}
                  className="flex items-center gap-1.5 text-sm border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <RotateCcw size={13} /> Restore
                </Button>
              </div>
              <Button variant="secondary" onClick={() => setViewOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
