"""
Generate realistic test data for load testing.
Creates 500 cases across 15 departments with 10-30 content versions each.

Usage:
    python generate_testdata.py --host http://localhost:8080
"""

import argparse
import json
import random
import requests
import string
import sys
import time

DEPARTMENTS = ["kld", "ud", "jd", "hod", "kd", "sd", "nfd", "bfd",
               "aid", "lmd", "kud", "fd", "ofd", "eid", "did"]

CASE_TYPES = ["budsjettforslag", "tilleggsbevilgning", "omfordeling", "oppfolging"]

SAMPLE_TEXT = """
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
"""


def generate_content_json(size_kb=5):
    """Generate realistic TipTap document JSON of approximately the given size."""
    paragraphs = []
    while len(json.dumps(paragraphs)) < size_kb * 1024:
        text = ' '.join(random.choices(SAMPLE_TEXT.split(), k=random.randint(20, 50)))
        paragraphs.append({
            "type": "paragraph",
            "content": [{"type": "text", "text": text}]
        })

    return json.dumps({
        "type": "doc",
        "content": [{
            "type": "section",
            "attrs": {"fieldKey": "proposalText"},
            "content": [
                {"type": "sectionTitle", "content": [{"type": "text", "text": "Forslag"}]},
                {"type": "sectionContent", "content": paragraphs}
            ]
        }]
    })


def main():
    parser = argparse.ArgumentParser(description="Generate load test data")
    parser.add_argument("--host", default="http://localhost:8080", help="API base URL")
    parser.add_argument("--cases", type=int, default=500, help="Number of cases to create")
    parser.add_argument("--versions-min", type=int, default=10, help="Min versions per case")
    parser.add_argument("--versions-max", type=int, default=30, help="Max versions per case")
    args = parser.parse_args()

    base = args.host.rstrip("/")
    session = requests.Session()

    print(f"Connecting to {base}...")

    # Login as admin
    resp = session.post(f"{base}/api/auth/login", json={
        "email": "admin@fin.dep.no",
        "password": "Test1234!"
    })
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)

    token = resp.json().get("token", "")
    session.headers["Authorization"] = f"Bearer {token}"

    # Get budget rounds
    rounds = session.get(f"{base}/api/budget-rounds").json()
    active_round = next((r for r in rounds if r.get("status") == "active"), rounds[0] if rounds else None)
    if not active_round:
        print("No budget round found!")
        sys.exit(1)

    round_id = active_round["id"]
    print(f"Using budget round: {active_round.get('name', round_id)}")

    # Get departments
    depts = session.get(f"{base}/api/departments").json()
    dept_map = {d["code"]: d["id"] for d in depts}

    total_versions = 0
    start = time.time()

    for i in range(args.cases):
        dept_code = DEPARTMENTS[i % len(DEPARTMENTS)]
        dept_id = dept_map.get(dept_code)
        if not dept_id:
            continue

        case_type = random.choice(CASE_TYPES)
        case_name = f"Lasttestsak {i+1} - {dept_code.upper()} {''.join(random.choices(string.ascii_uppercase, k=3))}"

        # Create case
        resp = session.post(f"{base}/api/cases", json={
            "budgetRoundId": round_id,
            "caseName": case_name,
            "caseType": case_type,
            "chapter": str(random.randint(100, 999)),
            "post": str(random.randint(1, 90)),
            "amount": random.randint(1000, 500000),
            "proposalText": f"Forslag for {case_name}",
        })

        if resp.status_code not in (200, 201):
            print(f"  Case {i+1} creation failed: {resp.status_code}")
            continue

        case = resp.json()
        case_id = case["id"]

        # Create additional content versions
        num_versions = random.randint(args.versions_min, args.versions_max)
        for v in range(num_versions):
            size = random.randint(3, 20)
            content = generate_content_json(size)
            session.put(f"{base}/api/cases/{case_id}/document", json={
                "contentJson": content,
                "expectedVersion": v + 1,
            })
            total_versions += 1

        if (i + 1) % 50 == 0:
            elapsed = time.time() - start
            rate = (i + 1) / elapsed
            print(f"  Created {i+1}/{args.cases} cases ({total_versions} versions) - {rate:.1f} cases/s")

    elapsed = time.time() - start
    print(f"\nDone! Created {args.cases} cases with {total_versions} content versions in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
