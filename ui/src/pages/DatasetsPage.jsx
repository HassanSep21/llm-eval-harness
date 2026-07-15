import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import Papa from 'papaparse'
import {
  PageHeader, Card, Button, Field, TextInput, TextArea, Callout, EmptyState,
  SkeletonCard, ConfirmDialog, Skeleton,
} from '../components/ui.jsx'

export default function DatasetsPage() {
  const { id } = useParams()
  return id ? <DatasetDetail datasetId={id} /> : <DatasetList />
}

// ---- List view ----

function DatasetList() {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null) // { id, name }
  const navigate = useNavigate()

  const load = useCallback(() => {
    setState({ loading: true, error: null, data: null })
    api
      .listDatasets()
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((error) => setState({ loading: false, error: error.message, data: null }))
  }, [])

  useEffect(() => { load() }, [load])

  const confirmDelete = async () => {
    const target = pendingDelete
    setPendingDelete(null)
    try {
      await api.deleteDataset(target.id)
      load()
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  const filtered = query.trim()
    ? state.data?.filter((ds) => ds.name.toLowerCase().includes(query.toLowerCase()))
    : state.data

  return (
    <div>
      <PageHeader
        eyebrow="Test data"
        title="Datasets"
        description="Collections of test cases used as the input side of an eval run."
        action={
          <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New dataset'}
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6">
          <CreateDatasetForm
            onCreated={() => { setShowForm(false); load() }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {state.error && (
        <div className="mb-4"><Callout tone="error">Couldn't load datasets: {state.error}</Callout></div>
      )}

      {state.loading && (
        <div className="grid gap-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      )}

      {!state.loading && !state.error && state.data?.length === 0 && (
        <EmptyState
          title="No datasets yet."
          action={
            <button onClick={() => setShowForm(true)} className="text-sm font-medium text-blueprint hover:text-frost underline underline-offset-4 decoration-blueprint/30">
              Create your first dataset
            </button>
          }
        />
      )}

      {!state.loading && state.data?.length > 0 && (
        <>
          {state.data.length > 5 && (
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets…"
              className="mb-4"
            />
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-fog">No datasets match "{query}".</p>
          ) : (
            <div className="grid gap-3">
              {filtered.map((ds) => (
                <DatasetRow
                  key={ds.id}
                  dataset={ds}
                  onOpen={() => navigate(`/datasets/${ds.id}`)}
                  onDelete={() => setPendingDelete({ id: ds.id, name: ds.name })}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        message="This also deletes all its test cases. This can't be undone."
        confirmLabel="Delete dataset"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function DatasetRow({ dataset, onOpen, onDelete }) {
  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
      }}
      className="cursor-pointer hover:ring-[rgba(186,215,247,0.22)] transition-shadow flex items-center justify-between"
    >
      <div>
        <p className="font-medium text-frost">{dataset.name}</p>
        {dataset.description && <p className="text-sm text-fog mt-0.5">{dataset.description}</p>}
        <p className="text-xs text-mist/60 mt-1.5 font-mono">
          {dataset.test_case_count ?? 0} test case{dataset.test_case_count === 1 ? '' : 's'} · {new Date(dataset.created_at).toLocaleDateString()}
        </p>
      </div>
      <Button variant="danger" onClick={(e) => { e.stopPropagation(); onDelete() }}>
        Delete
      </Button>
    </Card>
  )
}

function CreateDatasetForm({ onCreated, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.createDataset({ name: name.trim(), description: description.trim() || null })
      onCreated()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Callout tone="error">{error}</Callout>}
        <Field label="Name">
          <TextInput
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="customer-support-v1"
          />
        </Field>
        <Field label="Description (optional)">
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Billing and refund queries"
          />
        </Field>
        <div className="flex items-center gap-3 pt-1">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create'}
          </Button>
          <button type="button" onClick={onCancel} className="text-sm text-fog hover:text-mist">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  )
}

// ---- CSV Dataset ----
function CsvUploadForm({ datasetId, onImported }) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null) // { created, skipped, errors }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = '' // allow re-selecting the same file later

    setUploading(true)
    setResult(null)

    const text = await file.text()
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })

    let created = 0
    let skipped = 0
    const errors = []

    for (const row of parsed.data) {
      const input = (row.input || '').trim()
      if (!input) { skipped++; continue }

      const expectedOutput = (row.expected_output || '').trim() || null
      const pattern = (row.pattern || '').trim()
      const metadata = pattern ? { pattern } : null

      try {
        await api.createTestCase(datasetId, { input, expected_output: expectedOutput, metadata })
        created++
      } catch (err) {
        skipped++
        errors.push(`"${input.slice(0, 40)}...": ${err.message}`)
      }
    }

    setResult({ created, skipped, errors })
    setUploading(false)
    if (created > 0) onImported()
  }

  return (
    <Card>
      <p className="text-sm font-medium text-frost mb-1">Import from CSV</p>
      <p className="text-xs text-fog mb-3">
        Columns: <code className="font-mono text-mist bg-[rgba(199,211,234,0.08)] px-1.5 py-0.5 rounded-badge">input</code> (required),{' '}
        <code className="font-mono text-mist bg-[rgba(199,211,234,0.08)] px-1.5 py-0.5 rounded-badge">expected_output</code>,{' '}
        <code className="font-mono text-mist bg-[rgba(199,211,234,0.08)] px-1.5 py-0.5 rounded-badge">pattern</code> (both optional). First row must be headers.
      </p>
      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        disabled={uploading}
        className="text-sm text-fog file:mr-3 file:py-2 file:px-4 file:rounded-btn file:border-0 file:bg-[rgba(186,214,247,0.08)] file:text-white file:text-sm file:font-medium hover:file:bg-[rgba(186,214,247,0.14)] file:cursor-pointer cursor-pointer"
      />
      {uploading && <p className="text-sm text-fog mt-2">Importing…</p>}
      {result && (
        <p className={`text-sm mt-3 ${result.skipped > 0 ? 'text-ice' : 'text-blueprint'}`}>
          Imported {result.created} test case{result.created === 1 ? '' : 's'}
          {result.skipped > 0 && `, skipped ${result.skipped}`}.
          {result.errors.length > 0 && (
            <span className="block text-xs text-ember/90 mt-1.5">
              {result.errors.slice(0, 3).join(' · ')}
              {result.errors.length > 3 && ` (+${result.errors.length - 3} more)`}
            </span>
          )}
        </p>
      )}
    </Card>
  )
}

// ---- Detail view ----

function DatasetDetail({ datasetId }) {
  const [dsState, setDsState] = useState({ loading: true, error: null, data: null })
  const [casesState, setCasesState] = useState({ loading: true, error: null, data: null })
  const [showForm, setShowForm] = useState(false)
  const [showCsv, setShowCsv] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null) // test case id
  const navigate = useNavigate()

  const loadDataset = useCallback(() => {
    api
      .getDataset(datasetId)
      .then((data) => setDsState({ loading: false, error: null, data }))
      .catch((error) => setDsState({ loading: false, error: error.message, data: null }))
  }, [datasetId])

  const loadCases = useCallback(() => {
    setCasesState((s) => ({ ...s, loading: true }))
    api
      .listTestCases(datasetId)
      .then((data) => setCasesState({ loading: false, error: null, data }))
      .catch((error) => setCasesState({ loading: false, error: error.message, data: null }))
  }, [datasetId])

  useEffect(() => { loadDataset(); loadCases() }, [loadDataset, loadCases])

  const confirmDeleteCase = async () => {
    const testCaseId = pendingDelete
    setPendingDelete(null)
    try {
      await api.deleteTestCase(datasetId, testCaseId)
      loadCases()
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  if (dsState.loading) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-7 w-64 mb-6" />
        <SkeletonCard />
      </div>
    )
  }
  if (dsState.error) {
    return <Callout tone="error">Couldn't load dataset: {dsState.error}</Callout>
  }

  return (
    <div>
      <button onClick={() => navigate('/datasets')} className="text-sm text-mist hover:text-frost mb-4 inline-flex items-center gap-1">
        ← All datasets
      </button>

      <PageHeader
        eyebrow="Dataset"
        title={dsState.data.name}
        description={dsState.data.description}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-frost">Test cases</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCsv((v) => !v)}>
            {showCsv ? 'Close' : 'Import CSV'}
          </Button>
          <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : '+ Add test case'}
          </Button>
        </div>
      </div>

      {showCsv && <div className="mb-4"><CsvUploadForm datasetId={datasetId} onImported={loadCases} /></div>}
      {showForm && <div className="mb-4"><CreateTestCaseForm datasetId={datasetId} onCreated={loadCases} /></div>}

      {casesState.error && (
        <div className="mb-3"><Callout tone="error">Couldn't load test cases: {casesState.error}</Callout></div>
      )}

      {casesState.loading && (
        <div className="grid gap-2.5">
          <SkeletonCard lines={2} /><SkeletonCard lines={2} />
        </div>
      )}

      {!casesState.loading && !casesState.error && casesState.data?.length === 0 && (
        <EmptyState
          title="No test cases yet."
          action={
            <button onClick={() => setShowForm(true)} className="text-sm font-medium text-blueprint hover:text-frost underline underline-offset-4 decoration-blueprint/30">
              Add your first test case
            </button>
          }
        />
      )}

      {!casesState.loading && casesState.data?.length > 0 && (
        <div className="grid gap-2.5">
          {casesState.data.map((tc) => (
            <Card key={tc.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-frost"><span className="font-medium text-mist">Input</span> — {tc.input}</p>
                  {tc.expected_output && (
                    <p className="text-sm text-fog mt-1.5">
                      <span className="font-medium text-mist">Expected</span> — {tc.expected_output}
                    </p>
                  )}
                </div>
                <Button variant="danger" className="shrink-0" onClick={() => setPendingDelete(tc.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this test case?"
        message="This can't be undone."
        confirmLabel="Delete test case"
        onConfirm={confirmDeleteCase}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function CreateTestCaseForm({ datasetId, onCreated }) {
  const [input, setInput] = useState('')
  const [expectedOutput, setExpectedOutput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [pattern, setPattern] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) {
      setError('Input is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.createTestCase(datasetId, {
        input: input.trim(),
        expected_output: expectedOutput.trim() || null,
        metadata: pattern.trim() ? { pattern: pattern.trim() } : null,
      })
      setInput('')
      setExpectedOutput('')
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Callout tone="error">{error}</Callout>}
        <Field label="Input">
          <TextArea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="What is your refund policy?"
          />
        </Field>
        <Field label="Expected output (optional)">
          <TextArea
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            rows={2}
            placeholder="We offer a 30-day money-back guarantee..."
          />
        </Field>
        <Field label="Regex pattern (optional — only used by the regex_match metric)">
          <TextInput
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="font-mono"
            placeholder="^\d+$"
          />
        </Field>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Add test case'}
        </Button>
      </form>
    </Card>
  )
}
