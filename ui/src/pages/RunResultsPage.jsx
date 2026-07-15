import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { Card, HeroCard, Callout, StatusPill, Spinner, Button, Badge, StatNumber, SkeletonCard, Skeleton } from '../components/ui.jsx'

function truncate(text, len = 80) {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '…' : text
}

export default function RunResultsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [run, setRun] = useState(null)
  const [testCaseMap, setTestCaseMap] = useState({})
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})
  const intervalRef = useRef(null)
  const [totalCases, setTotalCases] = useState(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [filter, setFilter] = useState('all') // 'all' | 'flagged' | 'errors'


  useEffect(() => {
    if (!run?.dataset_id) return
    api.listTestCases(run.dataset_id)
      .then((cases) => setTotalCases(cases.length))
      .catch(() => {}) // non-critical — progress bar just won't show a total
  }, [run?.dataset_id])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const runData = await api.getRun(id)
        if (cancelled) return
        setRun(runData)

        if (runData.status === 'completed' || runData.status === 'failed') {
          clearInterval(intervalRef.current)
        }

        if (runData.status === 'running' || runData.status === 'pending') {
          api.getRunResults(id)
            .then((partial) => { if (!cancelled) setCompletedCount(partial.length) })
            .catch(() => {})
        }

        if (runData.status === 'completed') {
          const [resultsData, testCases] = await Promise.all([
            api.getRunResults(id),
            api.listTestCases(runData.dataset_id),
          ])
          if (!cancelled) {
            setResults(resultsData)
            setTestCaseMap(Object.fromEntries(testCases.map((tc) => [tc.id, tc])))
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          clearInterval(intervalRef.current)
        }
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 3000)

    return () => {
      cancelled = true
      clearInterval(intervalRef.current)
    }
  }, [id])

  const toggleExpanded = (rowId) => {
    setExpanded((prev) => ({ ...prev, [rowId]: !prev[rowId] }))
  }

  if (error) {
    return <Callout tone="error">Couldn't load run: {error}</Callout>
  }

  if (!run) {
    return (
      <div>
        <Skeleton className="h-6 w-32 mb-3" />
        <Skeleton className="h-4 w-48 mb-6" />
        <SkeletonCard lines={3} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-[24px] text-ice">
          Run <span className="text-mist/50 font-sans text-base font-normal">{run.id.slice(0, 8)}</span>
        </h1>
        <StatusPill status={run.status} />
      </div>

      <div className="text-sm text-fog mb-6 space-y-0.5">
        <p>Target model: <span className="text-frost font-medium">{run.target_model}</span></p>
        <p>Created: {new Date(run.created_at).toLocaleString()}</p>
      </div>

      {(run.status === 'pending' || run.status === 'running') && (
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Spinner />
            <span className="text-sm font-medium text-frost">
              {run.status === 'pending'
                ? 'Queued, about to start…'
                : totalCases
                  ? `Evaluating case ${completedCount} of ${totalCases}…`
                  : 'Evaluation running…'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[rgba(199,211,234,0.08)] overflow-hidden">
            <div
              className="h-full bg-blueprint transition-all duration-500 rounded-full"
              style={{ width: totalCases ? `${(completedCount / totalCases) * 100}%` : '15%' }}
            />
          </div>
          <p className="text-xs text-fog mt-2.5">Checking for updates every 3 seconds</p>
        </Card>
      )}

      {run.status === 'failed' && (
        <div className="mb-4"><Callout tone="error">Run failed: {run.error || 'Unknown error'}</Callout></div>
      )}

      {run.status === 'completed' && (
        <>
          {run.calibration_report && (
            <HeroCard className="mb-6">
              <h2 className="font-display text-base text-frost mb-3">Calibration report</h2>
              <p className="text-sm text-fog mb-3">
                Overall consistency:{' '}
                <StatNumber className="text-lg font-medium">
                  {run.calibration_report.overall_consistency?.toFixed(2)}
                </StatNumber>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(run.calibration_report.dimension_agreement || {}).map(([dim, val]) => (
                  <div key={dim} className="text-sm">
                    <p className="text-fog capitalize">{dim}</p>
                    <p className="font-medium text-frost">{val.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </HeroCard>
          )}

          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <h2 className="font-display text-base text-frost">Per-case results ({results?.length ?? 0})</h2>
            <div className="flex items-center gap-3">
              {results && results.length > 0 && (
                <div className="flex items-center gap-1 rounded-btn ring-1 ring-[rgba(186,215,247,0.12)] p-0.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'flagged', label: 'Flagged' },
                    { id: 'errors', label: 'Errors' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-colors ${
                        filter === f.id ? 'bg-[rgba(186,214,247,0.12)] text-white' : 'text-mist hover:text-frost'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
              <Button variant="outline" onClick={() => navigate(`/regression?runA=${run.id}`)}>
                Compare this run →
              </Button>
            </div>
          </div>

          {!results && (
            <div className="space-y-3">
              <SkeletonCard lines={3} /><SkeletonCard lines={3} />
            </div>
          )}

          {results && results.length === 0 && (
            <p className="text-fog text-sm">No results recorded for this run.</p>
          )}

          {results && results.length > 0 && (() => {
            const visible = results.filter((r) => {
              if (filter === 'flagged') return r.low_confidence
              if (filter === 'errors') return r.error || Object.values(r.metric_scores || {}).some((m) => m.passed === false)
              return true
            })
            if (visible.length === 0) {
              return <p className="text-fog text-sm">No results match this filter.</p>
            }
            return (
              <div className="space-y-3">
                {visible.map((r) => (
                  <ResultRow
                    key={r.id}
                    result={r}
                    testCase={testCaseMap[r.test_case_id]}
                    isExpanded={!!expanded[r.id]}
                    onToggle={() => toggleExpanded(r.id)}
                  />
                ))}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

function ResultRow({ result, testCase, isExpanded, onToggle }) {
  return (
    <Card className={result.low_confidence ? 'ring-[rgba(228,109,76,0.3)]' : ''}>
      {result.low_confidence && (
        <Badge className="mb-3 text-ember bg-[rgba(228,109,76,0.1)]">
          Low confidence — judges disagreed
        </Badge>
      )}

      {result.error && (
        <p className="text-sm text-ember mb-2">Error: {result.error}</p>
      )}

      <p className="text-sm text-frost mb-1.5">
        <span className="font-medium text-mist">Input</span> — {testCase?.input ?? '—'}
      </p>

      <p className="text-sm text-frost mb-1.5">
        <span className="font-medium text-mist">Output</span> —{' '}
        {isExpanded ? result.actual_output : truncate(result.actual_output, 120)}
        {result.actual_output && result.actual_output.length > 120 && (
          <button onClick={onToggle} className="ml-2 text-blueprint text-xs hover:text-frost">
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </p>

      {Object.keys(result.metric_scores || {}).length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-mist/70 uppercase tracking-wide mb-1.5">Metrics</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.metric_scores).map(([name, m]) => (
              <span
                key={name}
                className={`px-2 py-1 rounded-badge text-xs font-medium ${
                  m.passed === true
                    ? 'bg-[rgba(182,217,252,0.1)] text-blueprint'
                    : m.passed === false
                    ? 'bg-[rgba(228,109,76,0.1)] text-ember'
                    : 'bg-[rgba(199,211,234,0.08)] text-mist'
                }`}
              >
                {name}: {typeof m.score === 'number' ? m.score.toFixed(2) : m.score}
              </span>
            ))}
          </div>
        </div>
      )}

      {(result.primary_judge_score || result.secondary_judge_score) && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.primary_judge_score && (
            <JudgeScoreBlock label="Primary judge (Groq)" score={result.primary_judge_score} />
          )}
          {result.secondary_judge_score && (
            <JudgeScoreBlock label="Secondary judge (Ollama)" score={result.secondary_judge_score} />
          )}
        </div>
      )}
    </Card>
  )
}

const DIMENSIONS = ['correctness', 'tone', 'faithfulness', 'conciseness']

function JudgeScoreBlock({ label, score }) {
  const [showReasons, setShowReasons] = useState(false)

  return (
    <div className="text-xs rounded-input bg-[rgba(199,211,234,0.04)] ring-1 ring-[rgba(186,215,247,0.08)] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-mist/70 uppercase tracking-wide">{label}</p>
        {!score.error && (
          <button
            onClick={() => setShowReasons((v) => !v)}
            className="text-blueprint hover:text-frost text-xs"
          >
            {showReasons ? 'Hide reasons' : 'Show reasons'}
          </button>
        )}
      </div>

      {score.error ? (
        <p className="text-ember mb-1">Judge error: {score.error}</p>
      ) : (
        <div className="space-y-1.5">
          {DIMENSIONS.map((dim) => (
            <div key={dim}>
              <p className="text-frost">
                <span className="capitalize font-medium text-mist">{dim}:</span> {score[dim]?.score?.toFixed(2)}
              </p>
              {showReasons && score[dim]?.reason && (
                <p className="text-fog pl-2 mt-0.5 italic">{score[dim].reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
