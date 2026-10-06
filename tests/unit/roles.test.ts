import { test } from "node:test";
import assert from "node:assert/strict";
import { can, isAdminRole, navItemsFor } from "../../lib/auth/roles";

test("permission matrix follows FSD §3", () => {
  assert.equal(can("admin", "export:contacts"), true);
  assert.equal(can("assistant", "export:contacts"), false);
  assert.equal(can("assistant", "participants:generate"), true);
  assert.equal(can("assistant", "participants:reset"), false);
  assert.equal(can("viewer", "participants:view"), false);
  assert.equal(can("viewer", "export:dataset"), true);
});

test("viewer menu hides participants, generate and audit (T-9)", () => {
  const hrefs = navItemsFor("viewer").map((i) => i.href);
  assert.deepEqual(hrefs, ["/admin", "/admin/export"]);
});

test("admin sees every menu item", () => {
  assert.equal(navItemsFor("admin").length, 5);
});

test("isAdminRole guards unknown values", () => {
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("superuser"), false);
  assert.equal(isAdminRole(null), false);
});
