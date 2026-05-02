'use client';
import { useEffect, useState, useCallback } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import { Eye, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SentMessage {
  record_id: number;
  msg_type: string;
  message_date: string;
  message_time: string;
  subject: string;
  status: string;
  recipient_name: string;
  body: string;
}

interface SentViewProps {
  userId: string;
  userRole: string;
}

export default function SentView({ userId, userRole }: SentViewProps) {
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<SentMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting]       = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/sent?user_id=${userId}&role=${userRole}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { toast.error('Failed to load sent messages'); }
    setLoading(false);
  }, [userId, userRole]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const allIds = messages.map(m => m.record_id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const items = messages
        .filter(m => selectedIds.has(m.record_id))
        .map(m => ({ id: m.record_id, msg_type: m.msg_type }));
      const res = await fetch('/api/messages/sent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${items.length} message${items.length > 1 ? 's' : ''} deleted`);
      setSelectedIds(new Set());
      fetchMessages();
    } catch { toast.error('Failed to delete messages'); }
    setDeleting(false);
  };

  const columns = [
    { key: 'message_date', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v as string) },
    { key: 'message_time', label: 'Time', render: (v: unknown) => formatTime(v as string) },
    { key: 'recipient_name', label: 'To', sortable: true, render: (v: unknown) => (
      <span className="font-medium text-gray-800">{v as string}</span>
    )},
    { key: 'subject', label: 'Subject', render: (v: unknown) => (
      <span className="font-medium text-gray-900 truncate max-w-[200px] block">{v as string}</span>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : `Delete (${selectedIds.size})`}
          </button>
          <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
        </div>
      )}

      <DataTable
        data={messages}
        columns={[
          {
            key: '_select',
            label: (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            ) as unknown as string,
            render: (_v: unknown, row: SentMessage) => (
              <input
                type="checkbox"
                checked={selectedIds.has(row.record_id)}
                onChange={() => toggleSelect(row.record_id)}
                onClick={e => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            ),
          },
          ...columns,
        ]}
        loading={loading}
        searchKeys={['subject', 'recipient_name']}
        emptyMessage="No sent messages"
        actions={(row) => (
          <button
            onClick={() => { setSelected(row); setViewOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-blue-600 text-sm font-medium transition-colors"
          >
            <Eye size={14} />
            View
          </button>
        )}
      />

      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Sent Message" size="lg">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-900 text-base">{selected.subject}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-gray-400">To:</span> <span className="text-gray-800 font-medium capitalize">{selected.recipient_name}</span></div>
                <div><span className="text-gray-400">Date:</span> <span className="text-gray-700">{formatDate(selected.message_date)}</span></div>
                {selected.message_time && (
                  <div><span className="text-gray-400">Time:</span> <span className="text-gray-700">{formatTime(selected.message_time)}</span></div>
                )}
                <div>
                  <span className="text-gray-400">Sent to:</span>{' '}
                  <span className="capitalize text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{selected.msg_type}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{selected.body}</p>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setViewOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

interface SentMessage {
  record_id: number;
  msg_type: string;
  message_date: string;
  message_time: string;
  subject: string;
  status: string;
  recipient_name: string;
  body: string;
}

interface SentViewProps {
  userId: string;
  userRole: string;
}
