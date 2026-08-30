import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { auth } from '@/lib/api'
import { setToken, setUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => auth.login({ email, password }),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setToken(res.data.token)
        setUser(res.data.pengguna)
        navigate('/dashboard')
      }
    },
  })

  const errorMsg =
    mutation.isError
      ? 'Terjadi kesalahan. Silakan coba lagi.'
      : mutation.data && !mutation.data.success
        ? mutation.data.message
        : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="rounded-t-xl px-8 pt-8 pb-6 text-center bg-primary">
          <div className="flex justify-center mb-2">
            <img
              src="/logo-wakaf-bareng.svg"
              alt="Logo Wakaf Bareng"
              className="h-5 w-5 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">Manajemen Wakaf Bareng</h1>
          <p className="text-sm mt-1 text-primary-foreground/70">Yayasan Adab Insan Mulia</p>
        </div>

        {/* Form card */}
        <Card className="rounded-t-none border-t-0 shadow-md">
          <CardHeader className="pb-2">
            <p className="text-sm text-center text-muted-foreground">Masuk ke dashboard admin</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@wakaf.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-center py-2 px-3 rounded-md bg-destructive/10 text-destructive">
                  {errorMsg}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs mt-4 text-muted-foreground">
          © 2026 Yayasan Adab Insan Mulia
        </p>
      </div>
    </div>
  )
}
