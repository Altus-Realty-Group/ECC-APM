import React, { useState } from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PropertyReview } from '../../browser/command-center-review/PropertyReview';
import { properties } from '../../browser/command-center-review/model';

function Harness() {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return React.createElement(PropertyReview, {
    property: properties[1], drafts, onDraft: (purpose, value) => setDrafts(previous => ({ ...previous, [purpose]: value })), onReturn: () => {},
  });
}
function click(tree: ReactTestRenderer, label: string) {
  const button = tree.root.findAllByType('button').find(node => node.children.join('') === label);
  assert.ok(button, label);
  act(() => button.props.onClick());
}

test('review draft survives dock mode changes and purpose changes recompute recipient context', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(React.createElement(Harness)); });
  click(tree, 'Message…');
  act(() => tree.root.findByType('textarea').props.onChange({ target: { value: 'Please confirm access.' } }));
  click(tree, 'New service request');
  click(tree, 'Message…');
  assert.equal(tree.root.findByType('textarea').props.value, 'Please confirm access.');
  assert.match(JSON.stringify(tree.toJSON()), /Jamie Access/);
  act(() => tree.root.findByType('select').props.onChange({ target: { value: 'Account review' } }));
  assert.match(JSON.stringify(tree.toJSON()), /Avery Resident/);
  assert.equal(tree.root.findByType('textarea').props.value, '');
  act(() => tree.root.findByType('textarea').props.onChange({ target: { value: 'Please review the account entries.' } }));
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Jamie Access/);
  click(tree, 'Preview message');
  assert.match(JSON.stringify(tree.toJSON()), /No external send is available/);
  act(() => tree.unmount());
});

test('review keeps property tab identities and never infers readiness or directions from occupancy', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(React.createElement(Harness)); });
  for (const label of ['Overview', 'Financials', 'Legal', 'Files']) {
    assert.ok(tree.root.findAllByType('button').some(node => node.children.join('') === label));
  }
  const text = JSON.stringify(tree.toJSON());
  assert.match(text, /Readiness unassessed/);
  const directions = tree.root.findAllByType('button').find(node => node.children.join('') === 'Directions — address required');
  assert.equal(directions?.props.disabled, true);
  click(tree, 'Attach file');
  assert.match(JSON.stringify(tree.toJSON()), /No bytes are uploaded or registered/);
  act(() => tree.unmount());
});
