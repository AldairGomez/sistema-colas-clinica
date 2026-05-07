// src/pages/AdminUsuarios.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminUsuarios() {
    const [usuarios, setUsuarios] = useState([]);

    // Aquí implementarías un formulario que use supabase.auth.admin.createUser
    // Nota: Para usar funciones administrativas de creación, necesitarás una Edge Function
    // o crear los usuarios manualmente en el dashboard de Supabase y luego editarlos aquí.

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Gestión de Personal</h1>
            <table className="w-full bg-white rounded-xl shadow">
                <thead>
                    <tr className="border-b">
                        <th className="p-4 text-left">Nombre</th>
                        <th className="p-4 text-left">Rol</th>
                        <th className="p-4 text-left">Especialidad</th>
                        <th className="p-4">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map(u => (
                        <tr key={u.id} className="border-b">
                            <td className="p-4">{u.usuario_nombre}</td>
                            <td className="p-4 font-bold text-blue-600">{u.rol}</td>
                            <td className="p-4">{u.especialidad}</td>
                            <td className="p-4 text-center">
                                <button className="text-red-500 font-bold">Dar de Baja</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}