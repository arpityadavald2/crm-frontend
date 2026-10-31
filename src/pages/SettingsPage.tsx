import { useEffect, useState, type SyntheticEvent } from 'react'
import { getOrganization, updateGstin, type Organization } from '../api/organization'
import { useAuth } from '../auth/useAuth'
import { messageOf } from '../lib/messageOf'

type Result = { key: string; org: Organization | null; error: string | null }

export default function SettingsPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [gstin, setGstin] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const key = String(reload)

  useEffect(() => {
    let cancelled = false
    getOrganization()
      .then(({ organization }) => {
        if (cancelled) return
        setGstin(organization.gstin ?? '')
        setResult({ key, org: organization, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key, org: null, error: messageOf(err) })
      })
    return () => {
      cancelled = true
    }
  }, [key])

  const loading = result?.key !== key
  const org = result?.key === key ? result.org : null
  const loadError = result?.key === key ? result.error : null

  async function save(value: string | null) {
    setFormError(null)
    setNotice(null)
    setBusy(true)
    try {
      await updateGstin(value)
      setNotice(value === null ? 'GSTIN cleared' : 'GSTIN saved')
      setReload((n) => n + 1)
    } catch (err) {
      setFormError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = gstin.trim().toUpperCase()
    void save(value === '' ? null : value)
  }

  function onClear() {
    if (!window.confirm('Clear the GSTIN? New invoices will have no seller GSTIN.')) return
    void save(null)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      {loading && <p className="text-slate-600">Loading...</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}

      {org && (
        <div className="space-y-4 rounded-lg bg-white p-6 shadow">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500">Organization: </span>
              {org.name}
            </p>
            <p>
              <span className="text-slate-500">GSTIN: </span>
              {org.gstin ?? 'not set'}
            </p>
            <p>
              <span className="text-slate-500">State code: </span>
              {org.stateCode ?? '-'}
            </p>
          </div>

          {isOwner ? (
            <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-200 pt-4">
              <h2 className="font-medium text-slate-900">Seller GSTIN</h2>
              <p className="text-sm text-slate-500">
                New invoices copy the GSTIN and state code at the time the draft is created. Old
                invoices do not change.
              </p>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <input
                placeholder="15 character GSTIN"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full max-w-sm rounded border border-slate-300 px-3 py-2"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Save GSTIN'}
                </button>
                {org.gstin !== null && (
                  <button
                    type="button"
                    onClick={onClear}
                    disabled={busy}
                    className="rounded border border-red-300 px-4 py-2 text-red-600 disabled:opacity-50"
                  >
                    Clear GSTIN
                  </button>
                )}
              </div>
            </form>
          ) : (
            <p className="border-t border-slate-200 pt-4 text-sm text-slate-500">
              Only the owner can change the GSTIN.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
