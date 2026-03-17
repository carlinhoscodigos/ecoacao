"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // 1. Importando o hook de navegação do Next.js
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter(); // 2. Inicializando o roteador
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // O caminho agora está certinho com a sua estrutura de pastas!
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // 3. Jeito Next.js de redirecionar: mais rápido e suave!
        router.push("/"); 
        router.refresh(); // Garante que a Home recarregue lendo o novo cookie
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao fazer login");
      }
    } catch (err) {
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden p-6 font-sans">
      
      {/* =========================================
          BACKGROUND FODA (Efeitos de luz difusa)
          ========================================= */}
      {/* Bolha superior esquerda */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Bolha inferior direita */}
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-teal-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Padrão de grade sutil para dar textura */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>

      {/* =========================================
          CARTÃO DE LOGIN CENTRAL
          ========================================= */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-white/20">
        
        {/* Detalhe visual no topo do cartão */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-teal-500"></div>

        <div className="p-8 sm:p-12">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1 mb-2">
              Lucrô<span className="text-emerald-500 text-5xl leading-none">.</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium text-center">
              Acesso restrito aos administradores.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm p-3 rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            {/* Campo E-mail */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">
                E-mail
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Mail className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                </div>
                <input 
                  type="email" 
                  id="email"
                  name="email"
                  placeholder="voce@exemplo.com" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-3.5 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400" 
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex justify-between items-center ml-1">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Senha
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Lock className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                </div>
                <input 
                  type="password" 
                  id="password"
                  name="password"
                  placeholder="••••••••" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-3.5 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400" 
                />
              </div>
            </div>

            {/* Botão de Submit */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-500 text-white p-4 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98] mt-6 flex justify-center items-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar no sistema"}
              {!loading && <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs border-t border-slate-100 pt-6">
            <ShieldCheck size={16} className="text-emerald-500/70" />
            <span>Acesso seguro com criptografia de ponta a ponta</span>
          </div>
        </div>
      </div>
    </div>
  );
}