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

    // New User Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'admin' | 'responsable' | 'directivo'>('responsable');
    const [creatingLoading, setCreatingLoading] = useState(false);

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
                    const cleanPhone = user.phone_number.replace(/\D/g, '');
                    // Ensure format is 549XXXXXXXXXX
                    const botNumber = cleanPhone.startsWith('549') ? cleanPhone : `549${cleanPhone}`;
                    const appUrl = window.location.origin;

                    await supabase.functions.invoke('send-whatsapp', {
                        body: {
                            number: botNumber,
                            message: `✅ *Cuenta Autorizada - Calidad*\n\nEstimado/a ${user.display_name || 'Usuario'}, su cuenta ha sido autorizada exitosamente.\n\nYa puede acceder al sistema con su email y contraseña.\n\n👉 *Ingrese aquí:* ${appUrl}/login\n\n_Sanatorio Argentino - Departamento de Calidad_`
                        }
                    });
                    whatsappSent = true;
                } catch (waErr) {
                    console.error('Error sending WhatsApp (non-blocking):', waErr);
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

    const handleDeleteUser = async (user: UserProfile) => {
        const confirmed = window.confirm(
            `¿Estás seguro de ELIMINAR a ${user.display_name || 'este usuario'}?\n\nEsta acción no se puede deshacer.`
        );
        if (!confirmed) return;

        try {
            // Delete profile from user_profiles
            const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('user_id', user.user_id);

            if (error) throw error;

            setUsers(users.filter(u => u.user_id !== user.user_id));
            showNotification(
                'success',
                'Usuario Eliminado',
                `${user.display_name || 'El usuario'} fue eliminado del sistema.`
            );
        } catch (error) {
            console.error('Error deleting user:', error);
            showNotification('error', 'Error al Eliminar', 'No se pudo eliminar el usuario. Intenta nuevamente.');
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
                    display_name: editingUser.display_name
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

        try {
            const { error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole
                }
            });

            if (error) throw error;

            const roleName = newUserRole === 'admin' ? 'Administrador' : newUserRole === 'directivo' ? 'Directivo' : 'Responsable';
            showNotification(
                'success',
                '¡Usuario Creado!',
                `Se creó exitosamente el usuario ${newUserEmail} con el rol de ${roleName}.`
            );
            setIsCreating(false);
            setNewUserEmail('');
            setNewUserPassword('');
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

                    {/* Users Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sectores</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                                                        {(user.display_name?.[0] || 'U').toUpperCase()}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-slate-900">{user.display_name || 'Sin Nombre'}</div>
                                                        <div className="text-xs text-slate-500">ID: {user.user_id.slice(0, 8)}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    user.role === 'directivo' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${user.account_status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    user.account_status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {user.account_status === 'approved' ? '✅ Aprobado' :
                                                        user.account_status === 'rejected' ? '❌ Rechazado' :
                                                            '⏳ Pendiente'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 font-mono">
                                                    {user.phone_number || <span className="text-slate-400 italic font-sans">—</span>}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600 max-w-xs truncate">
                                                    {user.assigned_sectors?.length
                                                        ? user.assigned_sectors.join(', ')
                                                        : <span className="text-slate-400 italic">Ninguno</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Approve button for pending users */}
                                                    {(user.account_status === 'pending' || !user.account_status) && user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleApproveUser(user)}
                                                            disabled={approvingId === user.user_id}
                                                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors border border-green-200"
                                                            title="Aprobar usuario"
                                                        >
                                                            {approvingId === user.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {/* Reject button for pending users */}
                                                    {(user.account_status === 'pending' || !user.account_status) && user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleRejectUser(user)}
                                                            disabled={approvingId === user.user_id}
                                                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                                                            title="Rechazar usuario"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => setEditingUser(user)}
                                                        className="p-1.5 rounded-lg text-sanatorio-primary hover:bg-blue-50 transition-colors"
                                                        title="Editar usuario"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    {/* Delete */}
                                                    {user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                            title="Eliminar usuario"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Create User Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Crear Nuevo Usuario</h2>
                            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sanatorio-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sanatorio-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rol Inicial</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e: any) => setNewUserRole(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sanatorio-primary outline-none bg-white"
                                >
                                    <option value="responsable">Responsable</option>
                                    <option value="admin">Administrador</option>
                                    <option value="directivo">Directivo</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={creatingLoading}
                                className="w-full btn-primary mt-6 flex justify-center items-center gap-2"
                            >
                                {creatingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                                Crear Usuario
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Editar Usuario</h2>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Email</label>
                                <input
                                    type="text"
                                    value={editingUser.display_name || ''}
                                    onChange={e => setEditingUser({ ...editingUser, display_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sanatorio-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e: any) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sanatorio-primary outline-none bg-white"
                                >
                                    <option value="responsable">Responsable</option>
                                    <option value="admin">Administrador</option>
                                    <option value="directivo">Directivo</option>
                                </select>
                            </div>

                            {editingUser.role === 'responsable' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Sectores Asignados</label>
                                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                                        {SECTOR_OPTIONS.map(sector => (
                                            <label key={sector.value} className="flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer">
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
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-2 px-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
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
            )}

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                onClose={closeNotification}
                type={notification.type}
                title={notification.title}
                message={notification.message}
            />
        </div>
    );
};
