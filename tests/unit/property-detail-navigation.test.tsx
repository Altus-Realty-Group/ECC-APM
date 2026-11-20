import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { act, create } from "react-test-renderer";
import { Router, Route, Switch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import PropertyDetailPage from "../../src/pages/PropertyDetailPage";

test("legacy property route preserves ID/query and replaces only its history entry", () => {
  const location = memoryLocation({ path: "/portfolio/properties", record: true });
  let tree: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <Router hook={location.hook}>
        <Switch>
          <Route path="/portfolio/properties/:id" component={PropertyDetailPage} />
          <Route path="/card/property/:id">Canonical property route</Route>
          <Route>Property list</Route>
        </Switch>
      </Router>,
    );
  });
  act(() => location.navigate("/portfolio/properties/007?tab=files&return=%2Freports"));
  assert.deepEqual(location.history, [
    "/portfolio/properties",
    "/card/property/007?tab=files&return=%2Freports",
  ]);
  assert.match(JSON.stringify(tree!.toJSON()), /Canonical property route/);
  act(() => tree!.unmount());
});

test("legacy property bookmarks without query navigate to the canonical record", () => {
  const location = memoryLocation({ path: "/portfolio/properties/42", record: true });
  let tree: ReturnType<typeof create>;
  act(() => { tree = create(<Router hook={location.hook}><PropertyDetailPage /></Router>); });
  assert.deepEqual(location.history, ["/card/property/42"]);
  act(() => tree!.unmount());
});

test("invalid legacy links render a usable return without redirecting or mounting a record reader", () => {
  for (const id of ["abc", "0", "-1", "1.5", "Infinity", "9007199254740992", "%20", "1%2F2"]) {
    const path = `/portfolio/properties/${id}`;
    const location = memoryLocation({ path, record: true });
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<Router hook={location.hook}><PropertyDetailPage /></Router>); });
    assert.deepEqual(location.history, [path], id);
    const html = JSON.stringify(tree!.toJSON());
    assert.match(html, /That property link is not valid/, id);
    assert.equal(tree!.root.findByType("a").props.href, "/portfolio/properties", id);
    assert.doesNotMatch(html, /Asset card will be rebuilt|Property ID:/, id);
    act(() => tree!.unmount());
  }
});
