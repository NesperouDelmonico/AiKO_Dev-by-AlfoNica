import { useState, type ReactNode } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldPath, type FieldValues, type UseFormRegister } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { changePassword, requestPasswordReset, resetPassword } from '../api/auth'
import { ApiError, getErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { homeForRole } from '../auth/roles'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'
import { Spinner } from '../components/ui/Spinner'

const emailSchema = z.string().trim().email('Revisa que el correo tenga un formato válido.')
const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede tener más de 72 caracteres.')
  .regex(/[a-z]/, 'Incluye al menos una letra minúscula.')
  .regex(/[A-Z]/, 'Incluye al menos una letra mayúscula.')
  .regex(/[0-9]/, 'Incluye al menos un número.')
const loginSchema = z.object({
  correo: emailSchema,
  contraseña: z.string().min(1, 'Escribe tu contraseña.').max(72, 'La contraseña no puede tener más de 72 caracteres.'),
})
const forgotSchema = z.object({ correo: emailSchema })
const resetSchema = z.object({
  correo: emailSchema,
  codigo: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.'),
  nueva_contraseña: passwordSchema,
})
const changeSchema = z.object({
  contraseña_actual: z.string().min(1, 'Escribe tu contraseña actual.').max(72, 'La contraseña no puede tener más de 72 caracteres.'),
  nueva_contraseña: passwordSchema,
})

type LoginValues = z.infer<typeof loginSchema>
type ForgotValues = z.infer<typeof forgotSchema>
type ResetValues = z.infer<typeof resetSchema>
type ChangeValues = z.infer<typeof changeSchema>

function navigationStateString(state: unknown, key: string): string | undefined {
  if (typeof state !== 'object' || state === null) return undefined
  const value = (state as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

function AuthShell({ children, subtitle }: { children: ReactNode; subtitle: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="auth-logo-enter mb-7 flex justify-center">
          <Logo className="h-auto w-48 max-h-36" />
        </div>
        <Card className="auth-card-enter border-white/80 p-6 sm:p-8">
          <p className="mb-6 text-center text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          {children}
        </Card>
      </div>
    </main>
  )
}

function Field<TFieldValues extends FieldValues>({
  label,
  name,
  type = 'text',
  inputMode,
  register,
  error,
  autoComplete,
}: {
  label: string
  name: FieldPath<TFieldValues>
  type?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'search' | 'email' | 'tel' | 'url' | 'none'
  register: UseFormRegister<TFieldValues>
  error?: string | undefined
  autoComplete?: string | undefined
}) {
  const id = `field-${name}`
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-brand-heading">{label}</label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
      {error && <p id={`${id}-error`} className="text-sm text-[var(--color-attention-text)]">{error}</p>}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="text-sm text-[var(--color-attention-text)]">{message}</p> : null
}

export function LoginPage() {
  const { signIn, rejectPatient, patientRejected, sessionError, clearPatientNotice, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState('')
  const [patientMessage, setPatientMessage] = useState('')
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { correo: '', contraseña: '' } })
  const notice = navigationStateString(location.state, 'notice')
  if (user) return <Navigate to={homeForRole(user.rol) || '/login'} replace />

  async function submit(values: LoginValues) {
    setServerError('')
    setPatientMessage('')
    clearPatientNotice()
    try {
      const loggedInUser = await signIn(values.correo, values.contraseña)
      const destination = homeForRole(loggedInUser.rol)
      if (!destination) {
        try {
          await rejectPatient()
        } catch {
          setPatientMessage('Esta cuenta es de paciente. Para ingresar a AiKO, usa la aplicación móvil. La sesión del panel se cerró.')
          return
        }
        setPatientMessage('Esta cuenta es de paciente. Para ingresar a AiKO, usa la aplicación móvil.')
        return
      }
      navigate(destination, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 423) {
        setServerError('No puedes ingresar por ahora. Restablece tu contraseña o comunícate con el administrador.')
      } else if (error instanceof ApiError && error.status === 401) {
        setServerError('No pudimos iniciar sesión. Revisa tu correo y contraseña e inténtalo de nuevo.')
      } else {
        setServerError(getErrorMessage(error))
      }
    }
  }

  return (
    <AuthShell subtitle="Ingresa a tu cuenta de AiKO.">
      {notice && <p role="status" className="mb-4 rounded-xl bg-purple-50 p-3 text-sm text-brand-heading">{notice}</p>}
      {(patientRejected || patientMessage) && (
        <div role="status" className="mb-4 rounded-xl bg-purple-50 p-3 text-sm text-brand-heading">
          {patientMessage || 'Esta cuenta es de paciente. Para ingresar a AiKO, usa la aplicación móvil.'}
        </div>
      )}
      {sessionError && !serverError && <FieldError message={sessionError} />}
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="Correo electrónico" name="correo" type="email" autoComplete="email" register={form.register} error={form.formState.errors.correo?.message} />
        <Field label="Contraseña" name="contraseña" type="password" autoComplete="current-password" register={form.register} error={form.formState.errors.contraseña?.message} />
        <FieldError message={serverError} />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner className="size-4 text-white" />}
          Iniciar sesión
        </Button>
      </form>
      <div className="mt-5 text-center text-sm">
        <Link className="font-semibold" to="/olvide-contrasena">¿Olvidaste tu contraseña?</Link>
      </div>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [requestedEmail, setRequestedEmail] = useState('')
  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { correo: navigationStateString(location.state, 'correo') ?? '' },
  })
  async function submit(values: ForgotValues) {
    setFailure('')
    setMessage('')
    setRequestedEmail(values.correo)
    try {
      await requestPasswordReset(values.correo)
      setMessage('Si encontramos una cuenta con ese correo, te enviaremos instrucciones para recuperar el acceso.')
    } catch (error) {
      setMessage('Si encontramos una cuenta con ese correo, te enviaremos instrucciones para recuperar el acceso.')
      setFailure(
        error instanceof ApiError && [429, 503].includes(error.status)
          ? error.message
          : 'No pudimos enviar la solicitud. Inténtalo de nuevo más tarde.',
      )
    }
  }
  return (
    <AuthShell subtitle="Recupera el acceso a tu cuenta.">
      {message && <p role="status" className="mb-4 rounded-xl bg-purple-50 p-3 text-sm text-brand-heading">{message}</p>}
      {failure && <ErrorState message={failure} />}
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="Correo electrónico" name="correo" type="email" autoComplete="email" register={form.register} error={form.formState.errors.correo?.message} />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner className="size-4 text-white" />}
          Enviar instrucciones
        </Button>
      </form>
      {requestedEmail && (
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => navigate('/restablecer-contrasena', { state: { correo: requestedEmail } })}
        >
          Ya tengo mi código
        </Button>
      )}
      <p className="mt-5 text-center text-sm"><Link className="font-semibold" to="/login">Volver al inicio de sesión</Link></p>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState('')
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      correo: navigationStateString(location.state, 'correo') ?? '',
      codigo: '',
      nueva_contraseña: '',
    },
  })
  async function submit(values: ResetValues) {
    setServerError('')
    try {
      await resetPassword(values.correo, values.codigo, values.nueva_contraseña)
      navigate('/login', { replace: true, state: { notice: 'Tu contraseña quedó actualizada.' } })
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }
  return (
    <AuthShell subtitle="Crea una contraseña nueva para tu cuenta.">
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="Correo electrónico" name="correo" type="email" autoComplete="email" register={form.register} error={form.formState.errors.correo?.message} />
        <Field label="Código de 6 dígitos" name="codigo" inputMode="numeric" autoComplete="one-time-code" register={form.register} error={form.formState.errors.codigo?.message} />
        <Field label="Nueva contraseña" name="nueva_contraseña" type="password" autoComplete="new-password" register={form.register} error={form.formState.errors.nueva_contraseña?.message} />
        <p className="text-xs text-[var(--color-text-muted)]">Tu código tiene 6 dígitos, dura 15 minutos y puedes intentar hasta 5 veces.</p>
        <p className="text-xs text-[var(--color-text-muted)]">Usa entre 8 y 72 caracteres e incluye una minúscula, una mayúscula y un número.</p>
        <FieldError message={serverError} />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner className="size-4 text-white" />}
          Restablecer contraseña
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link className="font-semibold" to="/olvide-contrasena" state={{ correo: form.getValues('correo') }}>Pedir un código nuevo</Link>
      </p>
      <p className="mt-5 text-center text-sm"><Link className="font-semibold" to="/login">Volver al inicio de sesión</Link></p>
    </AuthShell>
  )
}

export function ChangePasswordPage() {
  const { signOut } = useAuth()
  const [serverError, setServerError] = useState('')
  const form = useForm<ChangeValues>({ resolver: zodResolver(changeSchema), defaultValues: { contraseña_actual: '', nueva_contraseña: '' } })
  async function submit(values: ChangeValues) {
    setServerError('')
    try {
      await changePassword(values.contraseña_actual, values.nueva_contraseña)
      await signOut()
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div><h1 className="mb-1 text-2xl">Cambiar contraseña</h1><p className="mb-0 text-sm text-[var(--color-text-muted)]">Actualiza tu contraseña para mantener tu cuenta protegida.</p></div>
      <Card>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <Field label="Contraseña actual" name="contraseña_actual" type="password" autoComplete="current-password" register={form.register} error={form.formState.errors.contraseña_actual?.message} />
          <Field label="Nueva contraseña" name="nueva_contraseña" type="password" autoComplete="new-password" register={form.register} error={form.formState.errors.nueva_contraseña?.message} />
          <p className="text-xs text-[var(--color-text-muted)]">Usa entre 8 y 72 caracteres e incluye una minúscula, una mayúscula y un número.</p>
          <FieldError message={serverError} />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner className="size-4 text-white" />}
            Actualizar contraseña
          </Button>
        </form>
      </Card>
    </div>
  )
}
