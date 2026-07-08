import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

function truncate(text, len = 80) {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '…' : text
}

export default function RunResultsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [run, setRun] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})
  const intervalRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const runData = await api.getRun(id)
        if (cancelled) return
        setRun(runData)

        if (runData.status === 'completed' || runData.status === 'failed') {
          clearInterval(intervalRef.current)
          if (runData.status === 'completed') {
            const resultsData = await api.getRunResults(id)
            if (!cancelled) setResults(resultsData)
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
    return (
      <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        Couldn't load run: {error}
      </div>
    )
  }

  if (!run) {
    return <p className="text-gray-500 text-sm">Loading run…</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Run <span className="text-gray-400 font-normal text-base">{run.id.slice(0, 8)}</span>
        </h1>
        <span className={`px-2.5 py-1 rounded text-xs font-medium uppercase ${STATUS_STYLES[run.status]}`}>
          {run.status}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-4 space-y-0.5">
        <p>Target model: <span className="text-gray-700 font-medium">{run.target_model}</span></p>
        <p>Created: {new Date(run.created_at).toLocaleString()}</p>
      </div>

      {(run.status === 'pending' || run.status === 'running') && (
        <p className="text-sm text-gray-500 mb-4">Polling for updates every 3 seconds…</p>
      )}

      {run.status === 'failed' && (
        <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded mb-4">
          Run failed: {run.error || 'Unknown error'}
        </div>
      )}

      {run.status === 'completed' && (
        <>
          {run.calibration_report && (
            <div className="mb-6 p-4 border border-gray-200 rounded bg-white">
              <h2 className="font-medium text-gray-700 mb-3">Calibration Report</h2>
              <p className="text-sm text-gray-600 mb-2">
                Overall consistency:{' '}
                <span className="font-medium text-gray-800">
                  {run.calibration_report.overall_consistency?.toFixed(2)}
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(run.calibration_report.dimension_agreement || {}).map(([dim, val]) => (
                  <div key={dim} className="text-sm">
                    <p className="text-gray-500 capitalize">{dim}</p>
                    <p className="font-medium text-gray-800">{val.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-700">Per-Case Results ({results?.length ?? 0})</h2>
            <button
              onClick={() => navigate(`/regression?runA=${run.id}`)}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Compare this run →
            </button>
          </div>

          {!results && <p className="text-gray-500 text-sm">Loading results…</p>}

          {results && results.length === 0 && (
            <p className="text-gray-500 text-sm">No results recorded for this run.</p>
          )}

          {results && results.length > 0 && (
            <div className="space-y-3">
              {results.map((r) => (
                <ResultRow
                  key={r.id}
                  result={r}
                  isExpanded={!!expanded[r.id]}
                  onToggle={() => toggleExpanded(r.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ResultRow({ result, isExpanded, onToggle }) {
  return (
    <div
      className={`p-4 border rounded bg-white ${
        result.low_confidence ? 'border-yellow-300' : 'border-gray-200'
      }`}
    >
      {result.low_confidence && (
        <span className="inline-block mb-2 px-2 py-0.5 text-xs font-medium text-yellow-800 bg-yellow-100 rounded">
          Low confidence — judges disagreed
        </span>
      )}

      {result.error && (
        <p className="text-sm text-red-600 mb-2">Error: {result.error}</p>
      )}

      <p className="text-sm text-gray-800 mb-1">
        <span className="font-medium">Input:</span> {truncate(result.actual_output && result.actual_output, 200) || '—'}
      </p>

      <p className="text-sm text-gray-800 mb-1">
        <span className="font-medium">Output:</span>{' '}
        {isExpanded ? result.actual_output : truncate(result.actual_output, 120)}
        {result.actual_output && result.actual_output.length > 120 && (
          <button onClick={onToggle} className="ml-2 text-blue-600 text-xs hover:underline">
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </p>

      {Object.keys(result.metric_scores || {}).length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Metrics</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.metric_scores).map(([name, m]) => (
              <span
                key={name}
                className={`px-2 py-1 rounded text-xs ${
                  m.passed === true
                    ? 'bg-green-50 text-green-700'
                    : m.passed === false
                    ? 'bg-red-50 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {name}: {typeof m.score === 'number' ? m.score.toFixed(2) : m.score}
              </span>
            ))}
          </div>
        </div>
      )}

      {(result.primary_judge_score || result.secondary_judge_score) && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.primary_judge_score && (
            <JudgeScoreBlock label="Primary Judge (Groq)" score={result.primary_judge_score} />
          )}
          {result.secondary_judge_score && (
            <JudgeScoreBlock label="Secondary Judge (Ollama)" score={result.secondary_judge_score} />
          )}
        </div>
      )}
    </div>
  )
}

const DIMENSIONS = ['correctness', 'tone', 'faithfulness', 'conciseness']

function JudgeScoreBlock({ label, score }) {
  return (
    <div className="text-xs">
      <p className="font-medium text-gray-500 uppercase mb-1">{label}</p>
      {score.error ? (
        <p className="text-red-600 mb-1">Judge error: {score.error}</p>
      ) : (
        <div className="space-y-0.5">
          {DIMENSIONS.map((dim) => (
            <p key={dim} className="text-gray-700">
              <span className="capitalize font-medium">{dim}:</span> {score[dim]?.score?.toFixed(2)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
