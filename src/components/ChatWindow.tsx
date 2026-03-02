import { useState, useEffect, useRef, useCallback } from 'react';
import {
    X,
    Send,
    Smile,
    Paperclip,
    Mic,
    MicOff,
    Image as ImageIcon,
    FileText,
    Play,
    Pause,
    Loader2,
    MessageSquare,
    ChevronDown,
    Slash,
} from 'lucide-react';
import {
    fetchMessages,
    sendTextMessage,
    markAsRead,
    uploadMedia,
    subscribeToMessages,
    fetchShortcuts,
    type ChatMessage,
    type ChatShortcut,
} from '../services/chatService';

// ─── Emoji Picker ───
const EMOJIS = [
    '😊', '😂', '❤️', '👍', '🙏', '😍', '🥰', '😘', '🤔', '😢',
    '😎', '🤗', '💪', '🎉', '✅', '❌', '⚠️', '📋', '📞', '💬',
    '👋', '🙌', '💙', '🏥', '💊', '🩺', '🔔', '📌', '✨', '🚀',
    '👏', '🤝', '💯', '🔥', '⭐', '🌟', '📎', '📝', '🎯', '💡',
    '☀️', '🌙', '⏰', '📅', '🗓️', '📊', '🔒', '🔑', '📱', '💻',
];

interface ChatWindowProps {
    phoneNumber: string;
    contactName: string;
    onClose: () => void;
    reportTrackingId?: string;
}

export const ChatWindow = ({ phoneNumber, contactName, onClose, reportTrackingId }: ChatWindowProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [shortcuts, setShortcuts] = useState<ChatShortcut[]>([]);
    const [shortcutFilter, setShortcutFilter] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const normalized = phoneNumber.replace(/^549/, '').replace(/\D/g, '');

    // ─── Load messages ───
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const msgs = await fetchMessages(normalized);
            setMessages(msgs);
            await markAsRead(normalized);
            setLoading(false);
            setTimeout(() => scrollToBottom(), 100);
        };
        load();

        // Load shortcuts
        fetchShortcuts().then(setShortcuts);
    }, [normalized]);

    // ─── Realtime subscription ───
    useEffect(() => {
        const unsubscribe = subscribeToMessages(normalized, (newMsg) => {
            setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
            if (newMsg.direction === 'incoming') {
                markAsRead(normalized);
            }
            setTimeout(() => scrollToBottom(), 100);
        });

        return unsubscribe;
    }, [normalized]);

    // ─── Polling fallback (every 8s) ───
    useEffect(() => {
        const interval = setInterval(async () => {
            const msgs = await fetchMessages(normalized);
            setMessages(msgs);
        }, 8000);
        return () => clearInterval(interval);
    }, [normalized]);

    // ─── Scroll handling ───
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const handleScroll = () => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };

    // ─── Send text message ───
    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || sending) return;

        setSending(true);
        setInputText('');
        setShowEmojis(false);
        setShowShortcuts(false);

        try {
            const newMsg = await sendTextMessage(normalized, text, 'Calidad');
            if (newMsg) {
                setMessages(prev => [...prev, newMsg]);
            }
            setTimeout(() => scrollToBottom(), 100);
        } catch (err) {
            console.error('[Chat] Send error:', err);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    // ─── Send media (image/file) ───
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || sending) return;

        setSending(true);
        try {
            const publicUrl = await uploadMedia(file);
            const isImage = file.type.startsWith('image/');
            const caption = isImage ? '📷 Imagen enviada' : `📎 ${file.name}`;
            const newMsg = await sendTextMessage(normalized, caption, 'Calidad', publicUrl);
            if (newMsg) {
                setMessages(prev => [...prev, newMsg]);
            }
            setTimeout(() => scrollToBottom(), 100);
        } catch (err) {
            console.error('[Chat] Upload error:', err);
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ─── Audio recording ───
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });

                setSending(true);
                try {
                    const url = await uploadMedia(file);
                    const newMsg = await sendTextMessage(normalized, '🎤 Audio enviado', 'Calidad', url);
                    if (newMsg) setMessages(prev => [...prev, newMsg]);
                    setTimeout(() => scrollToBottom(), 100);
                } catch (err) {
                    console.error('[Chat] Audio upload error:', err);
                } finally {
                    setSending(false);
                }
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        } catch (err) {
            console.error('[Chat] Mic access error:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    // ─── Shortcut detection ───
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputText(val);

        if (val.startsWith('/')) {
            setShowShortcuts(true);
            setShortcutFilter(val.slice(1).toLowerCase());
        } else {
            setShowShortcuts(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const applyShortcut = (shortcut: ChatShortcut) => {
        setInputText(shortcut.content);
        setShowShortcuts(false);
        inputRef.current?.focus();
    };

    const filteredShortcuts = shortcuts.filter(s =>
        s.shortcut_key.toLowerCase().includes(shortcutFilter) ||
        s.title.toLowerCase().includes(shortcutFilter)
    );

    // ─── Group messages by date ───
    const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
    messages.forEach(msg => {
        const dateStr = new Date(msg.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const last = groupedMessages[groupedMessages.length - 1];
        if (last && last.date === dateStr) {
            last.messages.push(msg);
        } else {
            groupedMessages.push({ date: dateStr, messages: [msg] });
        }
    });

    // ─── Render message bubble ───
    const renderMessage = (msg: ChatMessage) => {
        const isOut = msg.direction === 'outgoing';
        const time = new Date(msg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

        return (
            <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1.5 animate-in slide-in-from-bottom-2 duration-200`}>
                <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm ${isOut
                        ? 'bg-[#dcf8c6] rounded-br-md'
                        : 'bg-white rounded-bl-md border border-gray-100'
                        }`}
                >
                    {/* Media content */}
                    {msg.media_url && msg.message_type === 'image' && (
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                            <img src={msg.media_url} alt="img" className="rounded-lg max-w-full max-h-48 object-cover mb-1" />
                        </a>
                    )}
                    {msg.media_url && msg.message_type === 'video' && (
                        <video src={msg.media_url} controls className="rounded-lg max-w-full max-h-48 mb-1" />
                    )}
                    {msg.media_url && msg.message_type === 'audio' && (
                        <audio src={msg.media_url} controls className="max-w-full mb-1" />
                    )}
                    {msg.media_url && msg.message_type === 'document' && (
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-1 hover:bg-gray-100 transition-colors">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <span className="text-xs text-blue-600 font-medium truncate">{msg.attachment_filename || 'Documento'}</span>
                        </a>
                    )}

                    {/* Text body */}
                    {msg.body && !(msg.message_type !== 'text' && msg.body.startsWith('[')) && (
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                    )}

                    {/* Time */}
                    <p className={`text-[10px] mt-0.5 ${isOut ? 'text-green-700/50 text-right' : 'text-gray-400 text-right'}`}>{time}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed bottom-4 right-4 w-[380px] h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-[9999] animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 overflow-hidden">
            {/* ─── Header ─── */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate uppercase tracking-wide">{contactName || 'Chat'}</p>
                    <p className="text-[10px] text-green-100 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-300 rounded-full"></span>
                        549{normalized} · <span className="bg-green-700/40 px-1.5 py-0.5 rounded text-[9px] font-bold">WhatsApp</span>
                    </p>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* ─── Messages Area ─── */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 py-3 relative"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e8e8e8\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                            <p className="text-xs text-gray-400">Cargando mensajes...</p>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-2">
                            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                            <p className="text-sm font-bold text-gray-400">Sin mensajes</p>
                            <p className="text-xs text-gray-300">Enviá el primer mensaje al paciente</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {groupedMessages.map(group => (
                            <div key={group.date}>
                                <div className="flex justify-center my-3">
                                    <span className="bg-white/90 backdrop-blur-sm border border-gray-200 text-[10px] text-gray-500 font-bold px-3 py-1 rounded-full shadow-sm">
                                        {group.date}
                                    </span>
                                </div>
                                {group.messages.map(renderMessage)}
                            </div>
                        ))}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-4 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors z-10"
                >
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
            )}

            {/* ─── Shortcuts dropdown ─── */}
            {showShortcuts && filteredShortcuts.length > 0 && (
                <div className="border-t border-gray-100 bg-white max-h-32 overflow-y-auto">
                    {filteredShortcuts.map(s => (
                        <button
                            key={s.id}
                            onClick={() => applyShortcut(s)}
                            className="w-full px-3 py-2 text-left hover:bg-green-50 transition-colors flex items-center gap-2 border-b border-gray-50"
                        >
                            <Slash className="w-3 h-3 text-green-500 flex-shrink-0" />
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-green-700">/{s.shortcut_key}</span>
                                <span className="text-xs text-gray-400 ml-2 truncate">{s.title}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* ─── Emoji picker ─── */}
            {showEmojis && (
                <div className="border-t border-gray-100 bg-white p-2 max-h-28 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    setInputText(prev => prev + emoji);
                                    inputRef.current?.focus();
                                }}
                                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Input Area ─── */}
            <div className="border-t border-gray-200 bg-gray-50 p-2 flex items-end gap-1.5 flex-shrink-0">
                {/* Emoji toggle */}
                <button
                    onClick={() => { setShowEmojis(!showEmojis); setShowShortcuts(false); }}
                    className={`p-2 rounded-lg transition-colors ${showEmojis ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                >
                    <Smile className="w-5 h-5" />
                </button>

                {/* Attachment */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                {/* Text input */}
                <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isRecording ? `🔴 Grabando... ${recordingTime}s` : 'Escribí un mensaje... (/ para atajos)'}
                    disabled={isRecording || sending}
                    rows={1}
                    className="flex-1 resize-none bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all placeholder:text-gray-300 disabled:opacity-50 max-h-20"
                    style={{ minHeight: '38px' }}
                />

                {/* Send or Record button */}
                {inputText.trim() ? (
                    <button
                        onClick={handleSend}
                        disabled={sending}
                        className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                ) : isRecording ? (
                    <button
                        onClick={stopRecording}
                        className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-sm animate-pulse"
                    >
                        <MicOff className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        onClick={startRecording}
                        disabled={sending}
                        className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};
