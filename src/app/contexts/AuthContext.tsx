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
  token: string | null; // <-- Adicionamos o Token aqui
  login: (user: Usuario, token: string) => void; // <-- O login agora exige o Token
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  
  // Puxa o Usuário do Cache
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    if (typeof window !== 'undefined') {
      const userSalvo = localStorage.getItem('@BoasVindas:usuario');
      if (userSalvo) return JSON.parse(userSalvo);
    }
    return null;
  });

  // Puxa o Token do Cache
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('@BoasVindas:token');
    }
    return null;
  });

  // A função de login agora recebe os dois dados
  const login = (user: Usuario, jwtToken: string) => {
    setUsuario(user);
    setToken(jwtToken);
    
    // Salva os dois no navegador
    localStorage.setItem('@BoasVindas:usuario', JSON.stringify(user));
    localStorage.setItem('@BoasVindas:token', jwtToken);
    
    if (user.perfil === 'ADMIN') {
      router.push('/dashboard');
    } else {
      router.push('/escalas');
    }
  };

  const logout = () => {
    setUsuario(null);
    setToken(null);
    
    // Limpa os dois ao sair
    localStorage.removeItem('@BoasVindas:usuario');
    localStorage.removeItem('@BoasVindas:token');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);