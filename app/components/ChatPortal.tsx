'use client';
import React, { useEffect, useRef, useState } from 'react';
import { fetchMessages, sendMessage } from '@/services/api';
import { User, CropInventory, Message } from '@/app/types/types';

interface ChatPortalProps {
  currentUser: User;
  connectedWith: CropInventory;
  authToken: string;
  requestedQuantity?: number;
  onConfirmQuality: () => void;
}

const ChatPortal: React.FC<ChatPortalProps> = ({ currentUser, connectedWith, authToken, requestedQuantity, onConfirmQuality }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const toast = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('shumber-toast', { detail: { message, tone } }));
  };

  useEffect(() => {
    const loadMessages = async () => {
      setLoadError(null);
      try {
        const data = await fetchMessages(connectedWith.id, authToken);
        if (data.length === 0) {
          setMessages([
            {
              id: 'system',
              senderId: 'system',
              text: `Connection established with ${connectedWith.farmerName}`,
              timestamp: new Date().toISOString()
            }
          ]);
        } else {
          setMessages(data);
          const latest = data[data.length - 1];
          if (latest?.timestamp) {
            localStorage.setItem(`shumber_last_seen_${connectedWith.id}`, latest.timestamp);
          }
        }
      } catch (error) {
        console.error('Failed to load messages', error);
        setLoadError('Could not load messages.');
        setMessages([
          {
            id: 'system',
            senderId: 'system',
            text: `Connection established with ${connectedWith.farmerName}`,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    };

    if (authToken) {
      loadMessages();
    }
  }, [authToken, connectedWith]);

  useEffect(() => {
    if (!authToken) return;
    const poll = async () => {
      try {
        const data = await fetchMessages(connectedWith.id, authToken);
        if (data.length > 0) {
          setMessages(data);
          const latest = data[data.length - 1];
          if (latest?.timestamp) {
            localStorage.setItem(`shumber_last_seen_${connectedWith.id}`, latest.timestamp);
          }
        }
      } catch (error) {
        console.error('Chat poll failed', error);
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 3000);
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, [authToken, connectedWith.id]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    if (!authToken) {
      toast('Please log in to send messages.', 'error');
      return;
    }
    try {
      const newMessage = await sendMessage(connectedWith.id, authToken, inputText.trim());
      setMessages((prev) => [...prev, newMessage]);
      setInputText('');
    } catch (error) {
      console.error('Failed to send message', error);
      toast('Message failed to send. Please retry.', 'error');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-140px)] max-w-2xl mx-4 sm:mx-auto bg-white uber-shadow rounded-2xl overflow-hidden mt-4 animate-fadeIn">
      <div className="bg-black text-white p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-green-800 flex items-center justify-center font-bold">
            {connectedWith.farmerName[0]}
          </div>
          <div>
            <h3 className="font-bold">{connectedWith.farmerName}</h3>
            <p className="text-xs text-gray-400">Verified Farmer</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Escrow Total</p>
          <p className="font-bold text-green-400 text-lg">
            KES {connectedWith.currentBid * (requestedQuantity || connectedWith.quantity)}
          </p>
          {requestedQuantity ? (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Requested: {requestedQuantity} Kg
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50">
        {loadError && (
          <div className="bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest rounded-full px-4 py-2 mx-auto">
            {loadError}
          </div>
        )}
        {messages.map(msg => {
          const isSystem = msg.senderId === 'system';
          const isSelf = msg.senderId === currentUser.id;
          const displayName = isSystem
            ? 'System'
            : msg.senderName || (isSelf ? currentUser.name : connectedWith.farmerName);
          return (
            <div key={msg.id} className={`flex ${isSystem ? 'justify-center' : isSelf ? 'justify-end' : 'justify-start'}`}>
              {!isSystem && !isSelf && (
                <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-black mr-2">
                  {displayName?.[0] || 'U'}
                </div>
              )}
              <div
                className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                  isSystem
                    ? 'bg-gray-200 text-gray-500 text-center mx-auto text-xs font-bold px-4 py-1'
                    : isSelf
                    ? 'bg-black text-white rounded-tr-none shadow-sm'
                    : 'bg-white text-black border border-gray-200 rounded-tl-none shadow-sm'
                }`}
              >
                {!isSystem && (
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isSelf ? 'text-gray-300' : 'text-gray-400'}`}>
                    {displayName}
                  </div>
                )}
                {msg.text}
              </div>
              {!isSystem && isSelf && (
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-black ml-2">
                  {currentUser.name?.[0] || 'U'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-4 bg-white">
        <div className="flex space-x-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Discuss collection time or logistics..."
            className="flex-1 bg-gray-100 p-3 rounded-full outline-none text-sm focus:ring-2 focus:ring-black"
          />
          <button onClick={handleSendMessage} className="bg-black text-white p-3 rounded-full hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
        
        <button 
          onClick={onConfirmQuality}
          className="w-full bg-green-700 text-white font-black py-4 rounded-xl hover:bg-green-800 transition-all uppercase tracking-widest text-sm flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Begin Quality Inspection</span>
        </button>
      </div>
    </div>
  );
};

export default ChatPortal;
