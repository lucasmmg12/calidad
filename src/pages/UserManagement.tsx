import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth, type UserProfile } from '../contexts/AuthContext';
import { SECTOR_OPTIONS } from '../constants/sectors';
import { Loader2, Search, UserPlus, Edit, Save, X } from 'lucide-react';

export const UserManagement = () => {
    const { } = useAuth(); // Removed unused currentUserProfile
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // New User Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'admin' | 'responsable' | 'directivo'>('responsable');
    const [creatingLoading, setCreatingLoading] = useState(false);

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
            // alert('Error al cargar usuarios');
        } finally {
            setLoading(false);
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
            alert('Usuario actualizado correctamente');
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error al actualizar usuario');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingLoading(true);

        try {
            // Call Supabase Edge Function to create user securely
            const { error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole
                }
            });

            if (error) throw error;

            alert('Usuario creado exitosamente. El perfil aparecerá en la lista en breve.');
            setIsCreating(false);
            setNewUserEmail('');
            setNewUserPassword('');
            fetchUsers(); // Refresh list
        } catch (error: any) {
            console.error('Error creating user:', error);
            alert('Error al crear usuario: ' + (error.message || 'Error desconocido'));
        } finally {
            setCreatingLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.display_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-800">Gestión de Usuarios</h1>
                    <p className="text-slate-500">Administra roles y permisos de acceso al sistema.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <UserPlus className="w-5 h-5" />
                    Crear Usuario
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o rol..."
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
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600 max-w-xs truncate">
                                            {user.assigned_sectors?.length
                                                ? user.assigned_sectors.join(', ')
                                                : <span className="text-slate-400 italic">Ninguno</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => setEditingUser(user)}
                                            className="text-sanatorio-primary hover:text-sanatorio-secondary transition-colors"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
        </div>
    );
};
