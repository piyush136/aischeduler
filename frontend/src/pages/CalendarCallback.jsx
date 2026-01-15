import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CalendarCallback({ setAuth }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  const token = localStorage.getItem('token');

  useEffect(() => {
    async function connect() {
      if (!code || !token) return;
      try {
        await axios.post('/api/calendar/connect', { code }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Google Calendar Connected Successfully!');
        navigate('/');
      } catch (err) {
        console.error(err);
        alert('Failed to connect Google Calendar.');
        navigate('/');
      }
    }
    connect();
  }, [code, token, navigate]);

  return <div className="p-10 text-center">Connecting to Google Calendar...</div>;
}
