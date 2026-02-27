import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, MicOff } from 'lucide-react';
import { supabase } from '../utils/supabase';

type RecorderState = 'idle' | 'recording' | 'transcribing' | 'done' | 'error';

interface VoiceRecorderProps {
    onTranscription: (text: string) => void;
    disabled?: boolean;
    maxDurationSeconds?: number;
}

export const VoiceRecorder = ({
    onTranscription,
    disabled = false,
    maxDurationSeconds = 300, // 5 minutes default
}: VoiceRecorderProps) => {
    const [state, setState] = useState<RecorderState>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [doneMsg, setDoneMsg] = useState('');
    const [audioLevels, setAudioLevels] = useState<number[]>(new Array(24).fill(4));

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Format seconds to mm:ss
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Cleanup everything on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Audio level visualization
    const updateAudioLevels = useCallback(() => {
        if (!analyserRef.current) return;
        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Sample 24 frequency bands for the visualization
        const bands = 24;
        const step = Math.floor(dataArray.length / bands);
        const levels = [];
        for (let i = 0; i < bands; i++) {
            const value = dataArray[i * step];
            // Normalize to 4-28 range for bar height
            const normalized = Math.max(4, Math.min(28, (value / 255) * 28));
            levels.push(normalized);
        }
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateAudioLevels);
    }, []);

    const startRecording = async () => {
        setErrorMsg('');
        setDoneMsg('');

        // Check if MediaRecorder is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setErrorMsg('Tu navegador no soporta grabación de audio.');
            setState('error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Setup audio analyser for visualization
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Find best supported mime type
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Cleanup stream
                stream.getTracks().forEach(t => t.stop());
                streamRef.current = null;

                // Stop visualizer
                if (animFrameRef.current) {
                    cancelAnimationFrame(animFrameRef.current);
                    animFrameRef.current = null;
                }
                setAudioLevels(new Array(24).fill(4));

                // Process the recorded audio
                const blob = new Blob(chunksRef.current, { type: mimeType });
                if (blob.size < 1000) {
                    setErrorMsg('La grabación es muy corta. Habla al menos unos segundos.');
                    setState('error');
                    return;
                }
                handleTranscription(blob);
            };

            // Start recording with 1-second timeslices
            mediaRecorder.start(1000);
            setState('recording');
            setElapsed(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setElapsed(prev => {
                    const next = prev + 1;
                    if (next >= maxDurationSeconds) {
                        // Auto-stop at max duration
                        stopRecording();
                    }
                    return next;
                });
            }, 1000);

            // Start audio visualization
            updateAudioLevels();

        } catch (err: any) {
            console.error('Mic permission error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setErrorMsg('Necesitamos acceso al micrófono. Por favor, permite el acceso en tu navegador.');
            } else if (err.name === 'NotFoundError') {
                setErrorMsg('No se encontró un micrófono en tu dispositivo.');
            } else {
                setErrorMsg('Error al acceder al micrófono. Intenta de nuevo.');
            }
            setState('error');
        }
    };

    const stopRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleTranscription = async (audioBlob: Blob) => {
        setState('transcribing');

        try {
            // Convert blob to base64
            const arrayBuffer = await audioBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, i + chunkSize);
                binary += String.fromCharCode(...chunk);
            }
            const base64Audio = btoa(binary);

            // Determine file extension from mime type
            const mimeType = audioBlob.type;
            const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'webm';

            // Send to Edge Function
            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
                body: {
                    audio: base64Audio,
                    mimeType: mimeType,
                    extension: extension,
                },
            });

            if (error) throw error;

            if (data?.text) {
                onTranscription(data.text);
                setDoneMsg('✅ Transcripción agregada');
                setState('done');

                // Auto-reset to idle after 3 seconds
                doneTimerRef.current = setTimeout(() => {
                    setState('idle');
                    setDoneMsg('');
                }, 3000);
            } else {
                throw new Error('No se recibió texto de la transcripción.');
            }
        } catch (err: any) {
            console.error('Transcription error:', err);
            setErrorMsg(err.message || 'Error al transcribir. Revisa tu conexión e intenta de nuevo.');
            setState('error');
        }
    };

    // ── RENDER: IDLE STATE ──
    if (state === 'idle') {
        return (
            <div className="animate-in fade-in duration-300">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={startRecording}
                    className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-5 flex items-center gap-4 
                     bg-slate-50/50 hover:border-sanatorio-primary/40 hover:bg-white hover:shadow-sm
                     transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="w-12 h-12 rounded-2xl bg-sanatorio-primary/10 flex items-center justify-center 
                          group-hover:bg-sanatorio-primary group-hover:text-white transition-all duration-300">
                        <Mic className="w-6 h-6 text-sanatorio-primary group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-slate-700 group-hover:text-sanatorio-primary transition-colors">
                            Dictar con Voz
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Toca para grabar tu reporte hablando · Máx {Math.floor(maxDurationSeconds / 60)} min
                        </p>
                    </div>
                </button>
            </div>
        );
    }

    // ── RENDER: RECORDING STATE ──
    if (state === 'recording') {
        const progressPercent = (elapsed / maxDurationSeconds) * 100;

        return (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-5 animate-in fade-in duration-300 
                       shadow-sm shadow-red-100">
                {/* Header: Recording indicator + Timer */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                            <div className="absolute inset-0 w-4 h-4 bg-red-400 rounded-full animate-ping opacity-50" />
                        </div>
                        <span className="font-bold text-red-700 text-sm">Grabando...</span>
                    </div>
                    <div className="font-mono text-sm font-bold text-red-600 bg-red-100 px-3 py-1 rounded-lg">
                        ⏱ {formatTime(elapsed)} / {formatTime(maxDurationSeconds)}
                    </div>
                </div>

                {/* Audio Waveform Visualization */}
                <div className="flex items-center justify-center gap-[2px] h-10 mb-4 px-2">
                    {audioLevels.map((level, i) => (
                        <div
                            key={i}
                            className="w-[3px] bg-red-400 rounded-full transition-all duration-100"
                            style={{ height: `${level}px` }}
                        />
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-red-100 rounded-full mb-4 overflow-hidden">
                    <div
                        className="h-full bg-red-400 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Stop Button */}
                <button
                    type="button"
                    onClick={stopRecording}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold 
                     flex items-center justify-center gap-2 transition-all duration-200 
                     active:scale-[0.98] shadow-md shadow-red-200"
                >
                    <Square className="w-5 h-5 fill-white" />
                    Detener Grabación
                </button>
            </div>
        );
    }

    // ── RENDER: TRANSCRIBING STATE ──
    if (state === 'transcribing') {
        return (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 text-sanatorio-primary animate-spin" />
                    <span className="font-bold text-sanatorio-primary">Transcribiendo con IA...</span>
                </div>
                {/* Shimmer bar */}
                <div className="mt-4 h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-200 via-sanatorio-primary/30 to-blue-200 rounded-full"
                        style={{
                            width: '50%',
                            animation: 'shimmer 1.5s ease-in-out infinite',
                        }}
                    />
                </div>
                <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
                <p className="text-xs text-blue-400 text-center mt-3">
                    Esto puede tomar unos segundos...
                </p>
            </div>
        );
    }

    // ── RENDER: DONE STATE ──
    if (state === 'done') {
        return (
            <div className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-4 animate-in fade-in duration-300 
                       flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="font-bold text-green-700 text-sm">{doneMsg}</span>
                <span className="text-xs text-green-500 ml-auto">Puedes grabar de nuevo</span>
            </div>
        );
    }

    // ── RENDER: ERROR STATE ──
    if (state === 'error') {
        return (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 animate-in fade-in duration-300">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        {errorMsg.includes('micrófono') || errorMsg.includes('permiso')
                            ? <MicOff className="w-5 h-5 text-amber-600" />
                            : <AlertCircle className="w-5 h-5 text-amber-600" />
                        }
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800">{errorMsg}</p>
                        <button
                            type="button"
                            onClick={() => { setState('idle'); setErrorMsg(''); }}
                            className="mt-2 text-xs font-bold text-sanatorio-primary hover:underline flex items-center gap-1"
                        >
                            <Mic className="w-3 h-3" /> Intentar de nuevo
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
