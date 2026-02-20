import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import {
    Bell,
    Plus,
    Trash2,
    Loader2,
    Phone,
    User,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Shield
} from 'lucide-react';

interface AlertRecipient {
    id: string;
    phone_number: string;
    display_name: string;
    is_active: boolean;
    created_at: string;
}

export const AlertRecipientsManager = () => {
    const [recipients, setRecipients] = useState<AlertRecipient[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        fetchRecipients();
    }, []);

    const fetchRecipients = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('alert_recipients')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching recipients:', error);
            setError('Error al cargar los destinatarios');
        } else {
            setRecipients(data || []);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        setError('');
        setSuccess('');

        const cleanPhone = newPhone.replace(/\D/g, '');

        if (!newName.trim()) {
            setError('Ingresa un nombre para identificar al destinatario.');
            return;
        }

        if (cleanPhone.length !== 10) {
            setError('El número debe tener 10 dígitos (cod. área + número). Ej: 2645438114');
            return;
        }

        // Check for duplicates
        if (recipients.some(r => r.phone_number === cleanPhone)) {
            setError('Este número ya está en la lista.');
            return;
        }

        setSaving(true);
        const { error: insertError } = await supabase
            .from('alert_recipients')
            .insert({
                phone_number: cleanPhone,
                display_name: newName.trim(),
                is_active: true,
            });

        if (insertError) {
            console.error('Error adding recipient:', insertError);
            setError(insertError.message.includes('duplicate') ? 'Este número ya existe.' : 'Error al agregar el destinatario.');
        } else {
            setSuccess(`${newName.trim()} fue agregado exitosamente.`);
            setNewName('');
            setNewPhone('');
            await fetchRecipients();
        }
        setSaving(false);
    };

    const handleToggle = async (id: string, currentState: boolean) => {
        setTogglingId(id);
        setError('');

        const { error: updateError } = await supabase
            .from('alert_recipients')
            .update({ is_active: !currentState, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (updateError) {
            console.error('Error toggling recipient:', updateError);
            setError('Error al cambiar el estado.');
        } else {
            await fetchRecipients();
        }
        setTogglingId(null);
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        setError('');

        const { error: deleteError } = await supabase
            .from('alert_recipients')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting recipient:', deleteError);
            setError('Error al eliminar el destinatario.');
        } else {
            setSuccess('Destinatario eliminado.');
            await fetchRecipients();
        }
        setDeletingId(null);
    };

    const activeCount = recipients.filter(r => r.is_active).length;

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-display font-black text-gray-900">Alertas Críticas</h1>
                        <p className="text-sm text-gray-500 font-medium">
                            Configura quién recibe alertas por WhatsApp cuando se detecta un caso 🔴 Rojo.
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-red-800 mb-1">¿Cómo funciona?</p>
                        <p className="text-xs text-red-700 leading-relaxed">
                            Cuando un reporte es clasificado por la IA como <strong>prioridad ROJA</strong> (riesgo de vida, daño permanente, etc.),
                            se envía automáticamente un mensaje de WhatsApp a <strong>todos los destinatarios activos</strong> de esta lista con los detalles del caso.
                        </p>
                    </div>
                </div>
            </div>

            {/* Add New Recipient */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Agregar Destinatario
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Nombre (Ej: Claudia)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 text-sm transition-all"
                        />
                    </div>
                    <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="tel"
                            placeholder="WhatsApp (Ej: 2645438114)"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                            maxLength={10}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 text-sm font-mono transition-all"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Agregar
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 ml-1">
                    10 dígitos sin 0 ni 15. Incluye código de área.
                </p>
            </div>

            {/* Feedback Messages */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700 font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-sm text-green-700 font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {success}
                </div>
            )}

            {/* Recipients List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-500" />
                        Destinatarios Configurados
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {activeCount} activo{activeCount !== 1 ? 's' : ''} / {recipients.length} total
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Cargando...
                    </div>
                ) : recipients.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No hay destinatarios configurados</p>
                        <p className="text-xs text-gray-300 mt-1">Las alertas rojas no se enviarán a nadie.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recipients.map((r) => (
                            <div
                                key={r.id}
                                className={`flex items-center justify-between px-5 py-4 transition-all hover:bg-gray-50/50 ${!r.is_active ? 'opacity-50' : ''}`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.is_active ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">
                                            {r.display_name}
                                        </p>
                                        <p className="text-xs text-gray-400 font-mono">
                                            {r.phone_number}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Active/Inactive Toggle */}
                                    <button
                                        onClick={() => handleToggle(r.id, r.is_active)}
                                        disabled={togglingId === r.id}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${r.is_active
                                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        title={r.is_active ? 'Desactivar' : 'Activar'}
                                    >
                                        {togglingId === r.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : r.is_active ? (
                                            <CheckCircle className="w-3 h-3" />
                                        ) : (
                                            <XCircle className="w-3 h-3" />
                                        )}
                                        {r.is_active ? 'Activo' : 'Inactivo'}
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDelete(r.id)}
                                        disabled={deletingId === r.id}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50"
                                        title="Eliminar"
                                    >
                                        {deletingId === r.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Note */}
            <p className="text-center text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-wider">
                Solo los administradores pueden gestionar esta configuración.
            </p>
        </div>
    );
};
