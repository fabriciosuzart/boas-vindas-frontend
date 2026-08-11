'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext'; 
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type Visitante = {
  id: string;
  visitante: { 
    nome: string; 
    telefone: string | null; 
    faixa_etaria: string | null; 
  };
  veio_com: string | null;
  primeira_vez: boolean;
  observacoes: string | null;
  status: string; 
  criado_em: string;
  culto: { nome: string; data_hora: string };
  responsavel: { nome: string };
};

export default function Dashboard() {
  const router = useRouter();
  const { usuario, logout } = useAuth(); 

  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  
  const [dataAtual, setDataAtual] = useState(new Date());
  const [modoAnual, setModoAnual] = useState(false);

  // Estados do Modal do WhatsApp
  const [modalZapAberto, setModalZapAberto] = useState(false);
  const [visitanteSelecionado, setVisitanteSelecionado] = useState<Visitante | null>(null);
  const [textoMensagem, setTextoMensagem] = useState('');

  // Estados do Modal de Edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [visitanteEditando, setVisitanteEditando] = useState<Visitante | null>(null);
  // Formulário de Edição
  const [formEdicao, setFormEdicao] = useState({
    nome: '', telefone: '', faixa_etaria: '', veio_com: '', observacoes: ''
  });

  useEffect(() => {
    if (!usuario) router.push('/login');
    else if (usuario.perfil !== 'ADMIN') router.push('/recepcao');
    else carregarVisitantes();
  }, [usuario, router, dataAtual, modoAnual]);

  const carregarVisitantes = async () => {
    setCarregando(true);
    try {
      const ano = dataAtual.getFullYear();
      const mes = modoAnual ? 'todos' : dataAtual.getMonth() + 1;
      
      const res = await fetch(`http://localhost:3333/registros/${ano}/${mes}`);
      if (res.ok) setVisitantes(await res.json());
    } catch (error) { 
      console.error("Erro ao buscar visitantes"); 
    } finally { 
      setCarregando(false); 
    }
  };

  if (!usuario || usuario.perfil !== 'ADMIN') return null;

  const mudarMes = (delta: number) => {
    const novaData = new Date(dataAtual);
    novaData.setMonth(novaData.getMonth() + delta);
    setDataAtual(novaData);
  };

  const mudarAno = (delta: number) => {
    const novaData = new Date(dataAtual);
    novaData.setFullYear(novaData.getFullYear() + delta);
    setDataAtual(novaData);
  };

  const textoDataFormatada = modoAnual 
    ? `Ano de ${dataAtual.getFullYear()}` 
    : dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // --- LÓGICA DE EXCLUSÃO ---
  const excluirVisitante = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o registro de ${nome}?`)) return;

    try {
      const res = await fetch(`http://localhost:3333/registros/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVisitantes(visitantes.filter(v => v.id !== id));
      } else {
        alert("Erro ao excluir o registro.");
      }
    } catch (error) {
      alert("Erro de conexão com o servidor.");
    }
  };

  // --- LÓGICA DE EDIÇÃO ---
  const abrirModalEdicao = (v: Visitante) => {
    setVisitanteEditando(v);
    setFormEdicao({
      nome: v.visitante.nome,
      telefone: v.visitante.telefone || '',
      faixa_etaria: v.visitante.faixa_etaria || '',
      veio_com: v.veio_com || '',
      observacoes: v.observacoes || ''
    });
    setModalEdicaoAberto(true);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitanteEditando) return;

    try {
      // Limpa a máscara do telefone
      const telefoneLimpo = formEdicao.telefone.replace(/\D/g, '');

      const res = await fetch(`http://localhost:3333/registros/${visitanteEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formEdicao.nome,
          telefone: telefoneLimpo,
          faixa_etaria: formEdicao.faixa_etaria,
          veio_com: formEdicao.veio_com,
          observacoes: formEdicao.observacoes
        })
      });

      if (res.ok) {
        const registroAtualizado = await res.json();
        setVisitantes(visitantes.map(v => v.id === visitanteEditando.id ? registroAtualizado : v));
        setModalEdicaoAberto(false);
      } else {
        alert("Erro ao salvar as edições.");
      }
    } catch (error) {
      alert("Erro de conexão ao editar.");
    }
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, ''); 
    if (valor.length > 11) valor = valor.slice(0, 11);
    if (valor.length > 10) valor = valor.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    else if (valor.length > 5) valor = valor.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    else if (valor.length > 2) valor = valor.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
    setFormEdicao({ ...formEdicao, telefone: valor });
  };

  // --- LÓGICA DE STATUS E WHATSAPP ---
  const alterarStatus = async (id: string, novoStatus: string) => {
    try {
      const res = await fetch(`http://localhost:3333/registros/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) setVisitantes(visitantes.map(v => v.id === id ? { ...v, status: novoStatus } : v));
    } catch (error) { alert("Erro ao mudar o status."); }
  };

  const getCorStatus = (status: string) => {
    switch (status) {
      case 'NOVO': return 'bg-red-100 text-red-800 border-red-200';
      case 'EM_CONTATO': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CELULA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FINALIZADO': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const abrirModalWhatsApp = (v: Visitante) => {
    if (!v.visitante.telefone) return;
    const primeiroNome = v.visitante.nome.split(' ')[0];
    const mensagemPadrao = `Olá ${primeiroNome}, a paz do Senhor! 🙏\n\nFicamos muito felizes em receber você no *${v.culto.nome}* na Igreja Cem Porcento Vida.\n\nEsperamos que você tenha se sentido em casa. Gostaríamos muito de te ver nos nossos próximos cultos! Qualquer dúvida ou pedido de oração, estamos à disposição. Deus abençoe!`;
    setTextoMensagem(mensagemPadrao);
    setVisitanteSelecionado(v);
    setModalZapAberto(true);
  };

  const confirmarEnvioWhatsApp = () => {
    if (!visitanteSelecionado || !visitanteSelecionado.visitante.telefone) return;
    if (visitanteSelecionado.status === 'NOVO') alterarStatus(visitanteSelecionado.id, 'EM_CONTATO');

    let numLimpo = visitanteSelecionado.visitante.telefone.replace(/\D/g, '');
    if (numLimpo.length === 10 || numLimpo.length === 11) numLimpo = `55${numLimpo}`;
    
    window.open(`https://wa.me/${numLimpo}?text=${encodeURIComponent(textoMensagem)}`, '_blank');
    setModalZapAberto(false);
  };

  const visitantesFiltrados = visitantes.filter(v => {
    const termo = termoBusca.toLowerCase();
    const nome = v.visitante.nome.toLowerCase();
    const telefone = v.visitante.telefone || '';
    return nome.includes(termo) || telefone.includes(termo);
  });

  const exportarParaExcel = () => {
    const cabecalhos = ['Nome', 'Telefone', 'Faixa Etaria', 'Status', 'Culto Visitado', 'Atendido Por', 'Primeira Vez', 'Veio Com', 'Observacoes', 'Data do Registro'];
    const linhas = visitantesFiltrados.map(v => {
      const dataFormatada = new Date(v.criado_em).toLocaleDateString('pt-BR');
      const obsSegura = v.observacoes ? `"${v.observacoes.replace(/"/g, '""').replace(/\n/g, ' ')}"` : 'Nenhuma';
      const veioComSeguro = v.veio_com ? `"${v.veio_com}"` : 'Sozinho(a)';
      const nomeSeguro = `"${v.visitante.nome}"`;

      return [
        nomeSeguro, v.visitante.telefone || 'Sem telefone', v.visitante.faixa_etaria || 'Nao informada',
        v.status, `"${v.culto.nome}"`, `"${v.responsavel.nome}"`,
        v.primeira_vez ? 'Sim' : 'Nao', veioComSeguro, obsSegura, dataFormatada
      ];
    });

    const conteudoCSV = [cabecalhos.join(';'), ...linhas.map(linha => linha.join(';'))].join('\n');
    const blob = new Blob(["\uFEFF" + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_${textoDataFormatada.replace(/ /g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const novosCount = visitantesFiltrados.filter(v => v.status === 'NOVO').length;
  const emContatoCount = visitantesFiltrados.filter(v => v.status === 'EM_CONTATO').length;
  const celulaCount = visitantesFiltrados.filter(v => v.status === 'CELULA').length;
  const finalizadosCount = visitantesFiltrados.filter(v => v.status === 'FINALIZADO').length;

  const dadosGrafico = [
    { name: 'Novos', total: novosCount, cor: '#ef4444' },
    { name: 'Contato', total: emContatoCount, cor: '#eab308' },
    { name: 'Célula', total: celulaCount, cor: '#3b82f6' },
    { name: 'Finalizado', total: finalizadosCount, cor: '#22c55e' }
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      
      <nav className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4 mb-6 md:mb-8">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 overflow-x-auto pb-2 md:pb-0">
            <span className="font-bold text-gray-800 text-lg flex items-center gap-2 whitespace-nowrap">⛪ Boas-Vindas</span>
            <span className="text-gray-300 hidden md:inline">|</span>
            <button onClick={() => router.push('/recepcao')} className="font-semibold text-gray-500 hover:text-blue-600 transition whitespace-nowrap text-sm md:text-base">Recepção</button>
            <button onClick={() => router.push('/escalas')} className="font-semibold text-gray-500 hover:text-blue-600 transition whitespace-nowrap text-sm md:text-base">Escalas</button>
            <span className="font-semibold text-blue-600 whitespace-nowrap text-sm md:text-base">Liderança</span>
            <button onClick={() => router.push('/admin')} className="font-semibold text-gray-500 hover:text-blue-600 transition whitespace-nowrap text-sm md:text-base">Painel Admin</button>
          </div>
          <div className="flex items-center justify-between md:justify-end space-x-4 border-t md:border-none pt-3 md:pt-0 border-gray-100">
            <span className="text-sm text-gray-600">Olá, <strong className="text-gray-800">{usuario.nome}</strong></span>
            <button onClick={logout} className="text-sm font-bold text-red-500 hover:text-red-700 transition">Sair</button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        
        <div className="mb-6 md:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Painel da Liderança</h1>
            <p className="mt-1 text-sm md:text-base text-gray-500">Métricas e acompanhamento do fluxo de visitantes</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center bg-gray-200 rounded-lg p-1">
              <button onClick={() => setModoAnual(false)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${!modoAnual ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Mensal
              </button>
              <button onClick={() => setModoAnual(true)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${modoAnual ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Anual
              </button>
            </div>
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-full sm:w-auto">
              <button onClick={() => modoAnual ? mudarAno(-1) : mudarMes(-1)} className="px-4 py-2 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition font-bold border-r border-gray-200">&lt;</button>
              <span className="px-4 py-2 font-semibold text-gray-700 min-w-37.5 text-center capitalize text-sm whitespace-nowrap">{textoDataFormatada}</span>
              <button onClick={() => modoAnual ? mudarAno(1) : mudarMes(1)} className="px-4 py-2 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition font-bold border-l border-gray-200">&gt;</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-red-100 text-lg md:text-xl">🔴</div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Novos</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">{carregando ? '-' : novosCount}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-yellow-100 text-lg md:text-xl">🟡</div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Em Contato</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">{carregando ? '-' : emContatoCount}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-blue-100 text-lg md:text-xl">🔵</div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Em Célula</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">{carregando ? '-' : celulaCount}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-green-100 text-lg md:text-xl">🟢</div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Finalizados</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">{carregando ? '-' : finalizadosCount}</p>
            </div>
          </div>
        </div>

        {!carregando && visitantesFiltrados.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
            <h2 className="font-bold text-gray-800 mb-4 text-sm md:text-base border-b pb-2">Funil de Integração - {textoDataFormatada}</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={50}>
                    {dadosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-3 mb-5 gap-4">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input 
              type="text" 
              className="block w-full p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm" 
              placeholder="Buscar por nome ou celular..." 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </div>
          
          <button 
            onClick={exportarParaExcel}
            disabled={visitantesFiltrados.length === 0}
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
            </svg>
            Exportar Excel
          </button>
        </div>
        
        {carregando ? (
          <p className="text-center text-gray-500 py-8">Carregando dados...</p>
        ) : visitantesFiltrados.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 font-medium">Nenhum visitante encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visitantesFiltrados.map((v) => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 text-lg leading-tight">{v.visitante.nome}</h3>
                      {/* BOTOES DE EDITAR E EXCLUIR */}
                      <button onClick={() => abrirModalEdicao(v)} className="text-gray-400 hover:text-blue-600 transition" title="Editar">
                        ✏️
                      </button>
                      <button onClick={() => excluirVisitante(v.id, v.visitante.nome)} className="text-gray-400 hover:text-red-600 transition" title="Excluir">
                        🗑️
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 font-medium">{v.visitante.telefone || 'Sem contato'}</p>
                  </div>
                  <select 
                    value={v.status}
                    onChange={(e) => alterarStatus(v.id, e.target.value)}
                    className={`text-xs font-bold uppercase rounded-md px-2 py-1 border outline-none cursor-pointer ml-2 ${getCorStatus(v.status)}`}
                  >
                    <option value="NOVO">🔴 Novo</option>
                    <option value="EM_CONTATO">🟡 Contato</option>
                    <option value="CELULA">🔵 Célula</option>
                    <option value="FINALIZADO">🟢 Finalizado</option>
                  </select>
                </div>
                <div className="p-4 flex-1 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">Culto</span>
                      <span className="text-gray-700 font-medium">{v.culto.nome}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">Recepção</span>
                      <span className="text-gray-700 font-medium">{v.responsavel.nome}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">Faixa Etária</span>
                      <span className="text-gray-700">{v.visitante.faixa_etaria || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">Veio Com</span>
                      <span className="text-gray-700">{v.veio_com || '-'}</span>
                    </div>
                  </div>
                  {v.observacoes && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="block text-xs font-semibold text-gray-400 uppercase mb-1">Observações</span>
                      <p className="text-gray-600 text-xs italic bg-gray-50 p-2 rounded border border-gray-100">
                        "{v.observacoes}"
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-gray-50 mt-auto">
                  <button 
                    onClick={() => abrirModalWhatsApp(v)}
                    disabled={!v.visitante.telefone}
                    className="w-full flex items-center justify-center rounded-lg bg-green-500 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    💬 Enviar Mensagem
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DO WHATSAPP */}
      {modalZapAberto && visitanteSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 font-bold text-gray-800 text-lg">Mensagem para {visitanteSelecionado.visitante.nome}</h3>
            <p className="text-sm text-gray-500 mb-4">Edite a mensagem abaixo antes de abrir o WhatsApp.</p>
            <textarea
              className="w-full h-48 rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
              value={textoMensagem}
              onChange={(e) => setTextoMensagem(e.target.value)}
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setModalZapAberto(false)} className="w-full rounded-lg bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancelar</button>
              <button onClick={confirmarEnvioWhatsApp} className="w-full rounded-lg bg-green-600 py-3 text-sm font-bold text-white shadow-md hover:bg-green-700">Enviar e Marcar "Em Contato"</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE VISITANTE */}
      {modalEdicaoAberto && visitanteEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-gray-800 text-lg border-b pb-2">Editar Visitante</h3>
            
            <form onSubmit={salvarEdicao} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Nome</label>
                <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                  value={formEdicao.nome} onChange={e => setFormEdicao({...formEdicao, nome: e.target.value})} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Telefone</label>
                <input type="text" className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                  value={formEdicao.telefone} onChange={handleTelefoneChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Faixa Etária</label>
                  <select className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                    value={formEdicao.faixa_etaria} onChange={e => setFormEdicao({...formEdicao, faixa_etaria: e.target.value})}>
                    <option value="">Selecione...</option>
                    <option value="Criança">Criança</option>
                    <option value="Jovem">Jovem</option>
                    <option value="Adulto">Adulto</option>
                    <option value="Idoso">Idoso</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Veio Com</label>
                  <input type="text" className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                    value={formEdicao.veio_com} onChange={e => setFormEdicao({...formEdicao, veio_com: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Observações</label>
                <textarea rows={2} className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500 resize-none"
                  value={formEdicao.observacoes} onChange={e => setFormEdicao({...formEdicao, observacoes: e.target.value})} />
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setModalEdicaoAberto(false)} className="w-full rounded-lg bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">
                  Cancelar
                </button>
                <button type="submit" className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}