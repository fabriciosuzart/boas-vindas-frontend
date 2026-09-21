'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext'; 

export default function Recepcao() {
  const router = useRouter();
  const { usuario, token, logout } = useAuth(); 

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    faixa_etaria: '',
    veio_com: '',
    primeira_vez: false,
    observacoes: ''
  });

  const [cultoHoje, setCultoHoje] = useState<{ id: string; nome: string } | null>(null);
  const [erroCulto, setErroCulto] = useState('');

  // --- NOVOS ESTADOS PARA O MODO RETROATIVO (ADMIN) ---
  const [cultosAdmin, setCultosAdmin] = useState<{ id: string; nome: string; data_hora: string }[]>([]);
  const [modoRetroativo, setModoRetroativo] = useState(false);
  const [cultoRetroativoId, setCultoRetroativoId] = useState('');

  useEffect(() => {
    if (!usuario) {
      router.push('/login');
    } else {
      // 1. Busca o culto do dia (para o fluxo normal)
      fetch('https://boas-vindas-backend.onrender.com/cultos/hoje', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) { logout(); throw new Error('Sessão expirada'); }
          if (!res.ok) throw new Error('Sem culto');
          return res.json();
        })
        .then(data => setCultoHoje(data))
        .catch((e) => {
          if (e.message === 'Sem culto') {
            setErroCulto("⚠️ Atenção: Não há nenhum culto gerado no sistema para o dia de hoje.");
          }
        });

      // 2. Se for ADMIN, já carrega todos os cultos do banco em segundo plano para o modo retroativo
      if (usuario.perfil === 'ADMIN') {
        fetch('https://boas-vindas-backend.onrender.com/cultos', {
           headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
           // Calcula a data limite de 30 dias atrás
           const trintaDiasAtras = new Date();
           trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
           const agora = new Date();

           // Filtra: apenas cultos dos últimos 30 dias e que já aconteceram
           const filtrados = data.filter((c: any) => {
             const dataCulto = new Date(c.data_hora);
             return dataCulto >= trintaDiasAtras && dataCulto <= agora;
           });

           // Organiza do culto mais recente para o mais antigo
           const ordenados = filtrados.sort((a: any, b: any) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
           setCultosAdmin(ordenados);
        })
        .catch(err => console.error("Erro ao buscar histórico de cultos", err));
     }
    }
  }, [usuario, token, router, logout]);

  if (!usuario) return null;
  const isAdmin = usuario.perfil === 'ADMIN';

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    v = v.substring(0, 11);
    if (v.length >= 3 && v.length <= 6) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    else if (v.length >= 7 && v.length <= 10) v = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
    else if (v.length === 11) v = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
    
    setFormData({ ...formData, telefone: v });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Travas de segurança dependendo do modo ativo
    if (!modoRetroativo && !cultoHoje) {
      alert("Não é possível salvar: não há culto para hoje. Se você for Admin, ative o Modo Retroativo.");
      return;
    }

    if (modoRetroativo && !cultoRetroativoId) {
      alert("Selecione um culto da lista para realizar o lançamento retroativo.");
      return;
    }

    // Define de qual culto será o registro
    const cultoFinalId = modoRetroativo ? cultoRetroativoId : cultoHoje?.id;
    setIsLoading(true);
    const telefoneLimpo = formData.telefone.replace(/\D/g, '');

    try {
      const response = await fetch('https://boas-vindas-backend.onrender.com/registros', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          nome: formData.nome,
          telefone: telefoneLimpo,
          faixa_etaria: formData.faixa_etaria,
          veio_com: formData.veio_com,
          primeira_vez: formData.primeira_vez,
          observacoes: formData.observacoes,
          culto_id: cultoFinalId, 
          responsavel_id: usuario.id 
        })
      });

      if (response.status === 401) {
         alert("Sua sessão expirou. Faça login novamente.");
         logout();
         return;
      }

      if (response.ok) {
        alert("🎉 Visitante salvo com sucesso!");
        setFormData({ nome: '', telefone: '', faixa_etaria: '', veio_com: '', primeira_vez: false, observacoes: '' });
      } else {
        alert("Erro ao salvar o visitante. Verifique o backend.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão com o servidor. O backend está rodando?");
    } finally {
      setIsLoading(false);
    }
  };

  // Função para formatar a data da lista retroativa
  const formatarData = (dataIso: string) => {
    const d = new Date(dataIso);
    d.setHours(d.getHours() + 3); // Compensa fuso
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24 pt-8">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-md border border-gray-100">
        
        <div className="mb-6 border-b pb-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Novo Visitante</h1>
          <p className="text-sm text-gray-500">Igreja Cem Porcento Vida</p>
        </div>

        {/* MODO ADMIN: TOGGLE DE LANÇAMENTO RETROATIVO */}
        {isAdmin && (
          <div className={`mb-5 flex items-center justify-center space-x-3 rounded-lg border p-3 transition-colors ${modoRetroativo ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
             <input 
               type="checkbox" 
               id="retroativo"
               className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
               checked={modoRetroativo}
               onChange={(e) => {
                 setModoRetroativo(e.target.checked);
                 setCultoRetroativoId(''); // Reseta a escolha ao alternar
               }}
             />
             <label htmlFor="retroativo" className={`text-sm font-bold cursor-pointer ${modoRetroativo ? 'text-indigo-800' : 'text-gray-600'}`}>
               Modo Lançamento Retroativo
             </label>
          </div>
        )}

        {/* DECIDE O QUE EXIBIR NO CABEÇALHO COM BASE NO MODO */}
        {modoRetroativo ? (
          <div className="mb-5">
            <label className="mb-1 block text-sm font-bold text-indigo-800">Selecione o Culto Passado *</label>
            <select 
              className="w-full rounded-lg border-2 border-indigo-200 bg-indigo-50/50 p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-indigo-900 font-semibold"
              value={cultoRetroativoId}
              onChange={e => setCultoRetroativoId(e.target.value)}
            >
              <option value="">-- Escolha da lista --</option>
              {cultosAdmin.map(c => (
                <option key={c.id} value={c.id}>{c.nome} ({formatarData(c.data_hora)})</option>
              ))}
            </select>
          </div>
        ) : (
          // O FLUXO NORMAL (Culto de Hoje)
          <>
            {erroCulto ? (
              <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600 font-semibold border border-red-100 text-center">
                {erroCulto}
              </div>
            ) : cultoHoje ? (
              <div className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700 font-semibold border border-green-100 text-center">
                ✅ Registrando para: {cultoHoje.nome}
              </div>
            ) : (
              <div className="mb-5 text-center text-sm text-gray-500 font-medium">Buscando culto de hoje...</div>
            )}
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 flex flex-col border-t pt-4">
          
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome e Sobrenome *</label>
            <input 
              type="text" 
              required
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              placeholder="Ex: João Silva"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp</label>
            <input 
              type="tel" 
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              placeholder="(13) 99999-9999"
              value={formData.telefone}
              onChange={handleTelefoneChange} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Faixa Etária</label>
              <select 
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={formData.faixa_etaria}
                onChange={(e) => setFormData({...formData, faixa_etaria: e.target.value})}
              >
                <option value="">Selecione...</option>
                <option value="Criança">Criança</option>
                <option value="Jovem">Jovem</option>
                <option value="Adulto">Adulto</option>
                <option value="Idoso">Idoso</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Veio com quem?</label>
              <input 
                type="text" 
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                placeholder="Ex: Mãe, Amigo"
                value={formData.veio_com}
                onChange={(e) => setFormData({...formData, veio_com: e.target.value})}
              />
            </div>
          </div>

          <div className="my-2 flex items-center space-x-3 border-y border-gray-100 py-3">
            <input 
              type="checkbox" 
              id="primeira_vez"
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={formData.primeira_vez}
              onChange={(e) => setFormData({...formData, primeira_vez: e.target.checked})}
            />
            <label htmlFor="primeira_vez" className="text-sm font-medium text-gray-700 cursor-pointer">
              É a primeira vez na igreja?
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observações da Conversa</label>
            <textarea 
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              placeholder="Detalhe a primeira impressão, célula, etc..."
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || (!modoRetroativo && !cultoHoje) || (modoRetroativo && !cultoRetroativoId)} 
            className="mt-4 w-full rounded-lg bg-blue-600 py-4 text-center font-bold text-white shadow-md transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Salvando...' : 'Salvar Visitante'}
          </button>

        </form>
      </div>
    </main>
  );
}