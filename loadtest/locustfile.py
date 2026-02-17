"""
Locust load testing for Statsbudsjettportalen.
Simulates realistic FAG and FIN user behavior patterns.

Usage:
    locust -f locustfile.py --host=http://localhost:8080
    # Then open http://localhost:8089 for the web UI
"""

from locust import HttpUser, task, between, tag
import random
import json

DEPARTMENTS = ["kld", "ud", "jd", "hod", "kd", "sd", "nfd", "bfd",
               "aid", "lmd", "kud", "fd", "ofd", "eid", "did"]


class FAGUser(HttpUser):
    """Simulates a department budget analyst (70% of users)."""
    weight = 7
    wait_time = between(3, 12)  # Realistic think time

    def on_start(self):
        dept = random.choice(DEPARTMENTS)
        self.dept = dept
        resp = self.client.post("/api/auth/login", json={
            "email": f"budsjett1@{dept}.dep.no",
            "password": "Test1234!"
        })
        if resp.status_code == 200:
            data = resp.json()
            self.token = data.get("token", "")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            self.round_id = None
            self.case_ids = []
            # Fetch budget rounds to get active round
            rounds_resp = self.client.get("/api/budget-rounds", name="/api/budget-rounds")
            if rounds_resp.status_code == 200:
                rounds = rounds_resp.json()
                active = [r for r in rounds if r.get("status") == "active"]
                if active:
                    self.round_id = active[0]["id"]

    @task(40)
    @tag("read")
    def view_case_list(self):
        """Most common action: view the case overview."""
        params = {}
        if self.round_id:
            params["budget_round_id"] = self.round_id
        resp = self.client.get(
            "/api/cases/list",
            params=params,
            name="/api/cases/list"
        )
        if resp.status_code == 200:
            cases = resp.json()
            self.case_ids = [c["id"] for c in cases[:20]]

    @task(25)
    @tag("read")
    def view_case_detail(self):
        """Open a specific case for viewing."""
        if not self.case_ids:
            return
        case_id = random.choice(self.case_ids)
        self.client.get(f"/api/cases/{case_id}", name="/api/cases/[id]")

    @task(15)
    @tag("write")
    def save_case_document(self):
        """Save case content (simulates autosave)."""
        if not self.case_ids:
            return
        case_id = random.choice(self.case_ids)
        self.client.put(f"/api/cases/{case_id}/document", json={
            "contentJson": json.dumps({
                "type": "doc",
                "content": [{
                    "type": "section",
                    "attrs": {"fieldKey": "proposalText"},
                    "content": [{
                        "type": "sectionTitle",
                        "content": [{"type": "text", "text": "Forslag"}]
                    }, {
                        "type": "sectionContent",
                        "content": [{
                            "type": "paragraph",
                            "content": [{"type": "text", "text": f"Lasttestdata {random.randint(1, 9999)}"}]
                        }]
                    }]
                }]
            }),
            "expectedVersion": 1
        }, name="/api/cases/[id]/document [save]")

    @task(5)
    @tag("read")
    def view_questions(self):
        """Check questions on a case."""
        if not self.case_ids:
            return
        case_id = random.choice(self.case_ids)
        self.client.get(f"/api/cases/{case_id}/questions", name="/api/cases/[id]/questions")

    @task(5)
    @tag("export")
    def export_department_list(self):
        """Request a department list export (async)."""
        self.client.post("/api/export/department-list/word", json={
            "departmentListId": "00000000-0000-0000-0000-000000000000"
        }, name="/api/export/department-list/word")

    @task(10)
    @tag("background")
    def heartbeat(self):
        """Simulate lock heartbeat."""
        self.client.get("/api/health", name="/api/health [heartbeat]")


class FINUser(HttpUser):
    """Simulates a FIN budget analyst (30% of users)."""
    weight = 3
    wait_time = between(3, 15)

    def on_start(self):
        resp = self.client.post("/api/auth/login", json={
            "email": "saksbehandler1@fin.dep.no",
            "password": "Test1234!"
        })
        if resp.status_code == 200:
            data = resp.json()
            self.token = data.get("token", "")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            self.case_ids = []
            self.round_id = None
            rounds_resp = self.client.get("/api/budget-rounds", name="/api/budget-rounds")
            if rounds_resp.status_code == 200:
                rounds = rounds_resp.json()
                active = [r for r in rounds if r.get("status") == "active"]
                if active:
                    self.round_id = active[0]["id"]

    @task(30)
    @tag("read")
    def view_cross_dept_cases(self):
        """FIN views cases across departments."""
        dept = random.choice(DEPARTMENTS)
        params = {"my_departments": "false"}
        if self.round_id:
            params["budget_round_id"] = self.round_id
        resp = self.client.get(
            "/api/cases/list",
            params=params,
            name="/api/cases/list [FIN cross-dept]"
        )
        if resp.status_code == 200:
            cases = resp.json()
            self.case_ids = [c["id"] for c in cases[:20]]

    @task(20)
    @tag("read")
    def view_case_detail(self):
        """FIN opens a specific case."""
        if not self.case_ids:
            return
        case_id = random.choice(self.case_ids)
        self.client.get(f"/api/cases/{case_id}", name="/api/cases/[id] [FIN]")

    @task(20)
    @tag("write")
    def save_fin_assessment(self):
        """FIN saves their assessment."""
        if not self.case_ids:
            return
        case_id = random.choice(self.case_ids)
        self.client.put(f"/api/cases/{case_id}/document", json={
            "contentJson": json.dumps({
                "type": "doc",
                "content": [{
                    "type": "section",
                    "attrs": {"fieldKey": "finAssessment"},
                    "content": [{
                        "type": "sectionTitle",
                        "content": [{"type": "text", "text": "FINs vurdering"}]
                    }, {
                        "type": "sectionContent",
                        "content": [{
                            "type": "paragraph",
                            "content": [{"type": "text", "text": f"FIN vurdering {random.randint(1, 9999)}"}]
                        }]
                    }]
                }]
            }),
            "expectedVersion": 1
        }, name="/api/cases/[id]/document [FIN save]")

    @task(10)
    @tag("read")
    def view_department_lists(self):
        """FIN views department lists."""
        params = {}
        if self.round_id:
            params["budget_round_id"] = self.round_id
        self.client.get(
            "/api/department-lists",
            params=params,
            name="/api/department-lists [view]"
        )

    @task(10)
    @tag("read")
    def view_my_tasks(self):
        """FIN checks their task queue."""
        self.client.get("/api/cases/my-tasks", name="/api/cases/my-tasks")

    @task(5)
    @tag("export")
    def export_department_list(self):
        """FIN requests a department list Word export."""
        self.client.post("/api/export/department-list/word", json={
            "departmentListId": "00000000-0000-0000-0000-000000000000"
        }, name="/api/export/department-list/word")

    @task(5)
    @tag("background")
    def heartbeat(self):
        """Simulate background polling."""
        self.client.get("/api/health", name="/api/health [heartbeat]")
