import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { frappeClient } from '../lib/frappeClient'

export function IntegrationStatusCard() {
  const [status, setStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastCheckedAt, setLastCheckedAt] = useState(null)

  const refreshStatus = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await frappeClient.getErpnextIntegrationBrief()
      const payload = response?.message || response
      setStatus(payload)
      setLastCheckedAt(new Date())
    } catch (err) {
      console.error('Failed to fetch ERPNext integration status', err)
      setError('Gagal memeriksa status integrasi ERPNext. Coba lagi atau periksa koneksi Anda.')
      setStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const missingItems = useMemo(() => {
    if (!status) return []
    if (Array.isArray(status.kurang)) return status.kurang
    return []
  }, [status])

  const isReady = Boolean(status?.siap)
  const answer = status?.jawaban || (isLoading ? 'Memeriksa...' : 'Tidak diketahui')

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Integrasi ERPNext</CardTitle>
          <CardDescription>
            Pemantauan apakah API integrasi ERPNext (PO, Invoice, Payment, Journal) sudah siap digunakan dari portal.
          </CardDescription>
          {lastCheckedAt && (
            <p className="text-xs text-slate-500">Terakhir dicek: {lastCheckedAt.toLocaleString('id-ID')}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={refreshStatus}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Periksa ulang
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            isReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          {isReady ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )}
          <div className="space-y-1 text-sm">
            <p className="font-medium text-slate-800">Jawaban sistem: {answer}</p>
            <p className="text-slate-600">
              {isReady
                ? 'Semua operasi ERPNext yang diwajibkan sudah tersedia dan siap dipakai dari portal.'
                : 'Masih ada persyaratan ERPNext yang belum terpenuhi. Lengkapi daftar di bawah ini agar transaksi berjalan penuh.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && !isReady && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Yang masih kurang:</p>
            {missingItems.length > 0 ? (
              <ul className="space-y-1 text-sm text-slate-700">
                {missingItems.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">
                Tidak ada rincian spesifik dari server. Gunakan endpoint gap/hints untuk detail lebih lanjut.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default IntegrationStatusCard
