'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  const { login } = useAuth(); 

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpo = e.target.value.replace(/\D/g, ''); 
    setTelefone(valorLimpo.slice(0, 11)); // Trava estritamente em 11 caracteres no estado
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    // INTELIGÊNCIA DO DDD CORRIGIDA:
    let telefoneFinal = telefone;
    // Se digitou 9 ou menos números, colocamos o 13. Se digitou 10 ou 11 (já com DDD), deixamos quieto.
    if (telefoneFinal.length <= 9) {
      telefoneFinal = `13${telefoneFinal}`;
    }

    try {
      const res = await fetch('http://localhost:3333/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneFinal, senha })
      });

      const data = await res.json();
      if (res.ok) {
        login(data.usuario);
      } else {
        setErro(data.erro || "Telefone ou senha incorretos.");
      }
    } catch (err) { setErro("Erro ao conectar."); } 
    finally { setCarregando(false); }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
        
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <span className="text-3xl">⛪</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Equipe Boas-Vindas</h1>
          <p className="mt-2 text-sm text-gray-500">Faça login para ver sua escala e disponibilidade</p>
        </div>

        {erro && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 text-center font-semibold">{erro}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Telefone</label>
            <input 
              type="text" 
              required
              maxLength={11} // Trava física no HTML para não passar de 11
              placeholder="Ex: 13999999999 ou 999999999"
              className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={telefone}
              onChange={handleTelefoneChange} 
            />
            <p className="text-xs text-gray-400 mt-1">Digite apenas números. (DDD opcional para 13).</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Senha</label>
            <input type="password" required placeholder="Sua senha de acesso" className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={senha} onChange={e => setSenha(e.target.value)} />
          </div>
          <button type="submit" disabled={carregando} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 mt-2">
            {carregando ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </main>
  );
}