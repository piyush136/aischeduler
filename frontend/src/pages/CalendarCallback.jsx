import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../config/api';

export default function CalendarCallback({ setAuth }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Connecting to Google Calendar...');
  const [error, setError] = useState(null);
  const code = searchParams.get('code');
  const token = localStorage.getItem('token');

  const hasCalled = useRef(false);

  useEffect(() => {
    async function connect() {
      if (hasCalled.current) return;
      hasCalled.current = true;

      if (!code) {
        setError('No authorization code received from Google');
        setTimeout(() => navigate('/'), 3000);
        return;
      }
      
      if (!token) {
        setError('You must be logged in to connect Google Calendar');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        setStatus('Exchanging authorization code...');
        const response = await axios.post(apiUrl('/calendar/connect'), { code }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStatus('✓ Google Calendar Connected Successfully!');
        console.log('Connection response:', response.data);
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } catch (err) {
        console.error('Calendar connection error:', err);
        setError(err.response?.data?.error || err.message || 'Failed to connect Google Calendar');
        setTimeout(() => navigate('/'), 3000);
      }
    }
    connect();
  }, [code, token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Connection Failed</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-slate-500 text-sm">Redirecting back...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {status.includes('✓') ? (
                <span className="text-3xl">✓</span>
              ) : (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {status.includes('✓') ? 'Success!' : 'Connecting...'}
            </h2>
            <p className="text-slate-600">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
