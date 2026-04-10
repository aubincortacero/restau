import { signInWithGoogle } from '@/app/actions/auth'
import { IconLogo } from '@/components/icons'
import EmailLoginForm from '@/components/EmailLoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>
}) {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500 mb-4">
            <IconLogo className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Qomand</h1>
          <p className="text-sm text-zinc-400 mt-1">Gérez votre restaurant, encaissez en ligne.</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-medium text-white mb-1">Connexion</h2>
          <p className="text-sm text-zinc-400 mb-6">Accédez à votre espace restaurant</p>

          {/* Alerts */}
          <Alerts searchParams={searchParams} />

          {/* Email / password */}
          <EmailLoginForm />

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">ou</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Google button */}
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-medium rounded-xl transition-colors duration-150 cursor-pointer"
            >
              <GoogleIcon />
              Continuer avec Google
            </button>
          </form>

          <p className="text-xs text-zinc-500 text-center mt-5 leading-relaxed">
            En vous connectant, vous acceptez nos{' '}
            <a href="/legal/cgu" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300 transition-colors">conditions d&apos;utilisation</a>
            {' '}et notre{' '}
            <a href="/legal/privacy" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300 transition-colors">politique de confidentialité</a>.
          </p>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          © {new Date().getFullYear()} Qomand
        </p>
      </div>
    </main>
  )
}

async function Alerts({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>
}) {
  const params = await searchParams

  if (params.deleted) {
    return (
      <div className="mb-4 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-300">
        Votre compte a été supprimé. À bientôt.
      </div>
    )
  }

  if (params.error === 'invalid_credentials') {
    return (
      <div className="mb-4 px-4 py-3 rounded-xl bg-red-950 border border-red-800 text-sm text-red-300">
        Email ou mot de passe incorrect.
      </div>
    )
  }

  if (params.error === 'missing_fields') {
    return (
      <div className="mb-4 px-4 py-3 rounded-xl bg-red-950 border border-red-800 text-sm text-red-300">
        Veuillez renseigner votre email et mot de passe.
      </div>
    )
  }

  if (params.error) {
    return (
      <div className="mb-4 px-4 py-3 rounded-xl bg-red-950 border border-red-800 text-sm text-red-300">
        Une erreur est survenue. Veuillez réessayer.
      </div>
    )
  }

  return null
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
