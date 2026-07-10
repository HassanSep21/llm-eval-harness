import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const ALL_METRICS = ['exact_match', 'contains', 'regex_match', 'rouge_l']
const DEFAULT_METRICS = ['rouge_l']

export default function NewRunPage() {
  const navigate = useNavigate()

  const [datasets, setDatasets] = useState(null)
  const [models, setModels] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [datasetId, setDatasetId] = useState('')
  const [targetModel, setTargetModel] = useState('')
  const [secondaryModel, setSecondaryModel] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [dualJudge, setDualJudge] = useState(true)
  const [metrics, setMetrics] = useState(DEFAULT_METRICS)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    Promise.all([api.listDatasets(), api.listOllamaModels()])
      .then(([ds, ms]) => {
        setDatasets(ds)
        setModels(ms)
        if (ds.length > 0) setDatasetId(ds[0].id)
        if (ms.length > 0) setTargetModel(ms[0])
      })
      .catch((err) => setLoadError(err.message))
  }, [])

  const toggleMetric = (metric) => {
    setMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)

    if (!datasetId) {
      setSubmitError('Pick a dataset.')
      return
    }
    if (!targetModel) {
      setSubmitError('Pick a target model.')
      return
    }
    if (metrics.length === 0) {
      setSubmitError('Select at least one metric.')
      return
    }

    setSubmitting(true)
    try {
      const run = await api.createRun({
        dataset_id: datasetId,
        target_model: targetModel,
        system_prompt: systemPrompt.trim() || null,
        judge_config: {
          primary_backend: 'groq',
          secondary_backend: dualJudge ? 'ollama' : null,
          secondary_model: dualJudge ? (secondaryModel || null) : null,
          dual_judge: dualJudge,
          metrics,
        },
      })
      navigate(`/runs/${run.id}`)
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        Couldn't load setup data: {loadError}
      </div>
    )
  }

  if (!datasets || !models) {
    return <p className="text-gray-500 text-sm">Loading…</p>
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">New Run</h1>

      {datasets.length === 0 && (
        <div className="mb-4 px-3 py-2 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded">
          No datasets yet.{' '}
          <a href="/datasets" className="underline font-medium">Create one first.</a>
        </div>
      )}

      {models.length === 0 && (
        <div className="mb-4 px-3 py-2 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded">
          No Ollama models found. Pull one with{' '}
          <code className="bg-yellow-100 px-1 rounded">docker compose exec ollama ollama pull llama3.1:8b</code>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <p className="text-sm text-red-600 px-3 py-2 bg-red-50 border border-red-200 rounded">
            {submitError}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
          <select
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            disabled={datasets.length === 0}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100"
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.test_case_count ?? 0} cases)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Model</label>
          <select
            value={targetModel}
            onChange={(e) => setTargetModel(e.target.value)}
            disabled={models.length === 0}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100"
          >
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System prompt (optional)
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
            placeholder="You are a helpful customer support assistant..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="dual-judge"
            type="checkbox"
            checked={dualJudge}
            onChange={(e) => setDualJudge(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="dual-judge" className="text-sm text-gray-700">
            Dual judge (Groq + local Ollama, with agreement scoring)
          </label>
        </div>

        {dualJudge && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judge model override (optional)
            </label>
            <select
              value={secondaryModel}
              onChange={(e) => setSecondaryModel(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
            >
              <option value="">Use default (.env setting)</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metrics</label>
          <div className="space-y-1">
            {ALL_METRICS.map((metric) => (
              <div key={metric} className="flex items-center gap-2">
                <input
                  id={`metric-${metric}`}
                  type="checkbox"
                  checked={metrics.includes(metric)}
                  onChange={() => toggleMetric(metric)}
                  className="h-4 w-4"
                />
                <label htmlFor={`metric-${metric}`} className="text-sm text-gray-700">
                  {metric}
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || datasets.length === 0 || models.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Starting run…' : 'Start Run'}
        </button>
      </form>
    </div>
  )
}
