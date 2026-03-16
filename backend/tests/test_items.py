def test_list_items_empty(client):
    resp = client.get("/api/items/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_create_item(client, sample_item_data):
    resp = client.post("/api/items/", json=sample_item_data)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == sample_item_data["name"]
    assert data["condition"] == "good"
    assert data["is_owned"] is True


def test_get_item(client, created_item):
    item_id = created_item["id"]
    resp = client.get(f"/api/items/{item_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == item_id


def test_get_item_not_found(client):
    resp = client.get("/api/items/99999")
    assert resp.status_code == 404


def test_update_item(client, created_item):
    item_id = created_item["id"]
    resp = client.put(f"/api/items/{item_id}", json={"condition": "mint"})
    assert resp.status_code == 200
    assert resp.json()["condition"] == "mint"


def test_delete_item(client, created_item):
    item_id = created_item["id"]
    resp = client.delete(f"/api/items/{item_id}")
    assert resp.status_code == 204
    resp2 = client.get(f"/api/items/{item_id}")
    assert resp2.status_code == 404


def test_list_items_filter_by_category(client, created_category, created_item):
    resp = client.get(f"/api/items/?category_id={created_category['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["category_id"] == created_category["id"]


def test_list_items_filter_is_owned(client, created_item):
    resp = client.get("/api/items/?is_owned=true")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    resp2 = client.get("/api/items/?is_owned=false")
    assert resp2.status_code == 200


def test_list_items_search(client, created_item):
    resp = client.get(f"/api/items/?search={created_item['name'][:4]}")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


def test_create_item_missing_required_field(client, created_category):
    # Create a category with a required field
    cat_data = {
        "name": "Manga Test",
        "icon": "📚",
        "custom_fields": [
            {"key": "serie", "label": "Série", "type": "text", "required": True, "options": None}
        ],
    }
    cat = client.post("/api/categories/", json=cat_data).json()

    item_data = {
        "category_id": cat["id"],
        "name": "Test Manga",
        "custom_data": {},  # missing required 'serie'
    }
    resp = client.post("/api/items/", json=item_data)
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert "errors" in detail


def test_create_item_wrong_type(client, created_category):
    # sample_category has a 'brand' text field
    item_data = {
        "category_id": created_category["id"],
        "name": "Bad Item",
        "custom_data": {"brand": 123},  # should be string
    }
    resp = client.post("/api/items/", json=item_data)
    assert resp.status_code == 422


def test_create_item_unknown_keys_stripped(client, sample_item_data):
    data = {**sample_item_data, "custom_data": {"brand": "ACME", "unknown_key": "ignored"}}
    resp = client.post("/api/items/", json=data)
    assert resp.status_code == 201
    assert "unknown_key" not in resp.json()["custom_data"]


def test_pagination(client, created_category):
    for i in range(5):
        client.post("/api/items/", json={
            "category_id": created_category["id"],
            "name": f"Item {i}",
            "custom_data": {},
        })
    resp = client.get("/api/items/?per_page=2&page=1")
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["per_page"] == 2


def test_dashboard_stats(client, created_item):
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_items" in data
    assert "by_category" in data
    assert data["total_items"] >= 1
