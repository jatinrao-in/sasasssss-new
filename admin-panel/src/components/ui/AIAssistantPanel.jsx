import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Maximize2, Minimize2, Command } from 'lucide-react';
import { useAIManager } from '../../hooks/useAIManager';
import { useAIContext } from '../../context/AIContext';
import { analyzeActionIntent } from '../../lib/gemini';
import { useNavigate } from 'react-router-dom';

export default function AIAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your Gemini AI Assistant. I can help you summarize data, draft emails, or navigate the CRM. How can I help?" }
  ]);
  const messagesEndRef = useRef(null);
  
  const { askAssistant, isProcessing, clearChatMemory } = useAIManager();
  const { pageContext, dispatchIntent } = useAIContext();
  const navigate = useNavigate();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    
    try {
      // 1. Check for Action Intent
      const intent = await analyzeActionIntent(userMsg, pageContext);
      if (intent && (intent.action === 'navigate' || intent.action === 'prefill')) {
        if (intent.route) navigate(intent.route);
        if (intent.prefill) dispatchIntent(intent);
        setMessages(prev => [...prev, { role: 'assistant', text: `Executing Command: Navigating to ${intent.route || 'current page'} and autofilling data...` }]);
        return;
      }
    } catch (err) {
      console.warn("Intent check failed or not an action:", err);
    }

    // 2. Normal Chat
    const reply = await askAssistant(userMsg);
    setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if(window.confirm('Clear AI context history?')) {
      clearChatMemory();
      setMessages([{ role: 'assistant', text: "Context cleared. Let's start fresh!" }]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center group"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out pl-0 group-hover:pl-2 text-sm font-medium">
          Ask AI
        </span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed z-50 bottom-6 right-6 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-[600px] h-[80vh]' : 'w-[380px] h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Gemini Assistant</h3>
            <p className="text-[10px] text-gray-500">Powered by Google</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleClear} className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded">Clear</button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-gray-900 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="text-xs text-gray-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
        <div className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="w-full max-h-32 min-h-[44px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none custom-scrollbar text-gray-800 dark:text-gray-100"
            rows="1"
            style={{ height: input.split('\n').length * 24 + 20 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="shrink-0 h-[44px] w-[44px] bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
