"use client"

import { useSignIn } from "@clerk/nextjs"; // 1. Importando o Clerk
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn(); // 2. Inicializando hooks do Clerk
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    
    setError("");
    setLoading(true);

    try {
      // 3. O Clerk tenta fazer o login
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      // 4. Se deu tudo certo, ativa a sessão e redireciona
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/"); 
        router.refresh();
      } else {
        // Caso exija algum passo extra (tipo MFA), mas geralmente é complete
        console.log(result);
      }

    } catch (err: any) {
      // 5. Tratamento de erro (E-mail ou senha errados no Clerk)
      console.error("Erro Clerk:", err);
      setError("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="bg-white rounded-[32px] w-full max-w-[440px] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 flex items-center justify-center gap-1">
            Lucrô<span className="text-emerald-500 text-5xl leading-[0]">.</span>
          </h1>
          <p className="text-slate-500 font-medium mt-3">Acesso restrito aos administradores.</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-500 p-4 rounded-2xl mb-6 text-center font-medium border border-rose-100 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@gmail.com"
                className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-900" 
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-900" 
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 text-white font-bold p-5 rounded-2xl mt-4 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Entrar no sistema <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
          <ShieldCheck size={16} className="text-emerald-500" />
          Acesso seguro com criptografia de ponta a ponta
        </div>
      </div>
    </div>
  );
}