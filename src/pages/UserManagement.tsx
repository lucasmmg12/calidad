import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth, type UserProfile } from '../contexts/AuthContext';
import { SECTOR_OPTIONS } from '../constants/sectors';
import {
    Loader2, Search, UserPlus, Edit, Save, X, CheckCircle2,
    AlertTriangle, Clock, UserCheck, XCircle, Phone, Trash2
} from 'lucide-react';

// ─── Notification Modal Component ─────────────────────────────────────
interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error';
    title: string;
    message: string;
}

const NotificationModal = ({ isOpen, onClose, type, title, message }: NotificationModalProps) => {
    if (!isOpen) return null;

    const isSuccess = type === 'success';

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                {/* Header Decoration */}
                <div className={`absolute top-0 left-0 w-full h-32 ${isSuccess ? 'bg-gradient-to-br from-green-500/10 to-transparent' : 'bg-gradient-to-br from-red-500/10 to-transparent'} pointer-events-none`} />

                <div className="p-8 relative z-10 text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className={`w-20 h-20 ${isSuccess ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border transform rotate-3`}>
                        {isSuccess
                            ? <CheckCircle2 className="w-10 h-10 text-green-500" />
                            : <AlertTriangle className="w-10 h-10 text-red-500" />
                        }
                    </div>

                    <h3 className="text-2xl font-display font-black text-slate-800 mb-3">
                        {title}
                    </h3>

                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className={`w-full py-3.5 px-6 ${isSuccess
                            ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                            : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                            } active:scale-95 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2`}
                    >
                        Aceptar
                    </button>
                </div>

                {/* Footer Brand */}
                <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Sanatorio Argentino
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────
export const UserManagement = () => {
    useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'pending'>('pending');
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
    const [deletingLoading, setDeletingLoading] = useState(false);

    // New User Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('123456');
    const [newUserName, setNewUserName] = useState('');
    const [newUserLastName, setNewUserLastName] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');
    const [newUserRole, setNewUserRole] = useState<'admin' | 'responsable' | 'directivo'>('responsable');
    const [creatingLoading, setCreatingLoading] = useState(false);
    const [sectorSearchTerm, setSectorSearchTerm] = useState('');

    // Notification Modal State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    const showNotification = (type: 'success' | 'error', title: string, message: string) => {
        setNotification({ isOpen: true, type, title, message });
    };

    const closeNotification = () => {
        setNotification(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveUser = async (user: UserProfile) => {
        setApprovingId(user.user_id);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    account_status: 'approved',
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.user_id);

            if (error) throw error;

            // Send WhatsApp notification (non-blocking — approval succeeds even if WhatsApp fails)
            let whatsappSent = false;
            if (user.phone_number) {
                try {
                    const cleanPhone = user.phone_number.trim().replace(/\D/g, '');
                    // Format: 549 + area code + number (e.g. "2645438114" → "5492645438114")
                    const botNumber = cleanPhone.startsWith('549') ? cleanPhone : `549${cleanPhone}`;
                    const appUrl = window.location.origin;

                    console.log('[Approve] Sending WhatsApp to:', botNumber, '(raw:', user.phone_number, ')');

                    const { error: waError } = await supabase.functions.invoke('send-whatsapp', {
                        body: {
                            number: botNumber,
                            message: `✅ *Cuenta Autorizada - Calidad*\n\nEstimado/a ${user.display_name || 'Usuario'}, su cuenta ha sido autorizada exitosamente.\n\nYa puede acceder al sistema con su email y contraseña.\n\n👉 *Ingrese aquí:* ${appUrl}/login\n\n_Sanatorio Argentino - Departamento de Calidad_`
                        }
                    });

                    if (waError) {
                        console.error('[Approve] WhatsApp error:', waError);
                    } else {
                        whatsappSent = true;
                        console.log('[Approve] WhatsApp sent successfully to:', botNumber);
                    }
                } catch (waErr) {
                    console.error('[Approve] WhatsApp exception:', waErr);
                }
            }

            setUsers(users.map(u =>
                u.user_id === user.user_id
                    ? { ...u, account_status: 'approved' as const }
                    : u
            ));

            showNotification(
                'success',
                '¡Usuario Aprobado!',
                `${user.display_name || 'Usuario'} fue autorizado exitosamente.${whatsappSent ? ' Se envió notificación por WhatsApp.' : user.phone_number ? ' No se pudo enviar WhatsApp, pero la cuenta fue aprobada.' : ''}`
            );
        } catch (error) {
            console.error('Error approving user:', error);
            showNotification('error', 'Error al Aprobar', 'No se pudo aprobar el usuario. Intenta nuevamente.');
        } finally {
            setApprovingId(null);
        }
    };

    const handleRejectUser = async (user: UserProfile) => {
        const confirmed = window.confirm(`¿Estás seguro de rechazar a ${user.display_name || 'este usuario'}?`);
        if (!confirmed) return;

        setApprovingId(user.user_id);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    account_status: 'rejected',
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.user_id);

            if (error) throw error;

            setUsers(users.map(u =>
                u.user_id === user.user_id
                    ? { ...u, account_status: 'rejected' as const }
                    : u
            ));

            showNotification(
                'success',
                'Usuario Rechazado',
                `La solicitud de ${user.display_name || 'usuario'} fue rechazada.`
            );
        } catch (error) {
            console.error('Error rejecting user:', error);
            showNotification('error', 'Error', 'No se pudo rechazar el usuario.');
        } finally {
            setApprovingId(null);
        }
    };

    const handleDeleteUser = (user: UserProfile) => {
        setDeletingUser(user);
    };

    const confirmDeleteUser = async () => {
        if (!deletingUser) return;
        setDeletingLoading(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('user_id', deletingUser.user_id);

            if (error) throw error;

            setUsers(users.filter(u => u.user_id !== deletingUser.user_id));
            setDeletingUser(null);
            showNotification(
                'success',
                'Usuario Eliminado',
                `${deletingUser.display_name || 'El usuario'} fue eliminado del sistema.`
            );
        } catch (error) {
            console.error('Error deleting user:', error);
            showNotification('error', 'Error al Eliminar', 'No se pudo eliminar el usuario. Intenta nuevamente.');
        } finally {
            setDeletingLoading(false);
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    role: editingUser.role,
                    assigned_sectors: editingUser.assigned_sectors,
                    display_name: editingUser.display_name,
                    phone_number: editingUser.phone_number,
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
            setEditingUser(null);
            showNotification('success', '¡Usuario Actualizado!', `El perfil de ${editingUser.display_name || 'usuario'} fue modificado correctamente.`);
        } catch (error) {
            console.error('Error updating user:', error);
            showNotification('error', 'Error al Actualizar', 'No se pudo actualizar el usuario. Intenta nuevamente.');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingLoading(true);

        const displayName = `${newUserName.trim()} ${newUserLastName.trim()}`.trim() || newUserEmail;

        try {
            const { error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: newUserEmail,
                    password: newUserPassword || '123456',
                    role: newUserRole,
                    display_name: displayName,
                    phone_number: newUserPhone.trim() || null,
                }
            });

            if (error) throw error;

            const roleName = newUserRole === 'admin' ? 'Administrador' : newUserRole === 'directivo' ? 'Directivo' : 'Responsable';
            showNotification(
                'success',
                '¡Usuario Creado!',
                `Se creó exitosamente el usuario ${displayName} (${newUserEmail}) con el rol de ${roleName}.`
            );
            setIsCreating(false);
            setNewUserEmail('');
            setNewUserPassword('123456');
            setNewUserName('');
            setNewUserLastName('');
            setNewUserPhone('');
            setNewUserRole('responsable');
            fetchUsers();
        } catch (error: any) {
            console.error('Error creating user:', error);
            showNotification(
                'error',
                'Error al Crear Usuario',
                error.message || 'Ocurrió un error inesperado. Verifica los datos e intenta nuevamente.'
            );
        } finally {
            setCreatingLoading(false);
        }
    };

    const pendingUsers = users.filter(u => u.account_status === 'pending' || !u.account_status);
    const filteredUsers = users.filter(user =>
        (user.display_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.phone_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-800">Gestión de Usuarios</h1>
                    <p className="text-slate-500">Administra roles, permisos y aprobaciones de acceso al sistema.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <UserPlus className="w-5 h-5" />
                    Crear Usuario
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'pending'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <Clock className="w-4 h-4" />
                    Pendientes
                    {pendingUsers.length > 0 && (
                        <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-bold min-w-[20px] text-center">
                            {pendingUsers.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'all'
                        ? 'bg-sanatorio-primary text-white shadow-lg shadow-sanatorio-primary/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <Search className="w-4 h-4" />
                    Todos los Usuarios
                </button>
            </div>

            {/* ── PENDING APPROVALS TAB ── */}
            {activeTab === 'pending' && (
                <div className="space-y-4">
                    {pendingUsers.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Sin solicitudes pendientes</h3>
                            <p className="text-sm text-gray-500">Todas las solicitudes de acceso han sido procesadas.</p>
                        </div>
                    ) : (
                        pendingUsers.map(user => (
                            <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 animate-in fade-in duration-300">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* User Info */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg shrink-0">
                                            {(user.display_name?.[0] || 'U').toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-800 text-base">{user.display_name || 'Sin Nombre'}</h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${user.role === 'directivo'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                    {user.role === 'directivo' ? '🏥 Directivo' : '🛠️ Responsable'}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock className="w-3 h-3 mr-1" /> Pendiente
                                                </span>
                                            </div>

                                            {/* Details */}
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                                                {user.phone_number && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span className="font-mono">{user.phone_number}</span>
                                                    </div>
                                                )}
                                                {user.assigned_sectors && user.assigned_sectors.length > 0 && (
                                                    <div className="col-span-full">
                                                        <span className="text-gray-400">Sectores: </span>
                                                        {user.assigned_sectors.slice(0, 3).map(s => (
                                                            <span key={s} className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium mr-1 mb-1">{s}</span>
                                                        ))}
                                                        {user.assigned_sectors.length > 3 && (
                                                            <span className="text-gray-400 text-[10px]">+{user.assigned_sectors.length - 3} más</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleRejectUser(user)}
                                            disabled={approvingId === user.user_id}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors text-sm disabled:opacity-50 border border-red-200"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleApproveUser(user)}
                                            disabled={approvingId === user.user_id}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20 text-sm disabled:opacity-50"
                                        >
                                            {approvingId === user.user_id ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Aprobando...</>
                                            ) : (
                                                <><UserCheck className="w-4 h-4" /> Aprobar</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── ALL USERS TAB ── */}
            {activeTab === 'all' && (
                <>
                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, rol o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-sanatorio-primary outline-none transition-all"
                        />
                    </div>

                    {/* Users Cards */}
                    <div className="space-y-3">
                        {filteredUsers.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No se encontraron usuarios</p>
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
                                    <div className="p-5">
                                        {/* Top row: Avatar + Name + Badges + Actions */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 min-w-0 flex-1">
                                                {/* Avatar */}
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                    user.role === 'directivo' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-green-100 text-green-600'
                                                    }`}>
                                                    {(user.display_name?.[0] || 'U').toUpperCase()}
                                                </div>

                                                {/* Name + Role + Status */}
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-gray-800 text-base truncate">
                                                        {user.display_name || 'Sin Nombre'}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        {/* Role badge */}
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                            user.role === 'directivo' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                'bg-green-50 text-green-700 border-green-200'
                                                            }`}>
                                                            {user.role === 'admin' ? '👑 Admin' : user.role === 'directivo' ? '🏥 Directivo' : '🛠️ Responsable'}
                                                        </span>
                                                        {/* Status badge */}
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${user.account_status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            user.account_status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                            {user.account_status === 'approved' ? '✅ Aprobado' :
                                                                user.account_status === 'rejected' ? '❌ Rechazado' :
                                                                    '⏳ Pendiente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {(user.account_status === 'pending' || !user.account_status) && user.role !== 'admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveUser(user)}
                                                            disabled={approvingId === user.user_id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-bold text-xs hover:bg-green-100 transition-colors border border-green-200 disabled:opacity-50"
                                                            title="Aprobar"
                                                        >
                                                            {approvingId === user.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                            <span className="hidden sm:inline">Aprobar</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectUser(user)}
                                                            disabled={approvingId === user.user_id}
                                                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors border border-red-200"
                                                            title="Rechazar"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-1.5 rounded-lg text-sanatorio-primary hover:bg-blue-50 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                {user.role !== 'admin' && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Details Row: Phone + Sectors */}
                                        <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Phone */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                                {user.phone_number ? (
                                                    <span className="font-mono text-gray-700 text-xs">{user.phone_number}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Sin teléfono registrado</span>
                                                )}
                                            </div>

                                            {/* Sectors */}
                                            <div>
                                                {user.assigned_sectors && user.assigned_sectors.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.assigned_sectors.map(sector => (
                                                            <span
                                                                key={sector}
                                                                className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100 whitespace-nowrap"
                                                            >
                                                                {sector}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Sin sectores asignados</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Create User Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm animate-in fade-in flex items-center justify-center p-4" onClick={() => setIsCreating(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Crear Nuevo Usuario</h2>
                                <p className="text-xs text-slate-400 mt-1">Complete los datos del nuevo usuario</p>
                            </div>
                            <button onClick={() => setIsCreating(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            {/* Name Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: María"
                                        value={newUserName}
                                        onChange={e => setNewUserName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellido <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: González"
                                        value={newUserLastName}
                                        onChange={e => setNewUserLastName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    required
                                    placeholder="usuario@sanatorioargentino.com"
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                                    <input
                                        type="text"
                                        minLength={6}
                                        value={newUserPassword}
                                        onChange={e => setNewUserPassword(e.target.value)}
                                        placeholder="123456"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all font-mono text-sm"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Contraseña por defecto: 123456</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="tel"
                                            placeholder="2645438114"
                                            value={newUserPhone}
                                            onChange={e => setNewUserPhone(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rol Inicial</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e: any) => setNewUserRole(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none bg-white transition-all"
                                >
                                    <option value="responsable">🛠️ Responsable</option>
                                    <option value="admin">👑 Administrador</option>
                                    <option value="directivo">🏥 Directivo</option>
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingLoading}
                                    className="flex-1 btn-primary flex justify-center items-center gap-2"
                                >
                                    {creatingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                                    Crear Usuario
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {
                editingUser && (
                    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm animate-in fade-in flex items-center justify-center p-4" onClick={() => { setEditingUser(null); setSectorSearchTerm(''); }}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Editar Usuario</h2>
                                    <p className="text-xs text-slate-400 mt-1">Modificar datos de {editingUser.display_name || 'usuario'}</p>
                                </div>
                                <button onClick={() => { setEditingUser(null); setSectorSearchTerm(''); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: María González"
                                        value={editingUser.display_name || ''}
                                        onChange={e => setEditingUser({ ...editingUser, display_name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (WhatsApp)</label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="tel"
                                            placeholder="2645438114"
                                            value={editingUser.phone_number || ''}
                                            onChange={e => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                    <select
                                        value={editingUser.role}
                                        onChange={(e: any) => setEditingUser({ ...editingUser, role: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none bg-white transition-all"
                                    >
                                        <option value="responsable">🛠️ Responsable</option>
                                        <option value="admin">👑 Administrador</option>
                                        <option value="directivo">🏥 Directivo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Sectores Asignados</label>
                                    {(editingUser.role === 'admin' || editingUser.role === 'directivo') && (
                                        <div className="mb-2 p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                                            <p className="text-[11px] text-blue-700 font-medium">
                                                💡 Los {editingUser.role === 'admin' ? 'administradores' : 'directivos'} mantienen sus permisos actuales.
                                                Si se les asignan sectores, <strong>también podrán ser seleccionados como responsables</strong> para derivaciones de esos sectores.
                                            </p>
                                        </div>
                                    )}
                                    {/* Sector Search */}
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Buscar sector... (ej: neo, farmacia, guardia)"
                                            value={sectorSearchTerm}
                                            onChange={(e) => setSectorSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all text-sm"
                                        />
                                        {sectorSearchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => setSectorSearchTerm('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-0.5">
                                        {SECTOR_OPTIONS
                                            .filter(sector =>
                                                !sectorSearchTerm ||
                                                sector.label.toLowerCase().includes(sectorSearchTerm.toLowerCase()) ||
                                                sector.value.toLowerCase().includes(sectorSearchTerm.toLowerCase())
                                            )
                                            .map(sector => (
                                                <label key={sector.value} className="flex items-center p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={editingUser.assigned_sectors?.includes(sector.value)}
                                                        onChange={(e) => {
                                                            const current = editingUser.assigned_sectors || [];
                                                            const updated = e.target.checked
                                                                ? [...current, sector.value]
                                                                : current.filter(s => s !== sector.value);
                                                            setEditingUser({ ...editingUser, assigned_sectors: updated });
                                                        }}
                                                        className="w-4 h-4 text-sanatorio-primary rounded border-gray-300 focus:ring-sanatorio-primary"
                                                    />
                                                    <span className="ml-3 text-sm text-slate-700">{sector.label}</span>
                                                </label>
                                            ))}
                                        {sectorSearchTerm && SECTOR_OPTIONS.filter(s =>
                                            s.label.toLowerCase().includes(sectorSearchTerm.toLowerCase()) ||
                                            s.value.toLowerCase().includes(sectorSearchTerm.toLowerCase())
                                        ).length === 0 && (
                                                <p className="text-sm text-slate-400 text-center py-3">No se encontraron sectores para "{sectorSearchTerm}"</p>
                                            )}
                                    </div>
                                    {editingUser.assigned_sectors && editingUser.assigned_sectors.length > 0 && (
                                        <p className="text-[10px] text-slate-400 mt-1.5">
                                            {editingUser.assigned_sectors.length} sector{editingUser.assigned_sectors.length !== 1 ? 'es' : ''} seleccionado{editingUser.assigned_sectors.length !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => { setEditingUser(null); setSectorSearchTerm(''); }}
                                        className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleUpdateUser}
                                        className="flex-1 btn-primary flex justify-center items-center gap-2"
                                    >
                                        <Save className="w-5 h-5" />
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deletingUser && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setDeletingUser(null)}>
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
                                        <Trash2 className="w-8 h-8 text-red-500" />
                                    </div>

                                    <h3 className="text-2xl font-display font-black text-slate-800 mb-3">
                                        ¿Eliminar usuario?
                                    </h3>

                                    <p className="text-slate-500 font-medium leading-relaxed mb-2">
                                        Estás a punto de eliminar a:
                                    </p>
                                    <p className="text-slate-800 font-bold text-lg mb-1">
                                        {deletingUser.display_name || 'Sin Nombre'}
                                    </p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${deletingUser.role === 'directivo' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-green-50 text-green-700 border-green-200'
                                        }`}>
                                        {deletingUser.role === 'directivo' ? '🏥 Directivo' : '🛠️ Responsable'}
                                    </span>

                                    <p className="text-red-500 text-sm font-medium mt-4 mb-6">
                                        ⚠️ Esta acción no se puede deshacer.
                                    </p>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setDeletingUser(null)}
                                            disabled={deletingLoading}
                                            className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={confirmDeleteUser}
                                            disabled={deletingLoading}
                                            className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {deletingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            Eliminar
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Sanatorio Argentino
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                onClose={closeNotification}
                type={notification.type}
                title={notification.title}
                message={notification.message}
            />
        </div >
    );
};
