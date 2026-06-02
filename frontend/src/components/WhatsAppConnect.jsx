import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Copy, Loader, MessageCircle, Phone, Unlink } from 'lucide-react';
import { apiUrl } from '../config/api';

const WHATSAPP_DISPLAY_NUMBER = import.meta.env.VITE_WHATSAPP_DISPLAY_NUMBER || '+1 555 651 4257';

function buildWhatsAppInstruction(code) {
  return `LINK ${code}`;
}

export default function WhatsAppConnect({ token, onLinked }) {
  const [activeStep, setActiveStep] = useState(1);
  const [linkingCode, setLinkingCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState({ loading: true, linked: false, whatsapp: null });
  const wasLinkedRef = useRef(false);
  const hasLoadedStatusRef = useRef(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchStatus = async ({ silent = false } = {}) => {
    if (!silent) {
      setStatus((current) => ({ ...current, loading: true }));
    }

    try {
      const response = await axios.get(apiUrl('/whatsapp/status'), {
        headers: authHeaders
      });

      const isLinked = Boolean(response.data.linked);
      setStatus({
        loading: false,
        linked: isLinked,
        whatsapp: response.data.whatsapp || null
      });

      if (isLinked) {
        setActiveStep(1);
        setLinkingCode(null);
        if (hasLoadedStatusRef.current && !wasLinkedRef.current && onLinked) onLinked();
      }

      wasLinkedRef.current = isLinked;
      hasLoadedStatusRef.current = true;
    } catch (err) {
      setStatus((current) => ({ ...current, loading: false }));
      if (!silent) {
        setError(err.response?.data?.message || 'Failed to load WhatsApp status');
      }
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (activeStep !== 2 || status.linked) return undefined;

    const interval = setInterval(() => {
      fetchStatus({ silent: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeStep, status.linked]);

  const generateLinkingCode = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(apiUrl('/whatsapp/link-code'), {}, {
        headers: authHeaders
      });

      if (response.data.success) {
        setLinkingCode(response.data.linking_code);
        setMessage(response.data.message);
        setActiveStep(2);
      } else {
        setError(response.data.message || 'Failed to generate WhatsApp linking code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate WhatsApp linking code');
    } finally {
      setLoading(false);
    }
  };

  const unlinkWhatsApp = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.delete(apiUrl('/whatsapp/link'), {
        headers: authHeaders
      });

      setStatus({ loading: false, linked: false, whatsapp: null });
      wasLinkedRef.current = false;
      setActiveStep(1);
      setLinkingCode(null);
      setMessage(response.data.message || 'WhatsApp account disconnected.');
      if (onLinked) onLinked();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disconnect WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(buildWhatsAppInstruction(linkingCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
          <MessageCircle size={20} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">WhatsApp</h3>
          <p className="text-sm text-slate-500">Create tasks by sending messages to {WHATSAPP_DISPLAY_NUMBER}</p>
        </div>
      </div>

      {message && (
        <div className="mb-4 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
          <div className="text-sm text-emerald-700">{message}</div>
        </div>
      )}

      {error && (
        <div className="mb-4 flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-rose-600" />
          <div className="text-sm text-rose-700">{error}</div>
        </div>
      )}

      {status.loading && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <Loader size={16} className="animate-spin" />
          Checking WhatsApp connection...
        </div>
      )}

      {!status.loading && status.linked && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900">WhatsApp is linked</p>
                <p className="mt-1 text-sm text-emerald-700">
                  {status.whatsapp?.profile_name
                    ? `Connected as ${status.whatsapp.profile_name}`
                    : 'Your WhatsApp number is connected.'}
                </p>
                {status.whatsapp?.phone_number && (
                  <p className="mt-1 text-xs text-emerald-700">
                    Phone: +{status.whatsapp.phone_number}
                  </p>
                )}
                <p className="mt-1 text-xs text-emerald-700">
                  You can disconnect from here or send UNLINK on WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={unlinkWhatsApp}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Unlink size={18} />}
            Disconnect WhatsApp
          </button>
        </div>
      )}

      {!status.loading && !status.linked && activeStep === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Generate a temporary code, then send it from your WhatsApp number to link this account.
          </p>
          <button
            onClick={generateLinkingCode}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Phone size={18} />
                Generate WhatsApp Code
              </>
            )}
          </button>
        </div>
      )}

      {!status.loading && !status.linked && activeStep === 2 && linkingCode && (
        <div className="space-y-5">
          <div className="rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Your Linking Code</p>
            <div className="mb-3 flex items-center gap-2">
              <code className="flex-1 text-2xl font-bold tracking-widest text-emerald-600">
                {linkingCode}
              </code>
              <button
                onClick={copyToClipboard}
                className="flex-shrink-0 rounded-lg border border-emerald-100 bg-white px-3 py-2 font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
                title="Copy WhatsApp command"
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Code expires in <strong>30 minutes</strong>
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">How to connect:</p>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-600">
                  1
                </span>
                <span>Open WhatsApp and message your business/test number: <strong>{WHATSAPP_DISPLAY_NUMBER}</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-600">
                  2
                </span>
                <span>
                  Send: <code className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs">{buildWhatsAppInstruction(linkingCode)}</code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-600">
                  3
                </span>
                <span>WhatsApp will reply when your account is linked.</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <p className="mb-2 text-sm font-semibold text-teal-900">Once connected, you can:</p>
            <ul className="space-y-1 text-sm text-teal-800">
              <li>Send messages like <span className="font-mono text-xs">meeting tomorrow 5pm</span></li>
              <li>Use <span className="font-mono text-xs">HELP</span> to see WhatsApp commands</li>
              <li>Use <span className="font-mono text-xs">UNLINK</span> to disconnect from WhatsApp</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setActiveStep(1);
                setLinkingCode(null);
                setMessage('');
              }}
              className="flex-1 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              Generate New Code
            </button>
            <button
              onClick={copyToClipboard}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-emerald-700"
            >
              {copied ? 'Copied' : 'Copy Command'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
