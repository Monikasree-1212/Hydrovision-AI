import React, { useState } from 'react';
import { AIService } from '../../services/api';
import { 
  Bot, Send, X, Sparkles, BookOpen, CheckCircle2, ChevronRight, MessageSquare
} from 'lucide-react';

export const HydroVisionCopilot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; citations?: string[]; followUps?: string[] }>>([
    {
      role: 'assistant',
      text: 'Namaste! I am **HydroVision Copilot**, trained on **CDSO Dam Safety Guidelines 2021**, NDSA Statutory Guidelines, and live infrastructure telemetry. How can I assist your dam inspection or compliance audit today?',
      citations: ['CDSO Guidelines 2021', 'Dam Safety Act 2021'],
      followUps: [
        'What are NDSA Section 32 audit rules?',
        'Show critical spalling remediation guidelines',
        'Explain Dam Risk Index calculation'
      ]
    }
  ]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg = { role: 'user' as const, text: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await AIService.queryCopilot(q);
      const assistantMsg = {
        role: 'assistant' as const,
        text: res.answer,
        citations: res.citations,
        followUps: res.suggested_follow_ups
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I apologize, but I encountered an error querying the knowledge base. Please ensure backend services are running.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Global Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-govt-navy hover:bg-govt-blue text-amber-300 font-bold p-3.5 rounded-full shadow-2xl border-2 border-amber-400 flex items-center space-x-2 transition transform hover:scale-105"
        title="HydroVision AI Regulatory & Safety Copilot"
      >
        <Bot className="w-6 h-6 text-amber-300" />
        <span className="hidden md:inline text-xs uppercase tracking-wider text-white font-extrabold pr-1">
          AI Copilot
        </span>
      </button>

      {/* Slide-out Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-govt-border shadow-2xl flex flex-col font-sans">
          {/* Header */}
          <div className="bg-govt-navy text-white p-4 border-b-2 border-amber-400 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-amber-300" />
              <div>
                <h3 className="font-bold text-sm leading-none">HydroVision RAG Copilot</h3>
                <div className="text-[10px] text-amber-300 font-medium mt-1">CDSO & NDSA Regulatory AI Assistant</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-grow p-4 overflow-y-auto space-y-4 text-xs bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-lg shadow-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-govt-navy text-white font-medium rounded-br-none'
                      : 'bg-white border border-govt-border text-slate-800 rounded-bl-none'
                  }`}
                >
                  {msg.text}

                  {/* Regulatory Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold text-govt-navy uppercase flex items-center space-x-1 mb-1">
                        <BookOpen className="w-3 h-3 text-amber-600" />
                        <span>Official Standards Citations</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((c, cIdx) => (
                          <span key={cIdx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded border border-slate-300 font-semibold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Follow-ups */}
                  {msg.followUps && msg.followUps.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Suggested Prompts:</div>
                      {msg.followUps.map((fu, fuIdx) => (
                        <button
                          key={fuIdx}
                          onClick={() => handleSend(fu)}
                          className="block w-full text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] p-1.5 rounded font-semibold transition"
                        >
                          → {fu}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-slate-500 font-bold italic flex items-center space-x-1">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>Searching CDSO Manuals & HydroVision Telemetry...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-govt-border flex space-x-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask safety guidelines or dam status..."
              className="flex-grow text-xs px-3 py-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-govt-blue"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-govt-navy hover:bg-govt-blue text-amber-300 p-2 rounded disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
