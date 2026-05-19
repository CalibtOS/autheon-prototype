import json
from collections import Counter

def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)

a = load("prd.json")
b = load("prd_v2_validated.json")

print("=== TOP-LEVEL KEYS ===")
print("prd.json:", sorted(a.keys()))
print("prd_v2:", sorted(b.keys()))
only_a = set(a.keys()) - set(b.keys())
only_b = set(b.keys()) - set(a.keys())
print("Only in prd.json:", sorted(only_a) or "none")
print("Only in prd_v2:", sorted(only_b) or "none")
print()

skip = {"tasks"}
for k in sorted(set(a.keys()) | set(b.keys())):
    if k in skip:
        continue
    if k not in a:
        print(f"META +{k}")
    elif k not in b:
        print(f"META -{k}")
    elif a[k] != b[k]:
        print(f"META ~{k}")

ta, tb = a["tasks"], b["tasks"]
print(f"\nTasks: prd={len(ta)} v2={len(tb)}")

def task_id(t):
    return str(t.get("id", t.get("task_id")))

ids_a = {task_id(t): t for t in ta}
ids_b = {task_id(t): t for t in tb}
print(f"IDs only prd: {sorted(ids_a.keys() - ids_b.keys(), key=int)}")
print(f"IDs only v2: {sorted(ids_b.keys() - ids_a.keys(), key=int)}")

fields_a, fields_b = set(), set()
for t in ta:
    fields_a.update(t.keys())
for t in tb:
    fields_b.update(t.keys())
print("Task fields only prd:", sorted(fields_a - fields_b))
print("Task fields only v2:", sorted(fields_b - fields_a))

changed = []
for tid in sorted(set(ids_a) & set(ids_b), key=int):
    da, db = ids_a[tid], ids_b[tid]
    if da != db:
        diffs = [k for k in sorted(set(da)|set(db)) if da.get(k) != db.get(k)]
        changed.append((tid, diffs))
print(f"\nSame-id tasks with diffs: {len(changed)}")
for tid, diffs in changed[:20]:
    print(f"  {tid}: {diffs}")

# epics
ea = Counter(t.get("epic") for t in ta)
eb = Counter(t.get("epic") for t in tb)
all_epics = sorted(set(ea)|set(eb))
print("\n=== EPIC COUNTS ===")
for e in all_epics:
    ca, cb = ea.get(e,0), eb.get(e,0)
    if ca != cb:
        print(f"  {e}: prd={ca} v2={cb}")
