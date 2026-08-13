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

  const gerarSorteio = async () => { setIsGerando(true); try { const res = await fetch('https://boas-vindas-backend.onrender.com/escalas/gerar', { method: 'POST' }); if (res.ok) carregarEscalas(); } catch (e) { } finally { setIsGerando(false); } };
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

  // FUNÇÕES RESTAURADAS DO WHATSAPP
  const limparTelefone = (telefone: string | null) => {
    if (!telefone) return '';
    let num = telefone.replace(/\D/g, '');
    if (num.length === 10 || num.length === 11) num = `55${num}`;
    return num;
  };

  const enviarLembreteIndividual = (nome: string, telefone: string | null, cultoNome: string, dataIso: string) => {
    const numLimpo = limparTelefone(telefone);
    if (!numLimpo) { alert(`O voluntário ${nome} não tem um telefone cadastrado!`); return; }
    const { dia, mes, diaSemana, hora } = formatarData(dataIso);
    const msg = `Olá ${nome}! 👋\n\nLembrando que você está escalado(a) para o *${cultoNome}* neste ${diaSemana} (${dia}/${mes}) às ${hora}.\n\nContamos com você! 🙏`;
    window.open(`https://wa.me/${numLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const publicarNoGrupo = () => {
    if (cultos.length === 0) return;
    let msg = `📢 *ESCALA - EQUIPE BOAS-VINDAS* 📢\n\n`;
    cultos.forEach(culto => {
      if (culto.escalas.length > 0) {
        const { dia, mes, diaSemana, hora } = formatarData(culto.data_hora);
        msg += `🗓️ *${diaSemana} (${dia}/${mes}) - ${hora}*\n⛪ ${culto.nome}\n`;
        culto.escalas.forEach(e => { msg += `👤 *${e.usuario.nome}*\n`; });
        msg += `\n`;
      }
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // MODAL DE DISPONIBILIDADE CORRIGIDO (Mostrando as datas)
  const abrirModalDisponibilidade = async () => { setDatasNovas([]); setNovaDataInput(''); try { const res = await fetch(`https://boas-vindas-backend.onrender.com/disponibilidade/${usuario.id}`); if (res.ok) setBloqueiosSalvos(await res.json()); } catch (e) { } setModalDisponibilidadeAberto(true); };
  const adicionarDataNova = () => { if (novaDataInput && !datasNovas.includes(novaDataInput)) { setDatasNovas([...datasNovas, novaDataInput]); setNovaDataInput(''); } };
  const removerBloqueioSalvo = async (id: string) => { await fetch(`https://boas-vindas-backend.onrender.com/disponibilidade/${id}`, { method: 'DELETE' }); setBloqueiosSalvos(bloqueiosSalvos.filter(b => b.id !== id)); };
  const salvarNovasDatas = async () => { if (datasNovas.length === 0) return setModalDisponibilidadeAberto(false); try { const res = await fetch('https://boas-vindas-backend.onrender.com/disponibilidade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuario.id, datas_iso: datasNovas }) }); if (res.ok) { alert("Agenda atualizada!"); setModalDisponibilidadeAberto(false); carregarEscalas(); } } catch (e) { } };

  const formatarData = (dataIso: string) => {
    const data = new Date(dataIso);
    return { dia: data.getDate().toString().padStart(2, '0'), mes: data.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''), diaSemana: data.toLocaleString('pt-BR', { weekday: 'long' }).split('-')[0], hora: data.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24 pt-8">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-8 flex flex-col space-y-4 md:flex-row md:items-end md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Escala Mensal</h1>
            <p className="mt-1 text-gray-500">Próximos cultos e equipe escalada</p>
          </div>
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
            <button onClick={abrirModalDisponibilidade} className="rounded-lg border border-blue-600 px-4 py-3 text-base font-bold text-blue-600 transition hover:bg-blue-50">📅 Minha Disponibilidade</button>
            {isAdmin && (
              <>
                <button onClick={gerarSorteio} disabled={isGerando} className="rounded-lg bg-gray-800 px-4 py-3 text-base font-bold text-white shadow-md transition hover:bg-black disabled:bg-gray-400">⚙️ Gerar Automático</button>
                <button onClick={publicarNoGrupo} className="rounded-lg bg-green-600 px-4 py-3 text-base font-bold text-white shadow-md transition hover:bg-green-700">📲 Publicar WhatsApp</button>
              </>
            )}
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
                        {isAdmin && (
                          <div className="flex items-center space-x-3">
                            <button onClick={() => enviarLembreteIndividual(escala.usuario.nome, escala.usuario.telefone, culto.nome, culto.data_hora)} className="text-green-600 hover:text-green-800">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" /></svg>
                            </button>
                            <button onClick={() => removerManual(escala.id)} className="font-bold text-red-500 text-lg">×</button>
                          </div>
                        )}
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
            
            {bloqueiosSalvos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-500 mb-2">Já Bloqueados:</p>
                {bloqueiosSalvos.map(b => (
                  <span key={b.id} className="inline-flex m-1 rounded bg-red-100 px-3 py-1.5 text-sm font-bold text-red-800">{new Date(b.data_iso + "T12:00:00").toLocaleDateString('pt-BR')} <button onClick={() => removerBloqueioSalvo(b.id)} className="ml-2 text-red-500">×</button></span>
                ))}
              </div>
            )}

            {datasNovas.length > 0 && (
              <div className="mb-4 border-t pt-2">
                <p className="text-xs font-bold text-gray-500 mb-2">Novas Datas (Não Salvas):</p>
                {datasNovas.map(d => (
                  <span key={d} className="inline-flex m-1 rounded bg-yellow-100 px-3 py-1.5 text-sm font-bold text-yellow-800">{new Date(d + "T12:00:00").toLocaleDateString('pt-BR')} <button onClick={() => setDatasNovas(datasNovas.filter(x => x !== d))} className="ml-2 text-yellow-600">×</button></span>
                ))}
              </div>
            )}

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