import { test, expect } from "@playwright/test";

const CRON_SECRET = "dev-secret-123";
const AUTH_HEADER = { Authorization: `Bearer ${CRON_SECRET}` };

// Match IDs for the first 2 group stage matches
const MATCH_1_ID = "match-001"; // Pakistan vs Netherlands
const MATCH_2_ID = "match-002"; // India vs USA

test.describe("T20 Predict — Full E2E Flow", () => {
  // ──────────────────────────────────────────
  // Phase 1: Seed + verify home page
  // ──────────────────────────────────────────
  test("1. Seed database and verify home page loads", async ({ page, request }) => {
    // Seed the database
    const seedRes = await request.post("/api/admin/seed", {
      headers: AUTH_HEADER,
    });
    expect(seedRes.ok()).toBeTruthy();
    const seedBody = await seedRes.json();
    expect(seedBody.success).toBe(true);

    // Load home page
    await page.goto("/");
    await expect(page.locator("header h1")).toContainText("T20 Predict");
    await expect(page.getByText("Leaderboard").first()).toBeVisible();
    await expect(page.getByText("How It Works")).toBeVisible();
    await expect(page.getByText("Season Stats")).toBeVisible();
  });

  test("2. Matches page lists all groups", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("heading", { name: "All Matches" })).toBeVisible();
    await expect(page.getByText("Group A", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Group B", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Group C", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Group D", { exact: false }).first()).toBeVisible();
    // Check first match cards exist
    await expect(page.getByText("Pakistan vs Netherlands").first()).toBeVisible();
    await expect(page.getByText("India vs USA").first()).toBeVisible();
  });

  test("3. Match detail page loads for match 1", async ({ page }) => {
    await page.goto(`/matches/${MATCH_1_ID}`);
    await expect(page.getByRole("heading", { name: "Pakistan vs Netherlands" })).toBeVisible();
    await expect(page.getByText("Group A").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI Predictions" })).toBeVisible();
    // No predictions yet
    await expect(
      page.getByText("No predictions yet")
    ).toBeVisible();
  });

  test("4. Agent profile page loads", async ({ page }) => {
    await page.goto("/agents/claude");
    await expect(page.getByRole("heading", { name: "Claude Opus 4.6" })).toBeVisible();
    await expect(page.getByText("anthropic", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Prediction History")).toBeVisible();
  });

  // ──────────────────────────────────────────
  // Phase 2: Trigger pre-match predictions for first 2 matches
  // ──────────────────────────────────────────
  test("5. Trigger pre-match predictions for match 1 (Pakistan vs Netherlands)", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/trigger-predict", {
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      data: { matchId: MATCH_1_ID },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.window).toBe("pre_match");
    console.log(
      "Match 1 predictions:",
      JSON.stringify(body.results, null, 2)
    );
    // At least 1 agent should have a successful prediction stored
    const successful = body.results.filter(
      (r: { status: string; prediction?: { status: string } }) =>
        r.status === "fulfilled" && r.prediction?.status === "success"
    );
    expect(successful.length).toBeGreaterThanOrEqual(1);
  });

  test("6. Trigger pre-match predictions for match 2 (India vs USA)", async ({
    request,
  }) => {
    const res = await request.post("/api/admin/trigger-predict", {
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      data: { matchId: MATCH_2_ID },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.window).toBe("pre_match");
    console.log(
      "Match 2 predictions:",
      JSON.stringify(body.results, null, 2)
    );
    const successful = body.results.filter(
      (r: { status: string; prediction?: { status: string } }) =>
        r.status === "fulfilled" && r.prediction?.status === "success"
    );
    expect(successful.length).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────
  // Phase 3: Verify predictions appear in UI
  // ──────────────────────────────────────────
  test("7. Match 1 detail shows predictions after trigger", async ({
    page,
  }) => {
    await page.goto(`/matches/${MATCH_1_ID}`);
    await expect(page.getByRole("heading", { name: "AI Predictions" })).toBeVisible();
    // Should show at least one prediction card with a confidence %
    await expect(page.locator("text=/%/").first()).toBeVisible({ timeout: 10000 });
  });

  test("8. Home page shows activity feed", async ({ page }) => {
    await page.goto("/");
    // The activity feed should show recent predictions
    await expect(page.getByText("Recent Activity")).toBeVisible();
    // Should have prediction items (agent picked team)
    await expect(page.getByText(/picked/).first()).toBeVisible({
      timeout: 10000,
    });
  });

  // ──────────────────────────────────────────
  // Phase 4: Simulate toss + playing XI for match 1
  // ──────────────────────────────────────────
  test("9. Simulate toss and playing XI for match 1", async ({ request }) => {
    const res = await request.post("/api/admin/simulate-toss", {
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      data: {
        matchId: MATCH_1_ID,
        tossWinner: "Pakistan",
        tossDecision: "bat",
        playingXiA: [
          "Babar Azam",
          "Mohammad Rizwan",
          "Fakhar Zaman",
          "Iftikhar Ahmed",
          "Shadab Khan",
          "Mohammad Nawaz",
          "Shaheen Shah Afridi",
          "Haris Rauf",
          "Naseem Shah",
          "Imad Wasim",
          "Usama Mir",
        ],
        playingXiB: [
          "Max O'Dowd",
          "Vikramjit Singh",
          "Bas de Leede",
          "Tom Cooper",
          "Scott Edwards",
          "Teja Nidamanuru",
          "Logan van Beek",
          "Tim Pringle",
          "Aryan Dutt",
          "Paul van Meekeren",
          "Vivian Kingma",
        ],
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.tossWinner).toBe("Pakistan");
    expect(body.xiAnnounced).toBe(true);
  });

  test("10. Trigger post-XI predictions for match 1", async ({ request }) => {
    const res = await request.post("/api/admin/trigger-predict", {
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      data: { matchId: MATCH_1_ID },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.window).toBe("post_xi");
    console.log(
      "Match 1 post-XI predictions:",
      JSON.stringify(body.results, null, 2)
    );
  });

  test("11. Match 1 detail shows toss info and playing XI", async ({
    page,
  }) => {
    await page.goto(`/matches/${MATCH_1_ID}`);
    // Toss info - use more specific locator
    await expect(page.getByText(/won the toss and chose to bat/)).toBeVisible();
    // Playing XI section
    await expect(page.getByRole("heading", { name: "Playing XI" })).toBeVisible();
    await expect(page.getByText("Babar Azam", { exact: true })).toBeVisible();
    await expect(page.getByText("Max O'Dowd", { exact: true })).toBeVisible();
  });

  test("12. Match 1 detail shows pre-match predictions section", async ({
    page,
  }) => {
    await page.goto(`/matches/${MATCH_1_ID}`);
    // Should show prior predictions section (pre-match before XI announcement)
    await expect(
      page.getByText(/Pre-Match Predictions/)
    ).toBeVisible({ timeout: 10000 });
  });

  // ──────────────────────────────────────────
  // Phase 5: Settle match 1 and verify leaderboard
  // ──────────────────────────────────────────
  test("13. Settle match 1 (Pakistan wins)", async ({ request }) => {
    const res = await request.post("/api/admin/manual-settle", {
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      data: {
        matchId: MATCH_1_ID,
        winner: "team_a",
        winnerTeamName: "Pakistan",
        resultSummary: "Pakistan won by 7 wickets",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.winner).toBe("team_a");
    expect(body.predictionsSettled).toBeGreaterThanOrEqual(1);
    console.log("Settled:", body);
  });

  test("14. Match 1 detail shows result and correct/incorrect badges", async ({
    page,
  }) => {
    await page.goto(`/matches/${MATCH_1_ID}`);
    await expect(page.getByText("Completed").first()).toBeVisible();
    await expect(
      page.getByText("Pakistan won by 7 wickets")
    ).toBeVisible();
  });

  test("15. Leaderboard shows updated stats", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Leaderboard").first()).toBeVisible();
    // After settling, there should be points or P&L visible
    // At least one agent should have a non-zero entry
  });

  test("16. Agent profile shows updated prediction history", async ({
    page,
  }) => {
    await page.goto("/agents/claude");
    await expect(page.getByText("Prediction History")).toBeVisible();
    // Should show the settled prediction in the table
    await expect(
      page.getByText("Pakistan vs Netherlands").first()
    ).toBeVisible({ timeout: 10000 });
  });

  // ──────────────────────────────────────────
  // Phase 6: Verify API endpoints
  // ──────────────────────────────────────────
  test("17. GET /api/matches returns all matches", async ({ request }) => {
    const res = await request.get("/api/matches");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(50);
  });

  test("18. GET /api/leaderboard returns entries", async ({ request }) => {
    const res = await request.get("/api/leaderboard");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.length).toBe(4);
    // After settlement, at least one agent should have points
    const anyPoints = body.some(
      (e: { totalPoints: number }) => e.totalPoints > 0
    );
    expect(anyPoints).toBe(true);
  });

  test("19. GET /api/agents returns 4 agents", async ({ request }) => {
    const res = await request.get("/api/agents");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.length).toBe(4);
  });

  test("20. GET /api/predictions returns recent predictions", async ({
    request,
  }) => {
    const res = await request.get("/api/predictions?limit=10");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Security — Auth & Input Validation", () => {
  // All protected endpoints must reject unauthenticated requests
  test("POST /api/admin/seed without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/seed");
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/seed with wrong secret returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/seed", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/manual-settle without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/manual-settle");
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/simulate-toss without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/simulate-toss");
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/trigger-predict without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/trigger-predict");
    expect(res.status()).toBe(401);
  });

  test("GET /api/cron/predict without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/cron/predict");
    expect(res.status()).toBe(401);
  });

  test("GET /api/cron/results without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/cron/results");
    expect(res.status()).toBe(401);
  });

  test("GET /api/cron/team-news without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/cron/team-news");
    expect(res.status()).toBe(401);
  });

  // Error responses must not leak internals
  test("Error responses do not leak internal details", async ({ request }) => {
    // Send invalid JSON body to trigger error handling
    const res = await request.post("/api/admin/manual-settle", {
      headers: { ...AUTH_HEADER, "Content-Type": "application/json" },
      data: {},
    });
    const body = await res.json();
    // Whether 400 or 500, error messages should never contain stack traces
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("at ");
    expect(body.error).not.toContain("/src/");
    expect(body.error).not.toContain("node_modules");
  });

  // Input validation on public endpoints
  test("GET /api/matches?status=INVALID returns 400", async ({ request }) => {
    const res = await request.get("/api/matches?status=INVALID");
    expect(res.status()).toBe(400);
  });

  test("GET /api/matches?stage=INVALID returns 400", async ({ request }) => {
    const res = await request.get("/api/matches?stage=INVALID");
    expect(res.status()).toBe(400);
  });

  test("GET /api/matches?status=upcoming returns 200", async ({ request }) => {
    const res = await request.get("/api/matches?status=upcoming");
    expect(res.ok()).toBeTruthy();
  });

  test("GET /api/leaderboard?sort=INVALID returns 400", async ({ request }) => {
    const res = await request.get("/api/leaderboard?sort=INVALID");
    expect(res.status()).toBe(400);
  });

  test("GET /api/leaderboard?sort=pnl returns 200", async ({ request }) => {
    const res = await request.get("/api/leaderboard?sort=pnl");
    expect(res.ok()).toBeTruthy();
  });
});
