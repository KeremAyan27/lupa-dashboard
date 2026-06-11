#!/usr/bin/env python3
"""Export the 7 JSON data files from the thesis reference workbook.

Source of truth: scripts/CEO_Dashboard_Tam_VeriSeti.xlsx — the workbook
produced by generate_mock_data.py (random.seed(42)). This script performs a
pure format conversion (no values are added, removed, or altered) so that the
Excel reference views and the JSON files consumed by the application stay
traceable to a single source, as documented in the project data dictionary.

Mapping (sheet -> file), per the data dictionary:
  orders + order_items -> data/orders.json        (items[] nested per order)
  products             -> data/products.json
  customers            -> data/customers.json
  payments             -> data/payments.json
  stockMovements       -> data/stockMovements.json
  alerts               -> data/alerts.json
  ai_personas / ai_friction / ai_actions / ai_history -> data/aiSimulations.json

Conversions applied (format only):
  - Excel boolean strings "EVET"/"HAYIR" -> true/false
    (alerts.isRead, products.isStockCritical)
  - datetime/date cells -> ISO 8601 strings (YYYY-MM-DDTHH:MM:SS)
  - semicolon/pipe-delimited list cells in ai_friction -> string arrays

Usage: python3 xlsx_to_json.py  (run from the scripts/ directory)
"""

import json
import os
from datetime import date, datetime

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
WORKBOOK = os.path.join(HERE, "CEO_Dashboard_Tam_VeriSeti.xlsx")
OUT_DIR = os.path.join(HERE, "..", "data")


def iso(value):
    """Normalize any date-ish cell to an ISO 8601 string, pass others through."""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    return value


def rows_as_dicts(ws):
    rows = ws.iter_rows(values_only=True)
    header = [str(h) for h in next(rows)]
    out = []
    for row in rows:
        if all(cell is None for cell in row):
            continue
        out.append({key: iso(cell) for key, cell in zip(header, row)})
    return out


def write_json(name, payload):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    count = len(payload) if isinstance(payload, list) else "object"
    print(f"  data/{name}: {count} records, {os.path.getsize(path):,} bytes")


def tr_bool(value):
    if isinstance(value, str):
        return value.strip().upper() == "EVET"
    return bool(value)


def split_list(value, sep):
    if not value:
        return []
    return [part.strip() for part in str(value).split(sep) if part.strip()]


def main():
    wb = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    # orders.json — nest order_items under each order, drop the helper itemCount
    items_by_order = {}
    for item in rows_as_dicts(wb["order_items"]):
        order_id = item.pop("orderId")
        items_by_order.setdefault(order_id, []).append(item)
    orders = []
    for order in rows_as_dicts(wb["orders"]):
        expected = order.pop("itemCount")
        order["items"] = items_by_order.get(order["orderId"], [])
        assert len(order["items"]) == expected, order["orderId"]
        orders.append(order)
    write_json("orders.json", orders)

    products = rows_as_dicts(wb["products"])
    for product in products:
        product["isStockCritical"] = tr_bool(product["isStockCritical"])
    write_json("products.json", products)
    write_json("customers.json", rows_as_dicts(wb["customers"]))
    write_json("payments.json", rows_as_dicts(wb["payments"]))
    write_json("stockMovements.json", rows_as_dicts(wb["stockMovements"]))

    alerts = rows_as_dicts(wb["alerts"])
    for alert in alerts:
        alert["isRead"] = tr_bool(alert["isRead"])
    write_json("alerts.json", alerts)

    # aiSimulations.json — single object combining the four ai_* sheets
    personas = rows_as_dicts(wb["ai_personas"])
    friction = rows_as_dicts(wb["ai_friction"])
    for point in friction:
        point["affectedPersonas"] = split_list(point["affectedPersonas"], ";")
        point["rootCauses"] = split_list(point["rootCauses"], "|")
    write_json(
        "aiSimulations.json",
        {
            "personas": personas,
            "frictionPoints": friction,
            "recommendedActions": rows_as_dicts(wb["ai_actions"]),
            "historicalRuns": rows_as_dicts(wb["ai_history"]),
        },
    )


if __name__ == "__main__":
    main()
