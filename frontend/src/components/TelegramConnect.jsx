import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { MessageCircle, Copy, CheckCircle, AlertCircle, Loader, Unlink } from 'lucide-react';
import { apiUrl } from '../config/api';

const TELEGRAM_BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'ai_task_manager_bot').replace(/^@/, '');

export default function TelegramConnect({ token, onLinked }) {
  const [activeStep, setActiveStep] = useState(1); // 1: Generate code, 2: Link instructions
  const [linkingCode, setLinkingCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState({ loading: true, linked: false, telegram: null });
  const wasLinkedRef = useRef(false);
  const hasLoadedStatusRef = useRef(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchStatus = async ({ silent = false } = {}) => {
    if (!silent) {
      setStatus((current) => ({ ...current, loading: true }));
    }

    try {
      const response = await axios.get(apiUrl('/telegram/status'), {
        headers: authHeaders
      });
      const isLinked = Boolean(response.data.linked);
      setStatus({
        loading: false,
        linked: isLinked,
        telegram: response.data.telegram || null
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
        setError(err.response?.data?.message || 'Failed to load Telegram status');
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
      const response = await axios.post(apiUrl('/telegram/link-code'), {}, {
        headers: authHeaders
      });

      if (response.data.success) {
        setLinkingCode(response.data.linking_code);
        setMessage(response.data.message);
        setActiveStep(2);
      } else {
        setError(response.data.message || 'Failed to generate linking code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate linking code');
    } finally {
      setLoading(false);
    }
  };

  const unlinkTelegram = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.delete(apiUrl('/telegram/link'), {
        headers: authHeaders
      });

      setStatus({ loading: false, linked: false, telegram: null });
      wasLinkedRef.current = false;
      setActiveStep(1);
      setLinkingCode(null);
      setMessage(response.data.message || 'Telegram account disconnected.');
      if (onLinked) onLinked();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disconnect Telegram');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(linkingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
          <MessageCircle size={20} className="text-sky-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Telegram Bot</h3>
          <p className="text-sm text-slate-500">Create tasks by sending messages to @{TELEGRAM_BOT_USERNAME}</p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-4 flex gap-3 rounded-lg bg-emerald-50 p-3 border border-emerald-200">
          <CheckCircle size={18} className="flex-shrink-0 text-emerald-600 mt-0.5" />
          <div className="text-sm text-emerald-700">{message}</div>
        </div>
      )}

      {error && (
        <div className="mb-4 flex gap-3 rounded-lg bg-rose-50 p-3 border border-rose-200">
          <AlertCircle size={18} className="flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="text-sm text-rose-700">{error}</div>
        </div>
      )}

      {status.loading && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <Loader size={16} className="animate-spin" />
          Checking Telegram connection...
        </div>
      )}

      {!status.loading && status.linked && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900">Telegram is linked</p>
                <p className="mt-1 text-sm text-emerald-700">
                  {status.telegram?.telegram_username
                    ? `Connected as @${status.telegram.telegram_username}`
                    : 'Your Telegram account is connected.'}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  You can disconnect from here or send /unlink to @{TELEGRAM_BOT_USERNAME}.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={unlinkTelegram}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Unlink size={18} />}
            Disconnect Telegram
          </button>
        </div>
      )}

      {/* Step 1: Generate Code */}
      {!status.loading && !status.linked && activeStep === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Click the button below to generate a unique linking code. You'll use this code to connect your Telegram account.
          </p>
          <button
            onClick={generateLinkingCode}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-sky-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <MessageCircle size={18} />
                Generate Linking Code
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Link Instructions */}
      {!status.loading && !status.linked && activeStep === 2 && linkingCode && (
        <div className="space-y-5">
          {/* Code Box */}
          <div className="rounded-lg bg-gradient-to-r from-sky-50 to-blue-50 p-4 border border-sky-100">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Your Linking Code</p>
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 text-2xl font-bold text-sky-600 tracking-widest">
                {linkingCode}
              </code>
              <button
                onClick={copyToClipboard}
                className="flex-shrink-0 rounded-lg bg-white px-3 py-2 font-medium text-sky-600 transition-colors hover:bg-sky-50 border border-sky-100"
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              ⏰ Code expires in <strong>30 minutes</strong>
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-sm font-semibold text-slate-900 mb-3">How to connect:</p>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-600">
                  1
                </span>
                <span>Open Telegram and search for: <strong>@{TELEGRAM_BOT_USERNAME}</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-600">
                  2
                </span>
                <span>Send the command: <code className="bg-white px-2 py-1 rounded text-xs font-mono border border-slate-200">/link {linkingCode}</code></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-600">
                  3
                </span>
                <span>The bot will confirm when your account is linked! ✅</span>
              </li>
            </ol>
          </div>

          {/* What You Can Do */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">💡 Once connected, you can:</p>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>📝 Send messages to create tasks: <span className="font-mono text-xs">"meeting tomorrow 5pm"</span></li>
              <li>📋 View your tasks: Send <span className="font-mono text-xs">/tasks</span></li>
              <li>🤖 Chat naturally to manage your schedule</li>
            </ul>
          </div>

          {/* Action Buttons */}
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
              onClick={() => {
                window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}`, '_blank');
              }}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition-colors hover:bg-sky-700"
            >
              Open Telegram Bot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
