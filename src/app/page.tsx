import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-center text-gray-800">
        Igreja Cem Porcento Vida
      </h1>
      <p className="mt-4 text-gray-600">
        Sistema de Recepção e Escalas
      </p>
      
      <div className="mt-8 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
        <Link 
          href="/recepcao" 
          className="rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white shadow-md transition hover:bg-blue-700"
        >
          Recepção
        </Link>

        <Link 
          href="/dashboard" 
          className="rounded-lg bg-gray-800 px-6 py-3 text-center font-semibold text-white shadow-md transition hover:bg-gray-900"
        >
          Liderança
        </Link>

        {/* Novo botão de Escalas */}
        <Link 
          href="/escalas" 
          className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          Ver Escalas
        </Link>
        <Link 
          href="/admin" 
          className="rounded-lg bg-purple-600 px-6 py-3 text-center font-semibold text-white shadow-md transition hover:bg-purple-700"
        >
          Área do Admin
        </Link>
      </div>
    </main>
  );
}