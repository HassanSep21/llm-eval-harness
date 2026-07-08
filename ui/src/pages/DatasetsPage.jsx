import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function DatasetsPage() {
  const { id } = useParams()
  return id ? <DatasetDetail datasetId={id} /> : <DatasetList />
}

// ---- List view ----

function DatasetList() {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(() => {
    setState({ loading: true, error: null, data: null })
    api
      .listDatasets()
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((error) => setState({ loading: false, error: error.message, data: null }))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (e, datasetId, name) => {
    e.stopPropagation()
    if (!confirm(`Delete "${name}"? This also deletes all its test cases. This can't be undone.`)) return
    try {
      await api.deleteDataset(datasetId)
      load()
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">Datasets</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Dataset'}
        </button>
      </div>

      {showForm && (
        <CreateDatasetForm
          onCreated={() => { setShowForm(false); load() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {state.error && (
        <div className="mb-4 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
          Couldn't load datasets: {state.error}
        </div>
      )}

      {state.loading && <p className="text-gray-500 text-sm">Loading datasets…</p>}

      {!state.loading && !state.error && state.data?.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded">
          <p className="text-gray-500 mb-3">No datasets yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Create your first dataset
          </button>
        </div>
      )}

      {!state.loading && state.data?.length > 0 && (
        <div className="divide-y divide-gray-200 border border-gray-200 rounded">
          {state.data.map((ds) => (
            <div
              key={ds.id}
              onClick={() => navigate(`/datasets/${ds.id}`)}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
            >
              <div>
                <p className="font-medium text-gray-800">{ds.name}</p>
                {ds.description && (
                  <p className="text-sm text-gray-500">{ds.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {ds.test_case_count ?? 0} test case{ds.test_case_count === 1 ? '' : 's'} · created{' '}
                  {new Date(ds.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, ds.id, ds.name)}
                className="text-sm text-red-500 hover:text-red-700 px-2"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
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
    <form onSubmit={handleSubmit} className="mb-4 p-4 border border-gray-200 rounded bg-white">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
          placeholder="customer-support-v1"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
          placeholder="Billing and refund queries"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---- Detail view ----

function DatasetDetail({ datasetId }) {
  const [dsState, setDsState] = useState({ loading: true, error: null, data: null })
  const [casesState, setCasesState] = useState({ loading: true, error: null, data: null })
  const [showForm, setShowForm] = useState(false)
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

  const handleDeleteCase = async (testCaseId) => {
    if (!confirm('Delete this test case?')) return
    try {
      await api.deleteTestCase(datasetId, testCaseId)
      loadCases()
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  if (dsState.loading) return <p className="text-gray-500 text-sm">Loading dataset…</p>
  if (dsState.error) {
    return (
      <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        Couldn't load dataset: {dsState.error}
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => navigate('/datasets')} className="text-sm text-blue-600 hover:underline mb-3">
        ← All datasets
      </button>

      <h1 className="text-xl font-semibold text-gray-800">{dsState.data.name}</h1>
      {dsState.data.description && <p className="text-gray-500 mb-4">{dsState.data.description}</p>}

      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="font-medium text-gray-700">Test Cases</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          {showForm ? 'Close' : '+ Add Test Case'}
        </button>
      </div>

      {showForm && (
        <CreateTestCaseForm datasetId={datasetId} onCreated={loadCases} />
      )}

      {casesState.error && (
        <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded mb-3">
          Couldn't load test cases: {casesState.error}
        </div>
      )}

      {casesState.loading && <p className="text-gray-500 text-sm">Loading test cases…</p>}

      {!casesState.loading && !casesState.error && casesState.data?.length === 0 && (
        <div className="text-center py-10 border border-dashed border-gray-300 rounded">
          <p className="text-gray-500 mb-3">No test cases yet.</p>
          <button onClick={() => setShowForm(true)} className="text-sm font-medium text-blue-600 hover:underline">
            Add your first test case
          </button>
        </div>
      )}

      {!casesState.loading && casesState.data?.length > 0 && (
        <div className="divide-y divide-gray-200 border border-gray-200 rounded">
          {casesState.data.map((tc) => (
            <div key={tc.id} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-800"><span className="font-medium">Input:</span> {tc.input}</p>
                  {tc.expected_output && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Expected:</span> {tc.expected_output}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteCase(tc.id)}
                  className="text-sm text-red-500 hover:text-red-700 px-2 shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <form onSubmit={handleSubmit} className="mb-4 p-4 border border-gray-200 rounded bg-white">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Input</label>
        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
          rows={2}
          placeholder="What is your refund policy?"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Expected output (optional)</label>
        <textarea
          value={expectedOutput}
          onChange={(e) => setExpectedOutput(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
          rows={2}
          placeholder="We offer a 30-day money-back guarantee..."
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Regex pattern (optional — only needed for the regex_match metric)
        </label>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
          placeholder="^\d+$"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Add Test Case'}
      </button>
    </form>
  )
}
