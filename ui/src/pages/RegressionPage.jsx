import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { PageHeader, Card, HeroCard, Button, Field, Callout, StatusPill, StatNumber, SearchableSelect, SkeletonCard, Skeleton } from '../components/ui.jsx'

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

function CaseDeltaList({ title, color, cases, testCaseMap }) {
  return (
    <Card className="!p-5">
      <h2 className={`font-display text-base mb-4 ${color}`}>
        {title} ({cases.length})
      </h2>
      {cases.length === 0 ? (
        <p className="text-sm text-fog">None</p>
      ) : (
        <div className="space-y-4">
          {cases.map((cd) => {
            const tc = testCaseMap[cd.test_case_id]
            return (
              <div 
                key={cd.test_case_id} 
                className="text-sm border-t border-[rgba(186,215,247,0.10)] pt-3 first:border-t-0 first:pt-0"
              >
                <p className="text-frost">{tc?.input ?? '(input unavailable)'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(cd.dimension_deltas).map(([dim, val]) => {
                    let badgeStyle = '';
                    let prefix = '';

                    if (val > 0) {
                      badgeStyle = 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20';
                      prefix = '+';
                    } else if (val < 0) {
                      badgeStyle = 'bg-[rgba(228,109,76,0.08)] text-ember ring-[rgba(228,109,76,0.22)]';
                    } else {
                      badgeStyle = 'bg-[rgba(186,214,247,0.06)] text-mist ring-[rgba(186,215,247,0.14)]';
                    }

                    return (
                      <span
                        key={dim}
                        className={`inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-medium ring-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] ${badgeStyle}`}
                      >
                        {dim} {prefix}{val.toFixed(2)}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
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
  const [testCaseMap, setTestCaseMap] = useState({})

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
    if (!runAId || !runBId) { setCompareError('Pick two runs to compare.'); return }
    if (runAId === runBId) { setCompareError('Pick two different runs.'); return }

    setComparing(true)
    setReport(null)
    try {
      const data = await api.compareRuns(runAId, runBId)
      setReport(data)
      const testCases = await api.listTestCases(data.dataset_id)
      setTestCaseMap(Object.fromEntries(testCases.map((tc) => [tc.id, tc])))
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
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-7 w-48 mb-6" />
        <SkeletonCard lines={3} />
      </div>
    )
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
              <SearchableSelect
                value={runAId}
                onChange={setRunAId}
                placeholder="Search runs…"
                options={runs.map((r) => ({
                  value: r.id,
                  label: `${r.id.slice(0, 8)} · ${r.target_model} · ${new Date(r.created_at).toLocaleString()}`,
                }))}
              />
            </Field>

            <Field label="Run B (comparison)">
              <SearchableSelect
                value={runBId}
                onChange={setRunBId}
                placeholder="Search runs…"
                options={runs.map((r) => ({
                  value: r.id,
                  label: `${r.id.slice(0, 8)} · ${r.target_model} · ${new Date(r.created_at).toLocaleString()}`,
                }))}
              />
            </Field>
          </div>

          <Button variant="primary" type="submit" disabled={comparing || runs.length < 2}>
            {comparing ? 'Comparing…' : 'Compare runs'}
          </Button>
        </form>
      </Card>

      {report && (
        <div className="space-y-5">
          <HeroCard className="flex items-center justify-between">
            <span className="text-sm font-medium text-mist">Verdict</span>
            <StatusPill status={report.verdict} />
          </HeroCard>

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
                <StatNumber className="text-lg font-medium">
                  {report.calibration_report.overall_consistency?.toFixed(2)}
                </StatNumber>
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
            <CaseDeltaList
              title="Improved Cases"
              color="text-emerald-400"
              cases={report.case_deltas.filter((cd) => cd.improved)}
              testCaseMap={testCaseMap}
            />
            <CaseDeltaList
              title="Regressed Cases"
              color="text-ember"
              cases={report.case_deltas.filter((cd) => cd.regressed)}
              testCaseMap={testCaseMap}
            />
          </div>
        </div>
      )}
    </div>
  )
}
