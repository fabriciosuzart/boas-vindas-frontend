'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

type Usuario = { id: string; nome: string; telefone: string | null; perfil: string; };
type Bloqueio = { id: string; data_iso: string; };
type EscalaCulto = { id: string; nome: string; data_hora: string; escalas: { id: string; usuario: { id: string; nome: string; telefone: string | null } }[]; };

export default function Escalas() {
  const router = useRouter();
  const { usuario } = useAuth(); 
  const [cultos, setCultos] = useState<EscalaCulto[]>([]);
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
  const [isGerando, setIsGerando] = useState(false);
  const [cultoSelecionado, setCultoSelecionado] = useState<string | null>(null);
  const [modalDisponibilidadeAberto, setModalDisponibilidadeAberto] = useState(false);
  const [bloqueiosSalvos, setBloqueiosSalvos] = useState<Bloqueio[]>([]);
  const [datasNovas, setDatasNovas] = useState<string[]>([]);
  const [novaDataInput, setNovaDataInput] = useState('');

  useEffect(() => { if (!usuario) router.push('/login'); }, [usuario, router]);

  const carregarEscalas = async () => {
    try {
      const res = await fetch('https://boas-vindas-backend.onrender.com/escalas');
      if (res.ok) setCultos(await res.json());
    } catch (error) { }
  };

  useEffect(() => {
    if (usuario) {
      carregarEscalas();
      if (usuario.perfil === 'ADMIN') fetch('https://boas-vindas-backend.onrender.com/usuarios').then(res => res.json()).then(data => setTodosUsuarios(data));
    }
  }, [usuario]);

  if (!usuario) return null;
  const isAdmin = usuario.perfil === 'ADMIN';

  const gerarSorteio = async () => { /* Mantem funções do sistema iguais */ setIsGerando(true); try { const res = await fetch('https://boas-vindas-backend.onrender.com/escalas/gerar', { method: 'POST' }); if (res.ok) carregarEscalas(); } catch (e) { } finally { setIsGerando(false); } };
  const removerManual = async (id: string) => { await fetch(`https://boas-vindas-backend.onrender.com/escalas/${id}`, { method: 'DELETE' }); carregarEscalas(); };
  
  const confirmarAdicao = async (usuarioId: string, forcar = false) => {
    if (!cultoSelecionado) return;
    try {
      const res = await fetch('https://boas-vindas-backend.onrender.com/escalas/adicionar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ culto_id: cultoSelecionado, usuario_id: usuarioId, forcar }) });
      const data = await res.json();
      if (res.status === 409) { if (confirm(data.aviso)) confirmarAdicao(usuarioId, true); } 
      else if (res.ok) { setCultoSelecionado(null); carregarEscalas(); } 
    } catch (e) { }
  };

  const abrirModalDisponibilidade = async () => { setDatasNovas([]); setNovaDataInput(''); try { const res = await fetch(`https://boas-vindas-backend.onrender.com/disponibilidade/${usuario.id}`); if (res.ok) setBloqueiosSalvos(await res.json()); } catch (e) { } setModalDisponibilidadeAberto(true); };
  const adicionarDataNova = () => { if (novaDataInput && !datasNovas.includes(novaDataInput)) { setDatasNovas([...datasNovas, novaDataInput]); setNovaDataInput(''); } };
  const removerBloqueioSalvo = async (id: string) => { await fetch(`https://boas-vindas-backend.onrender.com/disponibilidade/${id}`, { method: 'DELETE' }); setBloqueiosSalvos(bloqueiosSalvos.filter(b => b.id !== id)); };
  const salvarNovasDatas = async () => { if (datasNovas.length === 0) return setModalDisponibilidadeAberto(false); try { const res = await fetch('https://boas-vindas-backend.onrender.com/disponibilidade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuario.id, datas_iso: datasNovas }) }); if (res.ok) { alert("Agenda atualizada!"); setModalDisponibilidadeAberto(false); } } catch (e) { } };

  const formatarData = (dataIso: string) => {
    const data = new Date(dataIso);
    return { dia: data.getDate().toString().padStart(2, '0'), mes: data.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''), diaSemana: data.toLocaleString('pt-BR', { weekday: 'long' }).split('-')[0], hora: data.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-5xl px-6 pt-4">
        <div className="mb-8 flex flex-col space-y-4 md:flex-row md:items-end md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Escala Mensal</h1>
            <p className="mt-1 text-gray-500">Próximos cultos e equipe escalada</p>
          </div>
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
            <button onClick={abrirModalDisponibilidade} className="rounded-lg border border-blue-600 px-4 py-3 text-base font-bold text-blue-600 transition hover:bg-blue-50">📅 Minha Disponibilidade</button>
            {isAdmin && <button onClick={gerarSorteio} disabled={isGerando} className="rounded-lg bg-gray-800 px-4 py-3 text-base font-bold text-white shadow-md transition hover:bg-black disabled:bg-gray-400">⚙️ Gerar Automático</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cultos.map((culto) => {
            const { dia, mes, diaSemana, hora } = formatarData(culto.data_hora);
            return (
              <div key={culto.id} className="flex overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
                <div className="flex w-24 flex-col items-center justify-center bg-blue-50/50 p-4 border-r border-gray-100">
                  <span className="text-sm font-semibold text-blue-600 uppercase">{mes}</span>
                  <span className="text-3xl font-bold text-gray-800">{dia}</span>
                </div>
                <div className="flex flex-1 flex-col justify-center p-4">
                  <span className="text-xs font-bold uppercase text-gray-400">{diaSemana} • {hora}</span>
                  <h3 className="mb-3 font-bold text-black text-base leading-tight">{culto.nome}</h3>
                  <div className="flex flex-col gap-2">
                    {culto.escalas.map((escala) => (
                      <div key={escala.id} className="flex items-center justify-between bg-blue-50 px-2.5 py-1.5 border border-blue-100 rounded">
                        <span className="text-base font-semibold text-blue-800">{escala.usuario.nome}</span>
                        {isAdmin && <button onClick={() => removerManual(escala.id)} className="font-bold text-red-500 text-lg">×</button>}
                      </div>
                    ))}
                    {isAdmin && <button onClick={() => setCultoSelecionado(culto.id)} className="border border-dashed border-gray-400 py-1.5 text-sm font-bold text-gray-600 mt-1 rounded hover:bg-gray-100">+ Voluntário</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cultoSelecionado && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-gray-800 text-lg">Adicionar Voluntário</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {todosUsuarios.map(u => (
                <button key={u.id} onClick={() => confirmarAdicao(u.id)} className="w-full rounded border p-3 text-left hover:bg-blue-50 transition"><p className="font-bold text-gray-800 text-base">{u.nome}</p></button>
              ))}
            </div>
            <button onClick={() => setCultoSelecionado(null)} className="mt-4 w-full rounded bg-gray-100 py-3 text-base font-bold text-gray-700">Cancelar</button>
          </div>
        </div>
      )}

      {modalDisponibilidadeAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-gray-800 text-lg border-b pb-2 mb-4">Gerenciar Indisponibilidade</h3>
            <div className="mb-4">
              {bloqueiosSalvos.map(b => (
                <span key={b.id} className="inline-flex m-1 rounded bg-red-100 px-3 py-1.5 text-sm font-bold text-red-800">{new Date(b.data_iso + "T12:00:00").toLocaleDateString('pt-BR')} <button onClick={() => removerBloqueioSalvo(b.id)} className="ml-2 text-red-500">×</button></span>
              ))}
            </div>
            <div className="mb-6 border-t pt-4">
              <div className="flex gap-2 mb-3">
                <input type="date" className="flex-1 rounded border p-3 text-base bg-white" value={novaDataInput} onChange={e => setNovaDataInput(e.target.value)} />
                <button onClick={adicionarDataNova} className="rounded bg-gray-800 px-4 py-3 text-base text-white font-bold">Add</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalDisponibilidadeAberto(false)} className="w-full rounded bg-gray-100 py-3 text-base font-bold text-gray-700">Fechar</button>
              <button onClick={salvarNovasDatas} className="w-full rounded bg-blue-600 py-3 text-base font-bold text-white">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}