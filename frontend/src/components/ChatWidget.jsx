import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send } from 'lucide-react';

export default function ChatWidget({ token, onTaskUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I can help you manage your tasks. Try "Add task to buy milk".' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Connects to MCP via Proxy if configured, or direct URL?
      // Frontend Vite proxy maps /api -> Backend 3000.
      // But MCP is on 4000. 
      // Option A: Backend proxies to MCP.
      // Option B: Frontend proxies /mcp -> 4000.
      // Let's assume we update vite.config.js to allow /mcp proxy.
      // Prepare history for OpenAI (map 'text' to 'content')
      // and exclude the current message from history to avoid duplication if backend appends it, 
      // but here we are stateless, so we send EVERYTHING including the new user message.
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.text
      }));

      const res = await axios.post('http://localhost:4000/mcp/chat', { 
        message: userMsg.text,
        history 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const reply = res.data.reply;
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      
      // If tool was executed (indicated by reply content or side effect), refresh tasks.
      // Ideally backend returns structured data, but for our Mock AI, let's just refresh.
      if (onTaskUpdate) onTaskUpdate();

    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error talking to AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button 
            onClick={() => setIsOpen(true)}
            className="p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200">
          <div className="p-4 bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold">AI Assistant</h3>
            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                  msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-gray-400 text-xs animate-pulse">Thinking...</div>}
          </div>

          <form onSubmit={sendMessage} className="p-2 border-t flex space-x-2">
            <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button type="submit" disabled={loading} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
