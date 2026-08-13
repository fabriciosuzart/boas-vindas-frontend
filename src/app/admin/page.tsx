'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

type Usuario = { id: string; nome: string; telefone: string | null; perfil: string; };
type Culto = { id: string; nome: string; data_hora: string; };

export default function AdminPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cultos, setCultos] = useState<Culto[]>([]);
    const [novoNome, setNovoNome] = useState('');
    const [novoTelefone, setNovoTelefone] = useState('');
    const [novoPerfil, setNovoPerfil] = useState('VOLUNTARIO');
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [nomeCultoManual, setNomeCultoManual] = useState('');
    const [dataCultoManual, setDataCultoManual] = useState('');
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [isProcessando, setIsProcessando] = useState(false);

    const { usuario, logout } = useAuth();
    const router = useRouter();

    const [gerarFamilia, setGerarFamilia] = useState(true);
    const [gerarCelebracao, setGerarCelebracao] = useState(true);
    const [gerarOnlife, setGerarOnlife] = useState(true);

    useEffect(() => {
        if (!usuario) router.push('/login');
        else if (usuario.perfil !== 'ADMIN') router.push('/escalas');
    }, [usuario, router]);

    // MÁSCARA DE TELEFONE CORRIGIDA PARA PERMITIR APAGAR
    const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(/\D/g, "");
        v = v.substring(0, 11);
        if (v.length >= 3 && v.length <= 6) {
            v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
        } else if (v.length >= 7 && v.length <= 10) {
            v = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
        } else if (v.length === 11) {
            v = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
        }
        setNovoTelefone(v);
    };

    const carregarDados = async () => {
        try {
            const resU = await fetch('https://boas-vindas-backend.onrender.com/usuarios');
            if (resU.ok) setUsuarios(await resU.json());
            const resC = await fetch('https://boas-vindas-backend.onrender.com/cultos');
            if (resC.ok) setCultos(await resC.json());
        } catch (error) { console.error(error); }
    };

    useEffect(() => { carregarDados(); }, []);

    const handleSalvarVoluntario = async (e: React.FormEvent) => {
        e.preventDefault();
        const telefoneLimpo = novoTelefone.replace(/\D/g, '');
        if (telefoneLimpo.length < 10) { alert("Por favor, digite um telefone válido."); return; }
        try {
            const url = editandoId ? `https://boas-vindas-backend.onrender.com/usuarios/${editandoId}` : 'https://boas-vindas-backend.onrender.com/usuarios';
            const method = editandoId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novoNome, telefone: telefoneLimpo, senha_hash: '123', perfil: novoPerfil }) });
            if (res.ok) {
                alert(editandoId ? "Atualizado!" : "Cadastrado com sucesso!");
                setNovoNome(''); setNovoTelefone(''); setEditandoId(null); setNovoPerfil('VOLUNTARIO');
                carregarDados();
            }
        } catch (err) { alert("Erro de conexão."); }
    };

    const iniciarEdicao = (u: Usuario) => {
        setEditandoId(u.id); setNovoNome(u.nome);
        let tel = u.telefone || '';
        if (tel.length === 11) tel = `(${tel.substring(0, 2)}) ${tel.substring(2, 7)}-${tel.substring(7)}`;
        else if (tel.length === 10) tel = `(${tel.substring(0, 2)}) ${tel.substring(2, 6)}-${tel.substring(6)}`;
        setNovoTelefone(tel); setNovoPerfil(u.perfil);
    };

    const handleDeleteUsuario = async (id: string, nome: string) => {
        if (!window.confirm(`Tem certeza que deseja remover "${nome}"?`)) return;
        try {
            const res = await fetch(`https://boas-vindas-backend.onrender.com/usuarios/${id}`, { method: 'DELETE' });
            if (res.ok) carregarDados();
            else alert("Não foi possível remover.");
        } catch (err) { alert("Erro ao remover."); }
    };

    const handleGerarMes = async () => {
        if (!window.confirm(`Gerar cultos para ${mesSelecionado}/${anoSelecionado}?`)) return;
        setIsProcessando(true);
        const templates = [];
        if (gerarFamilia) templates.push({ diaSemana: 0, hora: 10, minuto: 0, nome: "Culto da Família" });
        if (gerarCelebracao) templates.push({ diaSemana: 0, hora: 19, minuto: 0, nome: "Culto da Celebração" });
        if (gerarOnlife) templates.push({ diaSemana: 6, hora: 19, minuto: 0, nome: "Culto Onlife" });
        try {
            const res = await fetch('https://boas-vindas-backend.onrender.com/cultos/gerar-mes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ano: Number(anoSelecionado), mes: Number(mesSelecionado), templates }) });
            const data = await res.json();
            if (res.ok) { alert(data.mensagem); carregarDados(); } else alert(data.erro);
        } catch (err) { alert("Erro ao conectar."); } finally { setIsProcessando(false); }
    };

    const handleAddCultoManual = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('https://boas-vindas-backend.onrender.com/cultos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nomeCultoManual, data_hora: dataCultoManual }) });
            if (res.ok) {
                alert("Culto extra cadastrado com sucesso!");
                router.push('/escalas');
            } else alert("Erro ao cadastrar culto.");
        } catch (err) { alert("Erro de conexão."); }
    };

    const handleDeleteCulto = async (id: string, nome: string) => {
        if (!window.confirm(`Remover o culto "${nome}"?`)) return;
        try {
            const res = await fetch(`https://boas-vindas-backend.onrender.com/cultos/${id}`, { method: 'DELETE' });
            if (res.ok) carregarDados();
        } catch (err) { alert("Erro ao remover."); }
    };

    const limparEscalasDoMes = async () => { /* Mantem igual */ };
    const limparCultosDoMes = async () => { /* Mantem igual */ };
    const zerarSistema = async () => { /* Mantem igual */ };

    if (!usuario || usuario.perfil !== 'ADMIN') return null;

    return (
        <main className="min-h-screen bg-gray-50 pb-12">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-3xl font-bold text-gray-800">Painel do Administrador</h1>
                    <p className="mt-1 text-gray-500">Gestão de equipe e calendário</p>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                        <h2 className="mb-4 text-xl font-bold text-gray-800">Equipe de Boas-Vindas</h2>
                        <form onSubmit={handleSalvarVoluntario} className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 border">
                            <input type="text" placeholder="Nome Completo" required className="w-full rounded border p-3 text-base bg-white" value={novoNome} onChange={e => setNovoNome(e.target.value)} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="tel" placeholder="WhatsApp" className="w-full rounded border p-3 text-base bg-white" value={novoTelefone} onChange={handleTelefoneChange} />
                                <select className="w-full rounded border p-3 text-base bg-white" value={novoPerfil} onChange={e => setNovoPerfil(e.target.value)}>
                                    <option value="VOLUNTARIO">Voluntário</option>
                                    <option value="ADMIN">Líder / Admin</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full rounded py-3 text-base font-bold text-white transition bg-blue-600 hover:bg-blue-700">Salvar Membro</button>
                        </form>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                            {usuarios.map(u => (
                                <div key={u.id} className="flex items-center justify-between rounded border p-3 bg-white">
                                    <div><p className="font-bold text-black">{u.nome}</p></div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => iniciarEdicao(u)} className="text-xs text-yellow-700">Editar</button>
                                        <button onClick={() => handleDeleteUsuario(u.id, u.nome)} className="text-xs text-red-600">Remover</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col">
                        <h2 className="mb-4 text-xl font-bold text-gray-800">Calendário de Cultos</h2>
                        <div className="mb-6 rounded-lg bg-blue-50/50 p-4 border border-blue-100 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <select className="w-full rounded border p-3 text-base bg-white outline-none" value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))}>
                                    <option value="1">Janeiro</option><option value="2">Fev</option><option value="3">Mar</option><option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option><option value="7">Julho</option><option value="8">Ago</option><option value="9">Set</option><option value="10">Out</option><option value="11">Nov</option><option value="12">Dez</option>
                                </select>
                                <input type="number" className="w-full rounded border p-3 text-base bg-white outline-none" value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2 mb-2 bg-white p-3 rounded border text-base">
                                <label className="flex items-center space-x-2"><input type="checkbox" className="w-4 h-4" checked={gerarFamilia} onChange={e => setGerarFamilia(e.target.checked)} /><span>Dom 10h - Família</span></label>
                                <label className="flex items-center space-x-2"><input type="checkbox" className="w-4 h-4" checked={gerarCelebracao} onChange={e => setGerarCelebracao(e.target.checked)} /><span>Dom 19h - Celebração</span></label>
                                <label className="flex items-center space-x-2"><input type="checkbox" className="w-4 h-4" checked={gerarOnlife} onChange={e => setGerarOnlife(e.target.checked)} /><span>Sáb 19h - Onlife</span></label>
                            </div>
                            <button onClick={handleGerarMes} disabled={isProcessando} className="w-full rounded bg-blue-600 py-3 text-base font-bold text-white hover:bg-blue-700">Gerar Mês {mesSelecionado}/{anoSelecionado}</button>
                        </div>

                        <form onSubmit={handleAddCultoManual} className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 border">
                            <p className="text-sm font-bold text-gray-700">➕ Adicionar Culto Extra</p>
                            <input type="text" placeholder="Nome (Ex: Vigília)" required className="w-full rounded border p-3 text-base bg-white" value={nomeCultoManual} onChange={e => setNomeCultoManual(e.target.value)} />
                            <input type="datetime-local" required className="w-full rounded border p-3 text-base bg-white" value={dataCultoManual} onChange={e => setDataCultoManual(e.target.value)} />
                            <button type="submit" className="w-full rounded bg-green-600 py-3 text-base font-bold text-white hover:bg-green-700">Salvar e Ir para Escalas</button>
                        </form>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {cultos.map(c => (
                                <div key={c.id} className="flex items-center justify-between rounded border p-3 bg-white">
                                    <div><p className="font-extrabold text-black text-base">{c.nome}</p></div>
                                    <button onClick={() => handleDeleteCulto(c.id, c.nome)} className="text-red-600 text-sm font-bold">Remover</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}