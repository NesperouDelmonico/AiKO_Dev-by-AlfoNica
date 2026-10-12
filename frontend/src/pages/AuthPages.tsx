import { useState, type ReactNode } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldPath, type FieldValues, type UseFormRegister } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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

const emailSchema = z.string().trim().email('Ingresa un correo válido.')
const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar 72 caracteres.')
  .regex(/[a-z]/, 'Agrega al menos una minúscula.')
  .regex(/[A-Z]/, 'Agrega al menos una mayúscula.')
  .regex(/[0-9]/, 'Agrega al menos un número.')

const loginSchema = z.object({
  correo: emailSchema,
  contraseña: z.string().min(1, 'Ingresa tu contraseña.').max(72, 'La contraseña no puede superar 72 caracteres.'),
})
const forgotSchema = z.object({ correo: emailSchema })
const resetSchema = z.object({
  correo: emailSchema,
  codigo: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.'),
  nueva_contraseña: passwordSchema,
})
const changeSchema = z.object({
  contraseña_actual: z.string().min(1, 'Ingresa tu contraseña actual.').max(72),
  nueva_contraseña: passwordSchema,
})

type LoginValues = z.infer<typeof loginSchema>
type ForgotValues = z.infer<typeof forgotSchema>
type ResetValues = z.infer<typeof resetSchema>
type ChangeValues = z.infer<typeof changeSchema>

function AuthShell({ children, subtitle }: { children: ReactNode; subtitle: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Logo className="h-auto w-36" />
        </div>
        <Card className="border-white/80 p-6 sm:p-8">
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
  const [serverError, setServerError] = useState('')
  const [patientMessage, setPatientMessage] = useState('')
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { correo: '', contraseña: '' } })
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
          setPatientMessage('Esta cuenta corresponde a un paciente. Para usar AiKO, ingresa desde la aplicación móvil. La sesión del panel se cerró.')
          return
        }
        setPatientMessage('Esta cuenta corresponde a un paciente. Para usar AiKO, ingresa desde la aplicación móvil.')
        return
      }
      navigate(destination, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 423) {
        setServerError('Cuenta bloqueada: usa Olvidé mi contraseña o contacta al administrador')
      } else if (error instanceof ApiError && error.status === 401) {
        setServerError('Correo o contraseña inválidos.')
      } else {
        setServerError(getErrorMessage(error))
      }
    }
  }

  return (
    <AuthShell subtitle="Inicia sesión en tu panel de AiKO">
      {(patientRejected || patientMessage) && (
        <div role="status" className="mb-4 rounded-xl bg-purple-50 p-3 text-sm text-brand-heading">
          {patientMessage || 'Las cuentas de paciente deben usar la aplicación móvil.'}
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
        <Link className="font-semibold" to="/olvide-contrasena">Olvidé mi contraseña</Link>
      </div>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { correo: '' } })
  async function submit(values: ForgotValues) {
    setFailure('')
    setMessage('')
    try {
      await requestPasswordReset(values.correo)
      setMessage('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.')
    } catch (error) {
      setMessage('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.')
      setFailure(
        error instanceof ApiError && [429, 503].includes(error.status)
          ? error.message
          : 'No fue posible completar la solicitud. Intenta nuevamente más tarde.',
      )
    }
  }
  return (
    <AuthShell subtitle="Te ayudamos a recuperar el acceso a tu cuenta">
      {message && <p role="status" className="mb-4 rounded-xl bg-purple-50 p-3 text-sm text-brand-heading">{message}</p>}
      {failure && <ErrorState message={failure} />}
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="Correo electrónico" name="correo" type="email" autoComplete="email" register={form.register} error={form.formState.errors.correo?.message} />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner className="size-4 text-white" />}
          Enviar instrucciones
        </Button>
      </form>
      <p className="mt-5 text-center text-sm"><Link className="font-semibold" to="/login">Volver al inicio de sesión</Link></p>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [complete, setComplete] = useState(false)
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { correo: '', codigo: '', nueva_contraseña: '' } })
  async function submit(values: ResetValues) {
    setServerError('')
    try {
      await resetPassword(values.correo, values.codigo, values.nueva_contraseña)
      setComplete(true)
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }
  return (
    <AuthShell subtitle="Restablece tu contraseña">
      {complete ? (
        <div className="space-y-4 text-center">
          <p role="status" className="text-sm text-[var(--color-text-muted)]">Tu contraseña se actualizó correctamente.</p>
          <Button className="w-full" onClick={() => navigate('/login')}>Ir a iniciar sesión</Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <Field label="Correo electrónico" name="correo" type="email" autoComplete="email" register={form.register} error={form.formState.errors.correo?.message} />
          <Field label="Código de 6 dígitos" name="codigo" inputMode="numeric" autoComplete="one-time-code" register={form.register} error={form.formState.errors.codigo?.message} />
          <Field label="Nueva contraseña" name="nueva_contraseña" type="password" autoComplete="new-password" register={form.register} error={form.formState.errors.nueva_contraseña?.message} />
          <p className="text-xs text-[var(--color-text-muted)]">Usa entre 8 y 72 caracteres, con al menos una minúscula, una mayúscula y un número.</p>
          <FieldError message={serverError} />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner className="size-4 text-white" />}
            Restablecer contraseña
          </Button>
        </form>
      )}
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
      <h1 className="text-2xl">Cambiar contraseña</h1>
      <Card>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <Field label="Contraseña actual" name="contraseña_actual" type="password" autoComplete="current-password" register={form.register} error={form.formState.errors.contraseña_actual?.message} />
          <Field label="Nueva contraseña" name="nueva_contraseña" type="password" autoComplete="new-password" register={form.register} error={form.formState.errors.nueva_contraseña?.message} />
          <p className="text-xs text-[var(--color-text-muted)]">Usa entre 8 y 72 caracteres, con minúscula, mayúscula y número.</p>
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
