'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, X, Minimize2, Loader2, Paperclip, FileText, Upload } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; fileName?: string };

export default function ClaudeChat({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; summary: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadedFile({ name: data.name, summary: data.summary });
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`);
    }
    setUploading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && !uploadedFile) || streaming) return;

    let userContent = input.trim();
    let displayContent = userContent;
    let fileName: string | undefined;

    // If file is attached, prepend its data as context
    if (uploadedFile) {
      const fileContext = `[Uploaded file: ${uploadedFile.name}]\n${uploadedFile.summary}`;
      userContent = fileContext + (userContent ? `\n\nUser question: ${userContent}` : '\n\nAnalyze this data and provide actionable insights.');
      displayContent = userContent ? `📎 ${uploadedFile.name} — ${input.trim()}` : `📎 ${uploadedFile.name} — Analyze this data`;
      fileName = uploadedFile.name;
      setUploadedFile(null);
    }

    const userMsg: Message = { role: 'user', content: userContent, fileName };
    const displayMsg: Message = { role: 'user', content: displayContent, fileName };
    const apiMessages = [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content: userContent }];
    setMessages(prev => [...prev, displayMsg]);
    setInput('');
    setStreaming(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, context }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantContent += parsed.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setMessages(prev => prev.filter(m => m.content !== ''));
    }
    setStreaming(false);
  }, [input, messages, streaming, context, uploadedFile]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        <MessageSquare size={18} />
        <span className="text-sm font-medium">Ask Claude</span>
      </button>
    );
  }

  if (minimized) {
    return (
      <div
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg cursor-pointer"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={() => setMinimized(false)}
      >
        <MessageSquare size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>Claude</span>
        {messages.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
            {messages.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-40 flex flex-col rounded-xl shadow-2xl overflow-hidden"
      style={{ width: '420px', height: '560px', background: 'var(--surface)', border: '1px solid var(--border)' }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'var(--accent)', color: '#fff' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={16} />
          <span className="text-sm font-semibold">Claude</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1 rounded hover:bg-white/20">
            <Minimize2 size={14} />
          </button>
          <button onClick={() => { setOpen(false); setMinimized(false); }} className="p-1 rounded hover:bg-white/20">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: 'var(--bg)' }}>
        {messages.length === 0 && (
          <div className="text-center py-6">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Ask about tasks, pipeline, or upload a file for analysis.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {['Summarize my day', 'Pipeline overview', 'Analyze KPIs'].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 mx-auto text-xs px-4 py-2 rounded-lg transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <Upload size={14} /> Upload CSV, JSON, or spreadsheet for insights
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              }}
            >
              {msg.content || (streaming && i === messages.length - 1 ? (
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              ) : '')}
            </div>
          </div>
        ))}

        {error && (
          <div className="text-xs text-center py-2 px-3 rounded" style={{ background: '#ef444422', color: '#ef4444' }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File attachment indicator */}
      {uploadedFile && (
        <div className="flex items-center gap-2 px-3 py-2 mx-3 mb-1 rounded-md"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <FileText size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs flex-1 truncate" style={{ color: 'var(--text)' }}>{uploadedFile.name}</span>
          <button onClick={() => setUploadedFile(null)}>
            <X size={12} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 px-3 py-2 mx-3 mb-1">
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Parsing file...</span>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <input type="file" ref={fileInputRef} className="hidden"
          accept=".csv,.tsv,.json,.txt,.xlsx"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded transition-colors shrink-0"
          style={{ color: 'var(--text-muted)' }} title="Attach file">
          <Paperclip size={16} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          placeholder={uploadedFile ? 'Ask about the file...' : 'Ask Claude...'}
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: 'var(--text)' }}
          disabled={streaming}
        />
        <button
          onClick={sendMessage}
          disabled={(!input.trim() && !uploadedFile) || streaming}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: (input.trim() || uploadedFile) ? 'var(--accent)' : 'var(--bg)',
            color: (input.trim() || uploadedFile) ? '#fff' : 'var(--text-muted)',
          }}
        >
          {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
