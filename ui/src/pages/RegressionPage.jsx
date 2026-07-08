import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'

const VERDICT_STYLES = {
  improved: 'bg-green-100 text-green-700',
  regressed: 'bg-red-100 text-red-700',
  mixed: 'bg-yellow-100 text-yellow-700',
  neutral: 'bg-gray-100 text-gray-700',
}

function DeltaBar({ dim, value }) {
  const positive = value >= 0
  const pct = Math.min(Math.abs(value) * 100, 100)
  return (
    <div className="text-sm">
      <div className="flex justify-between mb-0.5">
        <span className="capitalize text-gray-600">{dim}</span>
        <span className={positive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {positive ? '+' : ''}{value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
        <div
          className={`h-full ${positive ? 'bg-green-500' : 'bg-red-500'}`}
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
    return (
      <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        Couldn't load runs: {loadError}
      </div>
    )
  }

  if (!runs) {
    return <p className="text-gray-500 text-sm">Loading…</p>
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Regression</h1>

      {runs.length < 2 && (
        <div className="mb-4 px-3 py-2 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded">
          You need at least two completed runs to compare. Start another run first.
        </div>
      )}

      <form onSubmit={handleCompare} className="space-y-4 mb-6">
        {compareError && (
          <p className="text-sm text-red-600 px-3 py-2 bg-red-50 border border-red-200 rounded">
            {compareError}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Run A (baseline)</label>
            <select
              value={runAId}
              onChange={(e) => setRunAId(e.target.value)}
              disabled={runs.length === 0}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100"
            >
              <option value="">Select a run</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} · {r.target_model} · {new Date(r.created_at).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Run B (comparison)</label>
            <select
              value={runBId}
              onChange={(e) => setRunBId(e.target.value)}
              disabled={runs.length === 0}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100"
            >
              <option value="">Select a run</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} · {r.target_model} · {new Date(r.created_at).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={comparing || runs.length < 2}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {comparing ? 'Comparing…' : 'Compare Runs'}
        </button>
      </form>

      {report && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded bg-white">
            <span className="text-sm font-medium text-gray-700">Verdict</span>
            <span className={`px-3 py-1 rounded text-sm font-semibold uppercase ${VERDICT_STYLES[report.verdict]}`}>
              {report.verdict}
            </span>
          </div>

          <div className="p-4 border border-gray-200 rounded bg-white">
            <h2 className="font-medium text-gray-700 mb-3">Per-Dimension Delta</h2>
            <div className="space-y-3">
              {Object.entries(report.per_dimension_avg_delta || {}).map(([dim, val]) => (
                <DeltaBar key={dim} dim={dim} value={val} />
              ))}
            </div>
          </div>

          {report.calibration_report && (
            <div className="p-4 border border-gray-200 rounded bg-white">
              <h2 className="font-medium text-gray-700 mb-3">Calibration Report</h2>
              <p className="text-sm text-gray-600 mb-2">
                Overall consistency:{' '}
                <span className="font-medium text-gray-800">
                  {report.calibration_report.overall_consistency?.toFixed(2)}
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(report.calibration_report.dimension_agreement || {}).map(([dim, val]) => (
                  <div key={dim} className="text-sm">
                    <p className="text-gray-500 capitalize">{dim}</p>
                    <p className="font-medium text-gray-800">{val.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded bg-white">
              <h2 className="font-medium text-green-700 mb-2">
                Improved Cases ({report.improved_cases?.length ?? 0})
              </h2>
              {report.improved_cases?.length > 0 ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  {report.improved_cases.map((caseId) => (
                    <li key={caseId} className="font-mono text-xs">{caseId}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">None</p>
              )}
            </div>

            <div className="p-4 border border-gray-200 rounded bg-white">
              <h2 className="font-medium text-red-700 mb-2">
                Regressed Cases ({report.regressed_cases?.length ?? 0})
              </h2>
              {report.regressed_cases?.length > 0 ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  {report.regressed_cases.map((caseId) => (
                    <li key={caseId} className="font-mono text-xs">{caseId}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">None</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
