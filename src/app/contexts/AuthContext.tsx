'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Usuario = {
  id: string;
  nome: string;
  telefone: string;
  perfil: string;
};

type AuthContextType = {
  usuario: Usuario | null;
  login: (user: Usuario) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  
  // A MÁGICA ACONTECE AQUI: 
  // Em vez de começar vazio, o sistema procura no cache do navegador antes de carregar a tela!
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    if (typeof window !== 'undefined') {
      const userSalvo = localStorage.getItem('@BoasVindas:usuario');
      if (userSalvo) {
        return JSON.parse(userSalvo);
      }
    }
    return null;
  });

  const login = (user: Usuario) => {
    setUsuario(user);
    // Salva o usuário no cache do navegador
    localStorage.setItem('@BoasVindas:usuario', JSON.stringify(user));
    
    // Manda para o lugar certo dependendo de quem é
    if (user.perfil === 'ADMIN') {
      router.push('/dashboard');
    } else {
      router.push('/escalas');
    }
  };

  const logout = () => {
    setUsuario(null);
    // Limpa o cache do navegador ao sair
    localStorage.removeItem('@BoasVindas:usuario');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);