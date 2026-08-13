import { redirect } from 'next/navigation';

export default function Home() {
  // Redireciona instantaneamente para a tela de login
  redirect('/login');
}