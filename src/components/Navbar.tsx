'use client';

import { useState } from 'react';
import { useAuth } from '../app/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
    const { usuario, logout } = useAuth();
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    if (!usuario || pathname === '/login' || pathname === '/') return null;

    return (
        <>
            <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
                <div className="mx-auto max-w-6xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsDrawerOpen(true)} 
                            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <span className="font-bold text-gray-800 text-lg hidden sm:block">⛪ Boas-Vindas</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">Olá, <strong className="text-gray-800">{usuario.nome}</strong></span>
                        <button onClick={logout} className="text-sm font-bold text-red-500 hover:text-red-700 transition">Sair</button>
                    </div>
                </div>
            </nav>

            {isDrawerOpen && (
                <div 
                    className="fixed inset-0 z-50 bg-black/50 transition-opacity" 
                    onClick={() => setIsDrawerOpen(false)}
                ></div>
            )}

            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-lg">Menu</span>
                    <button onClick={() => setIsDrawerOpen(false)} className="text-gray-500 hover:text-red-500 text-2xl font-bold">×</button>
                </div>
                <div className="flex flex-col py-4">
                    <Link href="/recepcao" onClick={() => setIsDrawerOpen(false)} className={`px-6 py-3 text-base font-semibold ${pathname === '/recepcao' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>Recepção</Link>
                    <Link href="/escalas" onClick={() => setIsDrawerOpen(false)} className={`px-6 py-3 text-base font-semibold ${pathname === '/escalas' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>Escalas</Link>
                    
                    {usuario.perfil === 'ADMIN' && (
                        <>
                            <Link href="/dashboard" onClick={() => setIsDrawerOpen(false)} className={`px-6 py-3 text-base font-semibold ${pathname === '/dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>Liderança</Link>
                            <Link href="/admin" onClick={() => setIsDrawerOpen(false)} className={`px-6 py-3 text-base font-semibold ${pathname === '/admin' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>Painel Admin</Link>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}