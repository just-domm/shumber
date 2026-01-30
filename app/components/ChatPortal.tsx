'use client';
import React, { useState } from 'react';
import { User, CropInventory, Message } from '@/types';

interface ChatPortalProps {
  currentUser: User;
  connectedWith: CropInventory;
  onConfirmQuality: () => void;
}

const ChatPortal: React.FC<ChatPortalProps> = ({ currentUser, connectedWith, onConfirmQuality }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', senderId: 'system', text: `Connection established with ${connectedWith.farmerName}`, timestamp: new Date().toISOString() },
    { id: '2', senderId: connectedWith.farmerId, text: `Hello! I have the ${connectedWith.cropName} ready for collection at Njoro hub.`, timestamp: new Date().toISOString() }
  ]);
  const [inputText, setInputText] = useState('');

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text: inputText,
      timestamp: new Date().toISOString()
    };
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-2xl mx-auto bg-white uber-shadow rounded-2xl overflow-hidden mt-4 animate-fadeIn">
      <div className="bg-black text-white p-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-green-800 flex items-center justify-center font-bold">
            {connectedWith.farmerName[0]}
          </div>
          <div>
            <h3 className="font-bold">{connectedWith.farmerName}</h3>
            <p className="text-xs text-gray-400">Verified Farmer</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Escrow Total</p>
          <p className="font-bold text-green-400 text-lg">KES {connectedWith.currentBid * connectedWith.quantity}</p>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.senderId === 'system' ? 'bg-gray-200 text-gray-500 text-center mx-auto text-xs font-bold px-4 py-1' :
              msg.senderId === currentUser.id ? 'bg-black text-white rounded-tr-none' : 'bg-white text-black border border-gray-200 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-4 bg-white">
        <div className="flex space-x-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Discuss collection time or logistics..."
            className="flex-1 bg-gray-100 p-3 rounded-full outline-none text-sm focus:ring-2 focus:ring-black"
          />
          <button onClick={sendMessage} className="bg-black text-white p-3 rounded-full hover:scale-105 transition-transform">
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
