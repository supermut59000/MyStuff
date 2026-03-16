def test_list_categories_empty(client):
    resp = client.get("/api/categories/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_category(client, sample_category_data):
    resp = client.post("/api/categories/", json=sample_category_data)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == sample_category_data["name"]
    assert data["icon"] == sample_category_data["icon"]
    assert data["item_count"] == 0
    assert "id" in data


def test_create_category_duplicate_name(client, created_category, sample_category_data):
    resp = client.post("/api/categories/", json=sample_category_data)
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]


def test_get_category(client, created_category):
    cat_id = created_category["id"]
    resp = client.get(f"/api/categories/{cat_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == cat_id


def test_get_category_not_found(client):
    resp = client.get("/api/categories/99999")
    assert resp.status_code == 404


def test_update_category(client, created_category):
    cat_id = created_category["id"]
    resp = client.put(f"/api/categories/{cat_id}", json={"icon": "🎯"})
    assert resp.status_code == 200
    assert resp.json()["icon"] == "🎯"
    assert resp.json()["name"] == created_category["name"]


def test_delete_category(client, created_category):
    cat_id = created_category["id"]
    resp = client.delete(f"/api/categories/{cat_id}")
    assert resp.status_code == 204
    resp2 = client.get(f"/api/categories/{cat_id}")
    assert resp2.status_code == 404


def test_delete_category_with_items(client, created_category, created_item):
    cat_id = created_category["id"]
    resp = client.delete(f"/api/categories/{cat_id}")
    assert resp.status_code == 400
    assert "items" in resp.json()["detail"].lower()


def test_create_category_with_select_field(client):
    data = {
        "name": "Select Test",
        "icon": "📦",
        "custom_fields": [
            {
                "key": "size",
                "label": "Size",
                "type": "select",
                "required": False,
                "options": ["S", "M", "L"],
            }
        ],
    }
    resp = client.post("/api/categories/", json=data)
    assert resp.status_code == 201


def test_create_category_select_without_options_fails(client):
    data = {
        "name": "Bad Select",
        "icon": "📦",
        "custom_fields": [
            {"key": "size", "label": "Size", "type": "select", "required": False, "options": None}
        ],
    }
    resp = client.post("/api/categories/", json=data)
    assert resp.status_code == 422
