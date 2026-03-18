"""
Locust load testing for Statsbudsjettportalen.
Simulates realistic FAG and FIN user behavior patterns.

Usage:
    locust -f locustfile.py --host=http://localhost:5000
    # Then open http://localhost:8089 for the web UI
"""

from locust import HttpUser, task, between, tag
import random
import json

# Email lists matching actual seed data
FAG_EMAILS = [
    f"budsjett.{dept}@test.no"
    for dept in ["aid", "bfd", "dfd", "ed", "fd", "hod", "jd", "kd",
                 "kdd", "kld", "kud", "lmd", "nfd", "sd", "ud"]
]

FIN_EMAILS = [
    "fin.kld@test.no", "fin.ed@test.no", "fin.lmd@test.no",
    "fin.nfd@test.no", "fin.ud@test.no", "fin.kud@test.no",
    "fin.sd1@test.no", "fin.sd2@test.no", "fin.dfd@test.no",
    "fin.jd1@test.no", "fin.jd2@test.no", "fin.fd1@test.no",
    "fin.hod1@test.no", "fin.hod2@test.no", "fin.bfd@test.no",
    "fin.kd1@test.no", "fin.kd2@test.no", "fin.aid1@test.no",
]


class FAGUser(HttpUser):
    """Simulates a department budget analyst (70% of users)."""
    weight = 7
    wait_time = between(3, 12)

    def on_start(self):
        self.case_ids = []
        self.round_id = None

        resp = self.client.post("/api/auth/login", json={
            "email": random.choice(FAG_EMAILS),
        })
        if resp.status_code != 200:
            return

        token = resp.json().get("token", "")
        self.client.headers["Authorization"] = f"Bearer {token}"

        rounds_resp = self.client.get("/api/budget-rounds", name="/api/budget-rounds")
        if rounds_resp.status_code == 200:
            rounds = rounds_resp.json()
            open_rounds = [r for r in rounds if r.get("status") in ("active", "open")]
            if open_rounds:
                self.round_id = open_rounds[0]["id"]

    @task(40)
    @tag("read")
    def view_case_list(self):
        params = {}
        if self.round_id:
            params["budget_round_id"] = self.round_id
        resp = self.client.get("/api/cases/list", params=params, name="/api/cases/list")
        if resp.status_code == 200:
            self.case_ids = [c["id"] for c in resp.json()[:20]]

    @task(25)
    @tag("read")
    def view_case_detail(self):
        if not self.case_ids:
            return
        self.client.get(f"/api/cases/{random.choice(self.case_ids)}", name="/api/cases/[id]")

    @task(15)
    @tag("write")
    def save_case_document(self):
        if not self.case_ids:
            return
        self.client.put(
            f"/api/cases/{random.choice(self.case_ids)}/document",
            json={
                "contentJson": json.dumps({
                    "type": "doc",
                    "content": [{"type": "paragraph", "content": [
                        {"type": "text", "text": f"Lasttestdata {random.randint(1, 9999)}"}
                    ]}]
                }),
                "expectedVersion": 1,
            },
            name="/api/cases/[id]/document [save]",
        )

    @task(10)
    @tag("background")
    def heartbeat(self):
        self.client.get("/api/health", name="/api/health [heartbeat]")


class FINUser(HttpUser):
    """Simulates a FIN budget analyst (30% of users)."""
    weight = 3
    wait_time = between(3, 15)

    def on_start(self):
        self.case_ids = []
        self.round_id = None

        resp = self.client.post("/api/auth/login", json={
            "email": random.choice(FIN_EMAILS),
        })
        if resp.status_code != 200:
            return

        token = resp.json().get("token", "")
        self.client.headers["Authorization"] = f"Bearer {token}"

        rounds_resp = self.client.get("/api/budget-rounds", name="/api/budget-rounds")
        if rounds_resp.status_code == 200:
            rounds = rounds_resp.json()
            open_rounds = [r for r in rounds if r.get("status") in ("active", "open")]
            if open_rounds:
                self.round_id = open_rounds[0]["id"]

    @task(30)
    @tag("read")
    def view_cross_dept_cases(self):
        params = {}
        if self.round_id:
            params["budget_round_id"] = self.round_id
        resp = self.client.get("/api/cases/list", params=params, name="/api/cases/list [FIN]")
        if resp.status_code == 200:
            self.case_ids = [c["id"] for c in resp.json()[:20]]

    @task(20)
    @tag("read")
    def view_case_detail(self):
        if not self.case_ids:
            return
        self.client.get(f"/api/cases/{random.choice(self.case_ids)}", name="/api/cases/[id] [FIN]")

    @task(20)
    @tag("write")
    def save_fin_assessment(self):
        if not self.case_ids:
            return
        self.client.put(
            f"/api/cases/{random.choice(self.case_ids)}/document",
            json={
                "contentJson": json.dumps({
                    "type": "doc",
                    "content": [{"type": "paragraph", "content": [
                        {"type": "text", "text": f"FIN vurdering {random.randint(1, 9999)}"}
                    ]}]
                }),
                "expectedVersion": 1,
            },
            name="/api/cases/[id]/document [FIN save]",
        )

    @task(10)
    @tag("read")
    def view_department_lists(self):
        params = {}
        if self.round_id:
            params["budget_round_id"] = self.round_id
        self.client.get("/api/department-lists", params=params, name="/api/department-lists [view]")

    @task(10)
    @tag("read")
    def view_my_tasks(self):
        self.client.get("/api/cases/my-tasks", name="/api/cases/my-tasks")

    @task(5)
    @tag("background")
    def heartbeat(self):
        self.client.get("/api/health", name="/api/health [heartbeat]")
