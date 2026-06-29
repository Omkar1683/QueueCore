import { useState } from 'react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useCreateJob } from '../../api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const JOB_TYPES = ['EmailJob','ImageProcessingJob','PDFGenerationJob','NotificationJob','DataSyncJob','ReportGenerationJob','WebhookJob'];
const DEFAULT_PAYLOADS = {
  EmailJob: '{"to":"user@example.com","subject":"Hello","failureRate":0.1}',
  ImageProcessingJob: '{"imageUrl":"https://example.com/img.jpg","width":800,"height":600,"failureRate":0.08}',
  PDFGenerationJob: '{"template":"invoice","failureRate":0.05}',
  NotificationJob: '{"channel":"push","userId":"user_123","title":"Notification","failureRate":0.07}',
  DataSyncJob: '{"source":"crm","destination":"datawarehouse","recordCount":1000,"failureRate":0.12}',
  ReportGenerationJob: '{"reportType":"monthly_sales","failureRate":0.06}',
  WebhookJob: '{"url":"https://webhook.example.com/recv","failureRate":0.15}',
};

export default function CreateJobModal({ isOpen, onClose }) {
  const qc = useQueryClient();
  const createJob = useCreateJob();
  const [form, setForm] = useState({
    jobType: 'EmailJob', payload: DEFAULT_PAYLOADS.EmailJob,
    priority: 'medium', maxAttempts: 3, delay: 0, scheduledAt: '',
  });
  const [payloadError, setPayloadError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleJobTypeChange = (type) => {
    set('jobType', type);
    set('payload', DEFAULT_PAYLOADS[type] || '{}');
  };

  const validatePayload = () => {
    try { JSON.parse(form.payload); setPayloadError(''); return true; }
    catch { setPayloadError('Invalid JSON'); return false; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePayload()) return;
    try {
      await createJob.mutateAsync({
        jobType: form.jobType,
        payload: JSON.parse(form.payload),
        priority: form.priority,
        maxAttempts: Number(form.maxAttempts),
        delay: Number(form.delay),
        scheduledAt: form.scheduledAt || undefined,
      });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(`${form.jobType} created successfully!`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create job');
    }
  };

  const inputCls = "w-full bg-dark-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Job" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Job Type *</label>
            <select value={form.jobType} onChange={e => handleJobTypeChange(e.target.value)} className={inputCls}>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Max Attempts</label>
            <input type="number" min={1} max={10} value={form.maxAttempts}
              onChange={e => set('maxAttempts', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Delay (seconds)</label>
            <input type="number" min={0} value={form.delay}
              onChange={e => set('delay', e.target.value)} className={inputCls} placeholder="0 = immediate" />
          </div>
          <div>
            <label className={labelCls}>Schedule At (optional)</label>
            <input type="datetime-local" value={form.scheduledAt}
              onChange={e => set('scheduledAt', e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Payload (JSON)</label>
            <textarea rows={5} value={form.payload} onBlur={validatePayload}
              onChange={e => set('payload', e.target.value)}
              className={`${inputCls} font-mono text-xs resize-none ${payloadError ? 'border-red-500' : ''}`} />
            {payloadError && <p className="text-xs text-red-400 mt-1">{payloadError}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={createJob.isPending} className="btn-primary">
            {createJob.isPending ? <><Spinner size={14} /> Creating...</> : 'Create Job'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
