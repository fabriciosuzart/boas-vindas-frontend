'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext'; 

export default function Recepcao() {
  const router = useRouter();
  // Agora puxamos também o token do nosso Contexto!
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

  // BUSCA DO CULTO DO DIA (AGORA COM O TOKEN DE SEGURANÇA)
  useEffect(() => {
    if (!usuario) {
      router.push('/login');
    } else {
      fetch('https://boas-vindas-backend.onrender.com/cultos/hoje', {
        // Envia o crachá (Token JWT) para o Backend abrir a porta
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          // Se o token for inválido, o back devolve 401. Nesse caso, deslogamos o usuário à força!
          if (res.status === 401) {
            logout();
            throw new Error('Sessão expirada');
          }
          if (!res.ok) throw new Error('Sem culto');
          return res.json();
        })
        .then(data => setCultoHoje(data))
        .catch((e) => {
          if (e.message === 'Sem culto') {
            setErroCulto("⚠️ Atenção: Não há nenhum culto gerado no sistema para o dia de hoje. Você não conseguirá salvar visitantes.");
          }
        });
    }
  }, [usuario, token, router, logout]);

  if (!usuario) return null;

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
    
    if (!cultoHoje) {
      alert("Não é possível salvar: não há culto cadastrado para a data de hoje no sistema.");
      return;
    }

    setIsLoading(true);
    const telefoneLimpo = formData.telefone.replace(/\D/g, '');

    try {
      const response = await fetch('https://boas-vindas-backend.onrender.com/registros', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <-- O Token vai aqui também!
        },
        body: JSON.stringify({
          nome: formData.nome,
          telefone: telefoneLimpo,
          faixa_etaria: formData.faixa_etaria,
          veio_com: formData.veio_com,
          primeira_vez: formData.primeira_vez,
          observacoes: formData.observacoes,
          culto_id: cultoHoje.id, 
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

  return (
    <main className="min-h-screen bg-gray-50 pb-24 pt-8">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-md border border-gray-100">
        
        <div className="mb-6 border-b pb-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Novo Visitante</h1>
          <p className="text-sm text-gray-500">Igreja Cem Porcento Vida</p>
        </div>

        {erroCulto ? (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 font-semibold border border-red-100 text-center">
            {erroCulto}
          </div>
        ) : cultoHoje ? (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 font-semibold border border-green-100 text-center">
            ✅ Registrando para: {cultoHoje.nome}
          </div>
        ) : (
          <div className="mb-4 text-center text-sm text-gray-500 font-medium">Buscando culto de hoje...</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
          
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

          <div className="my-2 flex items-center space-x-3 border-y border-gray-100 py-2">
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
            disabled={isLoading || !cultoHoje} 
            className="mt-4 w-full rounded-lg bg-blue-600 py-4 text-center font-bold text-white shadow-md transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Salvando...' : 'Salvar Visitante'}
          </button>

        </form>
      </div>
    </main>
  );
}