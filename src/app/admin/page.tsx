'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

type Usuario = {
    id: string;
    nome: string;
    telefone: string | null;
    perfil: string;
};

type Culto = {
    id: string;
    nome: string;
    data_hora: string;
};

export default function AdminPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cultos, setCultos] = useState<Culto[]>([]);

    // Estados para formulário de novo voluntário
    const [novoNome, setNovoNome] = useState('');
    const [novoTelefone, setNovoTelefone] = useState('');
    const [novoPerfil, setNovoPerfil] = useState('VOLUNTARIO');
    const [editandoId, setEditandoId] = useState<string | null>(null);

    // Estados para formulário de Culto Manual (Extra)
    const [nomeCultoManual, setNomeCultoManual] = useState('');
    const [dataCultoManual, setDataCultoManual] = useState('');

    // Estados para o Gerador e Exclusão em Massa de Mês
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [isProcessando, setIsProcessando] = useState(false);

    const { usuario, logout } = useAuth();
    const router = useRouter();

    // Estados das opções de geração automática
    const [gerarFamilia, setGerarFamilia] = useState(true);
    const [gerarCelebracao, setGerarCelebracao] = useState(true);
    const [gerarAviva, setGerarAviva] = useState(true);
    const [gerarOnlife, setGerarOnlife] = useState(true);

    // PROTEÇÃO DE ROTA:
    useEffect(() => {
        if (!usuario) {
            router.push('/login');
        } else if (usuario.perfil !== 'ADMIN') {
            router.push('/escalas');
        }
    }, [usuario, router]);

    // MÁSCARA DE TELEFONE
    const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let valor = e.target.value.replace(/\D/g, ''); 
        if (valor.length > 11) valor = valor.slice(0, 11);
        if (valor.length > 10) valor = valor.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
        else if (valor.length > 5) valor = valor.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        else if (valor.length > 2) valor = valor.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
        setNovoTelefone(valor);
    };

    const carregarDados = async () => {
        try {
            const resU = await fetch('https://boas-vindas-backend.onrender.com/usuarios');
            if (resU.ok) setUsuarios(await resU.json());

            const resC = await fetch('https://boas-vindas-backend.onrender.com/cultos');
            if (resC.ok) setCultos(await resC.json());
        } catch (error) {
            console.error("Erro ao carregar dados admin", error);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    // --- GERENCIAMENTO DE VOLUNTÁRIOS ---
    const handleSalvarVoluntario = async (e: React.FormEvent) => {
        e.preventDefault();
        const telefoneLimpo = novoTelefone.replace(/\D/g, '');

        if (telefoneLimpo.length < 10) {
            alert("Por favor, digite um telefone válido com o DDD (Ex: 11999999999).");
            return;
        }

        try {
            const url = editandoId ? `https://boas-vindas-backend.onrender.com/usuarios/${editandoId}` : 'https://boas-vindas-backend.onrender.com/usuarios';
            const method = editandoId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: novoNome, telefone: telefoneLimpo, senha_hash: '123', perfil: novoPerfil })
            });

            if (res.ok) {
                alert(editandoId ? "Voluntário atualizado com sucesso!" : "Voluntário cadastrado com sucesso!");
                setNovoNome(''); setNovoTelefone(''); setEditandoId(null); setNovoPerfil('VOLUNTARIO');
                carregarDados();
            } else { alert("Erro ao salvar voluntário."); }
        } catch (err) { alert("Erro de conexão."); }
    };

    const iniciarEdicao = (u: Usuario) => {
        setEditandoId(u.id);
        setNovoNome(u.nome);
        
        // Aplica a máscara no telefone existente para jogar no form
        let tel = u.telefone || '';
        if (tel.length === 11) tel = tel.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
        else if (tel.length === 10) tel = tel.replace(/^(\d\d)(\d{4})(\d{4}).*/, '($1) $2-$3');
        
        setNovoTelefone(tel);
        setNovoPerfil(u.perfil);
    };

    const handleDeleteUsuario = async (id: string, nome: string) => {
        if (!window.confirm(`⚠️ Tem certeza que deseja remover permanentemente o voluntário "${nome}"?`)) return;
        try {
            const res = await fetch(`https://boas-vindas-backend.onrender.com/usuarios/${id}`, { method: 'DELETE' });
            if (res.ok) carregarDados();
            else alert("Não foi possível remover (verifique se há escalas vinculadas).");
        } catch (err) { alert("Erro ao remover."); }
    };

    // --- GERENCIAMENTO DE CULTOS ---
    const handleGerarMes = async () => {
        if (!window.confirm(`Deseja gerar automaticamente os cultos selecionados para o mês ${mesSelecionado}/${anoSelecionado}?`)) return;
        setIsProcessando(true);

        const templates = [];
        if (gerarFamilia) templates.push({ diaSemana: 0, hora: 10, minuto: 0, nome: "Culto da Família" });
        if (gerarCelebracao) templates.push({ diaSemana: 0, hora: 19, minuto: 0, nome: "Culto da Celebração" });
        if (gerarAviva) templates.push({ diaSemana: 3, hora: 20, minuto: 0, nome: "Culto Aviva" });
        if (gerarOnlife) templates.push({ diaSemana: 6, hora: 19, minuto: 0, nome: "Culto Onlife" });

        try {
            const res = await fetch('https://boas-vindas-backend.onrender.com/cultos/gerar-mes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ano: Number(anoSelecionado), mes: Number(mesSelecionado), templates })
            });
            const data = await res.json();
            if (res.ok) { alert(data.mensagem); carregarDados(); }
            else { alert(data.erro); }
        } catch (err) { alert("Erro ao conectar."); }
        finally { setIsProcessando(false); }
    };

    const handleAddCultoManual = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('https://boas-vindas-backend.onrender.com/cultos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nomeCultoManual, data_hora: dataCultoManual })
            });
            if (res.ok) {
                alert("Culto extra cadastrado com sucesso!");
                setNomeCultoManual(''); setDataCultoManual('');
                carregarDados();
            } else { alert("Erro ao cadastrar culto."); }
        } catch (err) { alert("Erro de conexão."); }
    };

    const handleDeleteCulto = async (id: string, nome: string) => {
        if (!window.confirm(`⚠️ Tem certeza que deseja remover o culto "${nome}"?`)) return;
        try {
            const res = await fetch(`https://boas-vindas-backend.onrender.com/cultos/${id}`, { method: 'DELETE' });
            if (res.ok) carregarDados();
            else alert("Erro ao remover culto.");
        } catch (err) { alert("Erro ao remover."); }
    };

    // --- NOVAS FUNÇÕES DE LIMPEZA E ZONA DE PERIGO ---
    
    const limparEscalasDoMes = async () => {
        if (!window.confirm(`Tem certeza que deseja apagar TODAS as escalas do mês ${mesSelecionado}/${anoSelecionado}? Os cultos não serão apagados.`)) return;
        setIsProcessando(true);
        try {
            const res = await fetch(`https://boas-vindas-backend.onrender.com/escalas/mes/${anoSelecionado}/${mesSelecionado}`, { method: 'DELETE' });
            if (res.ok) { alert("✅ Escalas do mês foram limpas com sucesso!"); carregarDados(); }
            else alert("❌ Erro ao limpar as escalas.");
        } catch (error) { alert("Erro de conexão com o servidor."); }
        finally { setIsProcessando(false); }
    };

    const limparCultosDoMes = async () => {
        if (!window.confirm(`ATENÇÃO: Você vai apagar TODOS os Cultos do mês ${mesSelecionado}/${anoSelecionado}. Isso apagará as escalas e visitas desse mês também. Deseja continuar?`)) return;
        setIsProcessando(true);
        try {
            const res = await fetch(`https://boas-vindas-backend.onrender.com/cultos/${anoSelecionado}/${mesSelecionado}`, { method: 'DELETE' });
            if (res.ok) { alert("✅ Cultos do mês apagados com sucesso!"); carregarDados(); }
            else alert("❌ Erro ao apagar os cultos.");
        } catch (error) { alert("Erro de conexão com o servidor."); }
        finally { setIsProcessando(false); }
    };

    const zerarSistema = async () => {
        if (!window.confirm("🚨 ALERTA VERMELHO: Você está prestes a apagar TODOS os Cultos, Escalas e Visitas de TODA a história da igreja. Isso NÃO PODE ser desfeito!")) return;
        
        const confirmacaoDigitada = window.prompt('Para confirmar a exclusão, digite a palavra "ZERAR" no campo abaixo:');
        if (confirmacaoDigitada !== 'ZERAR') {
            alert("Exclusão cancelada. Você não digitou 'ZERAR' corretamente.");
            return;
        }

        setIsProcessando(true);
        try {
            const res = await fetch(`https://boas-vindas-backend.onrender.com/sistema/zerar-tudo`, { method: 'DELETE' });
            if (res.ok) {
                alert("💥 SISTEMA ZERADO COM SUCESSO! O banco de dados está limpo para recomeçar.");
                carregarDados();
            } else { alert("❌ Erro ao zerar o sistema."); }
        } catch (error) { alert("Erro de conexão com o servidor."); }
        finally { setIsProcessando(false); }
    };

    if (!usuario || usuario.perfil !== 'ADMIN') return null;

    return (
        <main className="min-h-screen bg-gray-50 pb-12">

            {/* NAVEGAÇÃO */}
            <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 mb-8">
                <div className="mx-auto max-w-6xl flex items-center justify-between">
                    <div className="flex items-center space-x-4 md:space-x-6 overflow-x-auto">
                        <span className="font-bold text-gray-800 text-lg flex items-center gap-2">⛪ Boas-Vindas</span>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => router.push('/recepcao')} className="font-semibold text-gray-500 hover:text-blue-600 transition">Recepção</button>
                        <button onClick={() => router.push('/escalas')} className="font-semibold text-gray-500 hover:text-blue-600 transition">Escalas</button>
                        <button onClick={() => router.push('/dashboard')} className="font-semibold text-gray-500 hover:text-blue-600 transition">Liderança</button>
                        <span className="font-semibold text-blue-600">Painel Admin</span>
                    </div>
                    <div className="flex items-center space-x-4 ml-4">
                        <span className="text-sm text-gray-600 hidden sm:inline">Olá, <strong className="text-gray-800">{usuario.nome}</strong></span>
                        <button onClick={logout} className="text-sm font-bold text-red-500 hover:text-red-700 transition">Sair</button>
                    </div>
                </div>
            </nav>

            <div className="mx-auto max-w-6xl px-6">
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-3xl font-bold text-gray-800">Painel do Administrador</h1>
                    <p className="mt-1 text-gray-500">Gestão de equipe, calendário de cultos e manutenção do sistema</p>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">

                    {/* SEÇÃO 1: VOLUNTÁRIOS */}
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                        <h2 className="mb-4 text-xl font-bold text-gray-800">Equipe de Boas-Vindas</h2>
                        <form onSubmit={handleSalvarVoluntario} className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 border">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-700">
                                    {editandoId ? '✏️ Editando Voluntário' : '➕ Adicionar Novo Membro'}
                                </p>
                                {editandoId && (
                                    <button type="button" onClick={() => { setEditandoId(null); setNovoNome(''); setNovoTelefone(''); }} className="text-xs text-red-500 underline">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            <input type="text" placeholder="Nome Completo" required className="w-full rounded border p-2 text-sm bg-white" value={novoNome} onChange={e => setNovoNome(e.target.value)} />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" placeholder="WhatsApp (com DDD)" className="w-full rounded border p-2 text-sm bg-white" value={novoTelefone} onChange={handleTelefoneChange} />
                                <select className="w-full rounded border p-2 text-sm bg-white" value={novoPerfil} onChange={e => setNovoPerfil(e.target.value)}>
                                    <option value="VOLUNTARIO">Voluntário</option>
                                    <option value="ADMIN">Líder / Admin</option>
                                </select>
                            </div>
                            <button type="submit" className={`w-full rounded py-2 text-sm font-bold text-white transition ${editandoId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {editandoId ? 'Salvar Alterações' : 'Cadastrar Membro'}
                            </button>
                        </form>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                            {usuarios.map(u => (
                                <div key={u.id} className="flex items-center justify-between rounded border p-3 bg-white">
                                    <div>
                                        <p className="font-semibold text-gray-800">{u.nome}</p>
                                        <p className="text-xs text-gray-500">{u.telefone || 'Sem telefone'} • <span className="font-bold text-blue-600">{u.perfil}</span></p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => iniciarEdicao(u)} className="rounded bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-100">Editar</button>
                                        <button onClick={() => handleDeleteUsuario(u.id, u.nome)} className="rounded bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Remover</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SEÇÃO 2: CULTOS E AGENDA */}
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col">
                        <h2 className="mb-4 text-xl font-bold text-gray-800">Calendário de Cultos</h2>

                        <div className="mb-6 rounded-lg bg-blue-50/50 p-4 border border-blue-100 space-y-3">
                            <p className="text-sm font-semibold text-blue-950">Gestão Mensal Automática</p>
                            <div className="grid grid-cols-2 gap-2">
                                <select className="w-full rounded border p-2 text-sm bg-white outline-none" value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))}>
                                    <option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option><option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option><option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                                </select>
                                <input type="number" className="w-full rounded border p-2 text-sm bg-white outline-none" value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1 mb-2 bg-white p-3 rounded border text-sm">
                                <p className="font-semibold text-gray-700 mb-2">Quais cultos gerar?</p>
                                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={gerarFamilia} onChange={e => setGerarFamilia(e.target.checked)} /><span>Domingo 10h - Família</span></label>
                                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={gerarCelebracao} onChange={e => setGerarCelebracao(e.target.checked)} /><span>Domingo 19h - Celebração</span></label>
                                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={gerarAviva} onChange={e => setGerarAviva(e.target.checked)} /><span>Quarta 20h - Aviva</span></label>
                                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={gerarOnlife} onChange={e => setGerarOnlife(e.target.checked)} /><span>Sábado 19h - Onlife</span></label>
                            </div>
                            <button onClick={handleGerarMes} disabled={isProcessando} className="w-full rounded bg-blue-600 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-blue-300">
                                🚀 Gerar Mês {mesSelecionado}/{anoSelecionado}
                            </button>
                        </div>

                        <form onSubmit={handleAddCultoManual} className="mb-6 space-y-2 rounded-lg bg-gray-50 p-3 border">
                            <p className="text-xs font-semibold text-gray-700">➕ Adicionar Culto Extra Manual</p>
                            <input type="text" placeholder="Nome do Culto (Ex: Vigília, Encontro)" required className="w-full rounded border p-2 text-xs bg-white" value={nomeCultoManual} onChange={e => setNomeCultoManual(e.target.value)} />
                            <input type="datetime-local" required className="w-full rounded border p-2 text-xs bg-white" value={dataCultoManual} onChange={e => setDataCultoManual(e.target.value)} />
                            <button type="submit" className="w-full rounded bg-green-600 py-1.5 text-xs font-bold text-white transition hover:bg-green-700">Salvar Culto Extra</button>
                        </form>

                        <p className="mb-2 text-sm font-semibold text-gray-700">Cultos Agendados</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 flex-1">
                            {cultos.map(c => (
                                <div key={c.id} className="flex items-center justify-between rounded border p-2.5 bg-white">
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{c.nome}</p>
                                        <p className="text-xs text-gray-500">{new Date(c.data_hora).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <button onClick={() => handleDeleteCulto(c.id, c.nome)} className="rounded bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Remover</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SEÇÃO 3: LIMPEZA E ZONA DE PERIGO */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 mb-8">
                    <h2 className="mb-4 text-xl font-bold text-gray-800 border-b pb-2">Manutenção e Limpeza</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        As ações abaixo serão aplicadas ao mês <strong>{mesSelecionado}/{anoSelecionado}</strong> selecionado no quadro de cultos acima.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <button onClick={limparEscalasDoMes} disabled={isProcessando} className="flex-1 py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg shadow-sm transition">
                            🧹 Limpar APENAS Escalas do Mês
                        </button>
                        <button onClick={limparCultosDoMes} disabled={isProcessando} className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-sm transition">
                            🗑️ Apagar Cultos do Mês
                        </button>
                    </div>

                    <div className="bg-red-50 p-5 rounded-lg border-2 border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🚨</span>
                            <h3 className="font-bold text-red-800 uppercase tracking-wide">Zona de Perigo (Reset Total)</h3>
                        </div>
                        <p className="text-sm text-red-700 mb-4">
                            Esta ação é <strong>IRREVERSÍVEL</strong>. Apagará cultos, escalas e visitantes de <strong>toda a história</strong> (mantém apenas usuários).
                        </p>
                        <button onClick={zerarSistema} disabled={isProcessando} className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition">
                            🔥 ZERAR TODO O SISTEMA
                        </button>
                    </div>
                </div>

            </div>
        </main>
    );
}