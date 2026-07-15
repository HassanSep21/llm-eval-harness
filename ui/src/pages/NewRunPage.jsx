import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import {
  PageHeader, Card, HeroCard, Button, Field, TextArea, Select, Checkbox, Callout, SkeletonCard,
} from '../components/ui.jsx'

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
    return <Callout tone="error">Couldn't load setup data: {loadError}</Callout>
  }

  if (!datasets || !models) {
    return (
      <div className="max-w-xl mx-auto">
        <SkeletonCard lines={4} />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader center eyebrow="Evaluation" title="New run" description="Send a dataset through a target model and score it with one or two judges." />

      {datasets.length === 0 && (
        <div className="mb-4">
          <Callout tone="warning">
            No datasets yet. <a href="/datasets" className="underline font-medium hover:text-white">Create one first.</a>
          </Callout>
        </div>
      )}

      {models.length === 0 && (
        <div className="mb-4">
          <Callout tone="warning">
            No Ollama models found. Pull one with{' '}
            <code className="font-mono bg-[rgba(199,211,234,0.1)] px-1.5 py-0.5 rounded-badge">docker compose exec ollama ollama pull llama3.1:8b</code>.
          </Callout>
        </div>
      )}

      <HeroCard>
        <form onSubmit={handleSubmit} className="space-y-5">
          {submitError && <Callout tone="error">{submitError}</Callout>}

          <Field label="Dataset">
            <Select value={datasetId} onChange={(e) => setDatasetId(e.target.value)} disabled={datasets.length === 0}>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.test_case_count ?? 0} cases)
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Target model">
            <Select value={targetModel} onChange={(e) => setTargetModel(e.target.value)} disabled={models.length === 0}>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </Field>

          <Field label="System prompt (optional)">
            <TextArea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              placeholder="You are a helpful customer support assistant..."
            />
          </Field>

          <div className="h-px bg-[rgba(186,215,247,0.10)]" />

          <Checkbox
            id="dual-judge"
            checked={dualJudge}
            onChange={(e) => setDualJudge(e.target.checked)}
            label="Dual judge (Groq + local Ollama, with agreement scoring)"
          />

          {dualJudge && (
            <Field label="Judge model override (optional)">
              <Select value={secondaryModel} onChange={(e) => setSecondaryModel(e.target.value)}>
                <option value="">Use default (.env setting)</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </Field>
          )}

          <div>
            <p className="block text-sm font-medium text-mist mb-2">Metrics</p>
            <div className="space-y-2">
              {ALL_METRICS.map((metric) => (
                <Checkbox
                  key={metric}
                  id={`metric-${metric}`}
                  checked={metrics.includes(metric)}
                  onChange={() => toggleMetric(metric)}
                  label={metric}
                />
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            type="submit"
            disabled={submitting || datasets.length === 0 || models.length === 0}
            className="w-full"
          >
            {submitting ? 'Starting run…' : 'Start run'}
          </Button>
        </form>
      </HeroCard>
    </div>
  )
}
