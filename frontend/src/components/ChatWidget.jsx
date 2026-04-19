import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { MessageSquare, Mic, MicOff, Send, Sparkles, X } from 'lucide-react';
import ActionDialog from './ActionDialog';
import { mcpUrl } from '../config/api';

const DEFAULT_POSITION = { x: 24, y: 24 };
const WIDGET_WIDTH = 384;
const WIDGET_HEIGHT = 544;
const BUTTON_WIDTH = 132;
const BUTTON_HEIGHT = 56;
const EDGE_PADDING = 12;

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export default function ChatWidget({ token, onTaskUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I can help you manage tasks, plans, reminders, and scheduling.' }
  ]);
  const [serverHistory, setServerHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [dialogState, setDialogState] = useState(null);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const widgetRef = useRef(null);
  const dragRef = useRef(null);
  const suppressLauncherClickRef = useRef(false);

  const showNotice = (variant, title, message, options = {}) => {
    setDialogState({
      variant,
      title,
      message,
      confirmLabel: options.confirmLabel || 'OK',
      autoCloseMs: options.autoCloseMs ?? 2200
    });
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const currentTranscript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += `${currentTranscript} `;
        } else {
          interimTranscript += currentTranscript;
        }
      }

      if (interimTranscript) setTranscript(interimTranscript);
      if (finalTranscript) {
        setInput((prev) => prev + finalTranscript);
        setTranscript('');
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'network') {
        showNotice('error', 'Voice input unavailable', 'Network error during voice recognition. Please try again.', { autoCloseMs: 3200 });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript('');
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && widgetRef.current && !widgetRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      const width = isOpen ? WIDGET_WIDTH : BUTTON_WIDTH;
      const height = isOpen ? WIDGET_HEIGHT : BUTTON_HEIGHT;
      setPosition((current) => ({
        x: clamp(current.x, EDGE_PADDING, window.innerWidth - width - EDGE_PADDING),
        y: clamp(current.y, EDGE_PADDING, window.innerHeight - height - EDGE_PADDING)
      }));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    stopListening();

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(mcpUrl('/chat'), {
        message: userMsg.text,
        history: serverHistory,
        localDate: new Date().toLocaleDateString('en-CA'),
        localTimeString: new Date().toLocaleTimeString('en-US'),
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const reply = res.data.reply || 'I completed the request, but the server did not send a text summary.';
      if (Array.isArray(res.data.history)) setServerHistory(res.data.history);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      if (onTaskUpdate) onTaskUpdate();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Error talking to AI.';
      setMessages((prev) => [...prev, { role: 'assistant', text: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const startDrag = (e) => {
    if (e.button !== undefined && e.button !== 0) return;

    const target = e.target;
    if (isOpen && target.closest('button, textarea, input, a')) return;

    const width = isOpen ? WIDGET_WIDTH : BUTTON_WIDTH;
    const height = isOpen ? WIDGET_HEIGHT : BUTTON_HEIGHT;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      width,
      height,
      moved: false
    };

    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const moveDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const nextX = drag.initialX - (e.clientX - drag.startX);
    const nextY = drag.initialY - (e.clientY - drag.startY);
    const clampedX = clamp(nextX, EDGE_PADDING, window.innerWidth - drag.width - EDGE_PADDING);
    const clampedY = clamp(nextY, EDGE_PADDING, window.innerHeight - drag.height - EDGE_PADDING);

    if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) {
      drag.moved = true;
    }

    setPosition({ x: clampedX, y: clampedY });
  };

  const endDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    e.currentTarget.releasePointerCapture?.(e.pointerId);
    suppressLauncherClickRef.current = !isOpen && drag.moved;
    dragRef.current = null;
    setDragging(false);
  };

  const handleLauncherClick = () => {
    if (suppressLauncherClickRef.current) {
      suppressLauncherClickRef.current = false;
      return;
    }
    setIsOpen(true);
  };

  return (
    <div
      className="fixed z-[3500]"
      ref={widgetRef}
      style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
    >
      {!isOpen && (
        <button
          onClick={handleLauncherClick}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`group relative touch-none overflow-hidden rounded-[24px] bg-slate-950 p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.32)] transition ${
            dragging ? 'cursor-grabbing' : 'cursor-grab hover:-translate-y-1'
          }`}
          title="Drag to move"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-aurora-500 via-primary-500 to-rosefire-500 opacity-90 transition group-hover:scale-110" />
          <div className="relative flex items-center gap-3">
            <MessageSquare size={22} />
            <span className="hidden text-sm font-semibold sm:block">Ask AI</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div className="flex h-[min(34rem,calc(100dvh-1rem))] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_35px_100px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:h-[34rem] sm:w-[24rem] sm:rounded-[30px]">
          <div
            className={`relative touch-none overflow-hidden border-b border-white/60 bg-slate-950 px-4 py-3.5 text-white ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            title="Drag to move"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-aurora-600 via-primary-500 to-rosefire-500 opacity-80" />
            <div className="relative flex items-center justify-between">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12">
                  <Sparkles size={17} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">AI Assistant</h3>
                  <p className="truncate text-[11px] text-white/65">Tasks, reminders, scheduling</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-2xl bg-white/10 p-2 transition hover:bg-white/15">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/40 px-3 py-3.5">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[86%] rounded-[22px] px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-950 text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)]'
                        : 'border border-white/70 bg-white/92 text-slate-700'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-[22px] border border-white/70 bg-white/92 px-3.5 py-2.5 text-xs font-medium text-slate-400 shadow-sm">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {transcript && (
              <div className="mx-3 mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700">
                Listening: {transcript}
              </div>
            )}

            <form onSubmit={sendMessage} className="shrink-0 border-t border-white/60 bg-white/72 px-3 py-3">
              <div className="rounded-[24px] border border-white/70 bg-white/85 p-2 shadow-sm">
                <div className="flex items-end gap-1.5">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder={isListening ? 'Listening...' : 'Ask AI to plan, schedule, update, or organize...'}
                    className="min-h-[42px] max-h-[104px] flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    style={{ lineHeight: '1.5' }}
                  />

                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                    className={`rounded-2xl p-2.5 transition ${
                      isListening ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button type="submit" disabled={loading} className="rounded-2xl bg-aurora-gradient p-2.5 text-white transition hover-glow disabled:opacity-60">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ActionDialog
        isOpen={!!dialogState}
        variant={dialogState?.variant}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        onClose={() => setDialogState(null)}
        autoCloseMs={dialogState?.autoCloseMs}
      />
    </div>
  );
}
