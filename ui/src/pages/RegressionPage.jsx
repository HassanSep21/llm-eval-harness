import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { PageHeader, Card, Button, Field, Select, Callout, StatusPill } from '../components/ui.jsx'

function DeltaBar({ dim, value }) {
  const positive = value >= 0
  const pct = Math.min(Math.abs(value) * 100, 100)
  return (
    <div className="text-sm">
      <div className="flex justify-between mb-1">
        <span className="capitalize text-mist">{dim}</span>
        <span className={`font-medium ${positive ? 'text-blueprint' : 'text-ember'}`}>
          {positive ? '+' : ''}{value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(199,211,234,0.08)] overflow-hidden">
        <div
          className={`h-full rounded-full ${positive ? 'bg-blueprint' : 'bg-ember'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function RegressionPage() {
  const [searchParams] = useSearchParams()

  const [runs, setRuns] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [runAId, setRunAId] = useState(searchParams.get('runA') || '')
  const [runBId, setRunBId] = useState('')

  const [report, setReport] = useState(null)
  const [comparing, setComparing] = useState(false)
  const [compareError, setCompareError] = useState(null)

  useEffect(() => {
    api
      .listRuns({ status: 'completed' })
      .then((data) => {
        setRuns(data)
        if (!searchParams.get('runA') && data.length > 0) setRunAId(data[0].id)
        if (data.length > 1) setRunBId(data[1].id)
      })
      .catch((err) => setLoadError(err.message))
  }, [searchParams])

  const handleCompare = async (e) => {
    e.preventDefault()
    setCompareError(null)

    if (!runAId || !runBId) {
      setCompareError('Pick two runs to compare.')
      return
    }
    if (runAId === runBId) {
      setCompareError('Pick two different runs.')
      return
    }

    setComparing(true)
    setReport(null)
    try {
      const data = await api.compareRuns(runAId, runBId)
      setReport(data)
    } catch (err) {
      setCompareError(err.message)
    } finally {
      setComparing(false)
    }
  }

  if (loadError) {
    return <Callout tone="error">Couldn't load runs: {loadError}</Callout>
  }

  if (!runs) {
    return <p className="text-fog text-sm">Loading…</p>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader center eyebrow="Comparison" title="Regression" description="Compare two completed runs to see what improved, regressed, or held steady." />

      {runs.length < 2 && (
        <div className="mb-4">
          <Callout tone="warning">You need at least two completed runs to compare. Start another run first.</Callout>
        </div>
      )}

      <Card className="mb-6">
        <form onSubmit={handleCompare} className="space-y-5">
          {compareError && <Callout tone="error">{compareError}</Callout>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Run A (baseline)">
              <Select value={runAId} onChange={(e) => setRunAId(e.target.value)} disabled={runs.length === 0}>
                <option value="">Select a run</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} · {r.target_model} · {new Date(r.created_at).toLocaleString()}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Run B (comparison)">
              <Select value={runBId} onChange={(e) => setRunBId(e.target.value)} disabled={runs.length === 0}>
                <option value="">Select a run</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} · {r.target_model} · {new Date(r.created_at).toLocaleString()}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Button variant="primary" type="submit" disabled={comparing || runs.length < 2}>
            {comparing ? 'Comparing…' : 'Compare runs'}
          </Button>
        </form>
      </Card>

      {report && (
        <div className="space-y-5">
          <Card className="flex items-center justify-between">
            <span className="text-sm font-medium text-mist">Verdict</span>
            <StatusPill status={report.verdict} />
          </Card>

          <Card>
            <h2 className="font-display text-base text-frost mb-4">Per-dimension delta</h2>
            <div className="space-y-3.5">
              {Object.entries(report.per_dimension_avg_delta || {}).map(([dim, val]) => (
                <DeltaBar key={dim} dim={dim} value={val} />
              ))}
            </div>
          </Card>

          {report.calibration_report && (
            <Card>
              <h2 className="font-display text-base text-frost mb-3">Calibration report</h2>
              <p className="text-sm text-fog mb-3">
                Overall consistency:{' '}
                <span className="font-medium text-frost">
                  {report.calibration_report.overall_consistency?.toFixed(2)}
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(report.calibration_report.dimension_agreement || {}).map(([dim, val]) => (
                  <div key={dim} className="text-sm">
                    <p className="text-fog capitalize">{dim}</p>
                    <p className="font-medium text-frost">{val.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <h2 className="font-display text-sm text-blueprint mb-2.5">
                Improved cases ({report.improved_cases?.length ?? 0})
              </h2>
              {report.improved_cases?.length > 0 ? (
                <ul className="text-sm text-fog space-y-1">
                  {report.improved_cases.map((caseId) => (
                    <li key={caseId} className="font-mono text-xs">{caseId}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fog/60">None</p>
              )}
            </Card>

            <Card>
              <h2 className="font-display text-sm text-ember mb-2.5">
                Regressed cases ({report.regressed_cases?.length ?? 0})
              </h2>
              {report.regressed_cases?.length > 0 ? (
                <ul className="text-sm text-fog space-y-1">
                  {report.regressed_cases.map((caseId) => (
                    <li key={caseId} className="font-mono text-xs">{caseId}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fog/60">None</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
