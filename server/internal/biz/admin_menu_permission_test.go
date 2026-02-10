package biz

import "testing"

func TestNormalizeAdminMenuPermissions(t *testing.T) {
	input := []string{
		"/sales/export",
		"/invalid",
		"/dashboard",
		"/sales/export",
		" ",
	}

	got := NormalizeAdminMenuPermissions(input)
	want := []string{"/dashboard", "/sales/export"}

	if len(got) != len(want) {
		t.Fatalf("unexpected length: got=%d want=%d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("unexpected item at %d: got=%s want=%s", i, got[i], want[i])
		}
	}
}

func TestEffectiveAdminMenuPermissions(t *testing.T) {
	gotSuper := EffectiveAdminMenuPermissions(AdminLevelSuper, []string{"/dashboard"})
	all := AllAdminMenuPermissions()
	if len(gotSuper) != len(all) {
		t.Fatalf("super admin permissions should be full list, got=%d want=%d", len(gotSuper), len(all))
	}

	gotDefault := EffectiveAdminMenuPermissions(AdminLevelPrimary, nil)
	wantDefault := DefaultAdminMenuPermissions()
	if len(gotDefault) != len(wantDefault) {
		t.Fatalf("default permissions length mismatch, got=%d want=%d", len(gotDefault), len(wantDefault))
	}
}

