package main

import (
	"strings"
	"testing"
	"time"
)

func TestBuildPlanBasic(t *testing.T) {
	baseDate, err := time.ParseInLocation(dateLayout, "2026-02-10", time.Local)
	if err != nil {
		t.Fatalf("parse base date failed: %v", err)
	}

	plan, err := buildPlan("tderp", 2, "admin", baseDate)
	if err != nil {
		t.Fatalf("buildPlan returned error: %v", err)
	}

	if plan.TotalRecords != 24 {
		t.Fatalf("unexpected total records: got=%d want=%d", plan.TotalRecords, 24)
	}

	if len(plan.UpCore) != plan.TotalRecords+4 {
		t.Fatalf("unexpected up core length: got=%d want=%d", len(plan.UpCore), plan.TotalRecords+4)
	}

	if len(plan.DownCore) != 1 {
		t.Fatalf("unexpected down core length: got=%d want=%d", len(plan.DownCore), 1)
	}

	if !strings.Contains(plan.DownCore[0], "DELETE FROM erp_module_records") {
		t.Fatalf("down core should delete from erp_module_records: %s", plan.DownCore[0])
	}

	if len(plan.UpVerify) != 2 || len(plan.DownVerify) != 2 {
		t.Fatalf("unexpected verify statement count: up=%d down=%d", len(plan.UpVerify), len(plan.DownVerify))
	}
}

func TestBuildPlanValidation(t *testing.T) {
	baseDate, _ := time.ParseInLocation(dateLayout, "2026-02-10", time.Local)

	_, err := buildPlan("", 1, "admin", baseDate)
	if err == nil || !strings.Contains(err.Error(), "prefix") {
		t.Fatalf("expected prefix error, got=%v", err)
	}

	_, err = buildPlan("bad-prefix", 1, "admin", baseDate)
	if err == nil || !strings.Contains(err.Error(), "prefix") {
		t.Fatalf("expected prefix format error, got=%v", err)
	}

	_, err = buildPlan("okprefix", 0, "admin", baseDate)
	if err == nil || !strings.Contains(err.Error(), "chain-count") {
		t.Fatalf("expected chain-count error, got=%v", err)
	}

	_, err = buildPlan("okprefix", 1, "", baseDate)
	if err == nil || !strings.Contains(err.Error(), "admin") {
		t.Fatalf("expected admin error, got=%v", err)
	}
}

func TestBuildCodeLikePattern(t *testing.T) {
	pattern := buildCodeLikePattern("td_erp%seed")
	want := `td\_erp\%seed\_%`
	if pattern != want {
		t.Fatalf("unexpected like pattern: got=%q want=%q", pattern, want)
	}
}

func TestBuildChainRecordsModuleDistribution(t *testing.T) {
	baseDate, _ := time.ParseInLocation(dateLayout, "2026-02-10", time.Local)
	records, err := buildChainRecords("tderp", 1, baseDate)
	if err != nil {
		t.Fatalf("buildChainRecords failed: %v", err)
	}

	if len(records) != 12 {
		t.Fatalf("unexpected record count: got=%d want=%d", len(records), 12)
	}

	countByModule := map[string]int{}
	for _, item := range records {
		countByModule[item.ModuleKey]++
		if item.Code == "" {
			t.Fatalf("module %s should have non-empty code", item.ModuleKey)
		}
		if item.Payload["_seed_prefix"] != "tderp" {
			t.Fatalf("module %s missing seed prefix", item.ModuleKey)
		}
	}

	if countByModule["partners"] != 2 {
		t.Fatalf("partners count mismatch: got=%d want=%d", countByModule["partners"], 2)
	}

	for _, moduleKey := range erpModuleKeys {
		if moduleKey == "partners" {
			continue
		}
		if countByModule[moduleKey] != 1 {
			t.Fatalf("module %s count mismatch: got=%d want=%d", moduleKey, countByModule[moduleKey], 1)
		}
	}
}
