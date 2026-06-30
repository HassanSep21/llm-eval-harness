import pytest


async def test_create_dataset(client):
    response = await client.post(
        "/datasets", json={"name": "smoke-test", "description": "fixture check"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "smoke-test"
    assert body["id"] is not None
    assert body["created_at"] is not None


async def test_get_dataset(client):
    create = await client.post("/datasets", json={"name": "fetch-me"})
    dataset_id = create.json()["id"]

    response = await client.get(f"/datasets/{dataset_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "fetch-me"


async def test_get_dataset_404(client):
    response = await client.get("/datasets/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


async def test_list_datasets(client):
    await client.post("/datasets", json={"name": "ds-a"})
    await client.post("/datasets", json={"name": "ds-b"})

    response = await client.get("/datasets")
    assert response.status_code == 200
    names = [d["name"] for d in response.json()]
    assert "ds-a" in names and "ds-b" in names


async def test_list_datasets_tag_filter(client):
    await client.post("/datasets", json={"name": "tagged", "tags": ["billing"]})
    await client.post("/datasets", json={"name": "untagged", "tags": ["support"]})

    response = await client.get("/datasets", params={"tag": "billing"})
    results = response.json()
    assert len(results) == 1
    assert results[0]["name"] == "tagged"


async def test_update_dataset_partial(client):
    create = await client.post(
        "/datasets", json={"name": "original", "description": "keep me"}
    )
    dataset_id = create.json()["id"]

    response = await client.patch(f"/datasets/{dataset_id}", json={"name": "renamed"})
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "renamed"
    assert body["description"] == "keep me"  # untouched field survived the partial update


async def test_delete_dataset(client):
    create = await client.post("/datasets", json={"name": "to-delete"})
    dataset_id = create.json()["id"]

    response = await client.delete(f"/datasets/{dataset_id}")
    assert response.status_code == 204

    follow_up = await client.get(f"/datasets/{dataset_id}")
    assert follow_up.status_code == 404


async def test_delete_dataset_cascades_test_cases(client):
    create = await client.post("/datasets", json={"name": "parent"})
    dataset_id = create.json()["id"]
    tc = await client.post(
        f"/datasets/{dataset_id}/test-cases", json={"input": "child case"}
    )
    test_case_id = tc.json()["id"]

    await client.delete(f"/datasets/{dataset_id}")

    # The test case should be gone too — not just orphaned with a dangling FK.
    follow_up = await client.get(f"/datasets/{dataset_id}/test-cases/{test_case_id}")
    assert follow_up.status_code == 404


async def test_create_test_case_metadata_round_trip(client):
    create = await client.post("/datasets", json={"name": "for-cases"})
    dataset_id = create.json()["id"]

    response = await client.post(
        f"/datasets/{dataset_id}/test-cases",
        json={"input": "q", "metadata": {"category": "billing"}},
    )
    assert response.status_code == 201
    assert response.json()["metadata"] == {"category": "billing"}


async def test_create_test_case_wrong_dataset_404(client):
    response = await client.post(
        "/datasets/00000000-0000-0000-0000-000000000000/test-cases",
        json={"input": "orphan"},
    )
    assert response.status_code == 404


async def test_get_test_case_wrong_dataset_404(client):
    ds_a = await client.post("/datasets", json={"name": "a"})
    ds_b = await client.post("/datasets", json={"name": "b"})
    tc = await client.post(
        f"/datasets/{ds_a.json()['id']}/test-cases", json={"input": "belongs to a"}
    )
    test_case_id = tc.json()["id"]

    # Right test case ID, but the WRONG dataset ID in the URL — must 404,
    # not leak data across datasets.
    response = await client.get(
        f"/datasets/{ds_b.json()['id']}/test-cases/{test_case_id}"
    )
    assert response.status_code == 404


async def test_update_test_case_metadata_alias(client):
    """Regression test for the case_metadata/metadata alias bug we hit
    while building update_test_case — model_dump() was producing 'metadata'
    as a key, but the ORM attribute is 'case_metadata', so setattr() was
    silently writing to a field SQLAlchemy didn't track at all."""
    create = await client.post("/datasets", json={"name": "for-update"})
    dataset_id = create.json()["id"]
    tc = await client.post(
        f"/datasets/{dataset_id}/test-cases",
        json={"input": "original", "metadata": {"category": "billing"}},
    )
    test_case_id = tc.json()["id"]

    response = await client.patch(
        f"/datasets/{dataset_id}/test-cases/{test_case_id}",
        json={"metadata": {"category": "refunds"}},
    )
    assert response.status_code == 200
    assert response.json()["metadata"] == {"category": "refunds"}

    # The real proof: re-fetch independently. If setattr had silently
    # written to a phantom 'metadata' attribute instead of the real
    # 'case_metadata' column, this GET would still show the OLD value,
    # since nothing would have actually persisted to the database.
    refetch = await client.get(f"/datasets/{dataset_id}/test-cases/{test_case_id}")
    assert refetch.json()["metadata"] == {"category": "refunds"}


async def test_delete_test_case(client):
    create = await client.post("/datasets", json={"name": "for-deletion"})
    dataset_id = create.json()["id"]
    tc = await client.post(
        f"/datasets/{dataset_id}/test-cases", json={"input": "doomed"}
    )
    test_case_id = tc.json()["id"]

    response = await client.delete(
        f"/datasets/{dataset_id}/test-cases/{test_case_id}"
    )
    assert response.status_code == 204

    follow_up = await client.get(
        f"/datasets/{dataset_id}/test-cases/{test_case_id}"
    )
    assert follow_up.status_code == 404
