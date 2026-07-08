const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new Error(detail)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  listDatasets: () => request('/datasets'),
  getDataset: (id) => request(`/datasets/${id}`),
  createDataset: (data) =>
    request('/datasets', { method: 'POST', body: JSON.stringify(data) }),
  deleteDataset: (id) => request(`/datasets/${id}`, { method: 'DELETE' }),

  listTestCases: (datasetId) => request(`/datasets/${datasetId}/test-cases`),
  createTestCase: (datasetId, data) =>
    request(`/datasets/${datasetId}/test-cases`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTestCase: (datasetId, testCaseId) =>
    request(`/datasets/${datasetId}/test-cases/${testCaseId}`, { method: 'DELETE' }),

  listOllamaModels: () => request('/backends/ollama/models'),
  createRun: (data) => request('/runs', { method: 'POST', body: JSON.stringify(data) }),
  getRun: (id) => request(`/runs/${id}`),
  getRunResults: (id) => request(`/runs/${id}/results`),
  listRuns: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/runs${qs ? `?${qs}` : ''}`)
  },
  compareRuns: (runAId, runBId) =>
    request('/regression/compare', {
      method: 'POST',
      body: JSON.stringify({ run_a_id: runAId, run_b_id: runBId }),
    }),
}
