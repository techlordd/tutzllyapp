'use client';
import { useEffect, useState, useCallback } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import { Eye } from 'lucide-react';
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
      <DataTable
        data={messages}
        columns={columns}
        loading={loading}
        searchKeys={['subject', 'recipient_name']}
        emptyMessage="No sent messages"
        actions={(row) => (
          <button
            onClick={() => { setSelected(row); setViewOpen(true); }}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
          >
            <Eye size={15} />
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
