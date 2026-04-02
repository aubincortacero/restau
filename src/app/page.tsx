import { createClient } from '@/lib/supabase/server'

async function checkSupabaseConnection(): Promise<{ ok: boolean; latency: number; error?: string }> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.getSession()
    const latency = Date.now() - start
    if (error && error.message.toLowerCase().includes('fetch')) {
      return { ok: false, latency, error: error.message }
    }
    return { ok: true, latency }
  } catch (e) {
    return { ok: false, latency: Date.now() - start, error: String(e) }
  }
}

export default async function Home() {
  const { ok, latency, error } = await checkSupabaseConnection()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight">restau.</span>
        </div>
        <span className="text-xs text-zinc-500">v0.1.0 — dev</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-10">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl shadow-black/40">

          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">Supabase</span>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              ok
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {ok ? 'Connecté' : 'Erreur'}
            </div>
          </div>

          <div className="flex flex-col items-center py-6 gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              ok
                ? 'bg-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'bg-red-500/10 ring-2 ring-red-500/30'
            }`}>
              {ok ? (
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className="text-lg font-semibold">
              {ok ? 'Base de données accessible' : 'Connexion échouée'}
            </p>
            {error && (
              <p className="text-xs text-red-400 text-center max-w-xs">{error}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-xl bg-zinc-800/60 px-4 py-3">
              <p className="text-xs text-zinc-500 mb-1">Latence</p>
              <p className="text-xl font-mono font-semibold text-zinc-100">
                {latency}<span className="text-sm text-zinc-400 ml-1">ms</span>
              </p>
            </div>
            <div className="rounded-xl bg-zinc-800/60 px-4 py-3">
              <p className="text-xs text-zinc-500 mb-1">Projet</p>
              <p className="text-sm font-mono font-medium text-zinc-300 truncate">{projectRef || '—'}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-zinc-800/60 px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">URL</p>
            <p className="text-xs font-mono text-zinc-400 truncate">{supabaseUrl || 'Non configurée'}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <a
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Accéder à mon espace restaurant →
          </a>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['Next.js 16', 'TypeScript', 'Tailwind v4', 'Supabase', 'SSR'].map((tech) => (
              <span key={tech} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-4 text-center text-xs text-zinc-600">
        Rendu côté serveur — {new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
      </footer>
    </div>
  )
}
