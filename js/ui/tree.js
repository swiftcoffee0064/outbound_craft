import { t, localName } from '../i18n.js';
import { buildTree } from '../calc.js';
import { esc } from './html.js';

export function initTree(ctx) {
  document.getElementById('tree-container').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-toggle]');
    if (!btn) return;
    const key = btn.dataset.toggle;
    ctx.update((state) => {
      const idx = state.expanded.indexOf(key);
      if (idx === -1) state.expanded.push(key);
      else state.expanded.splice(idx, 1);
    });
  });
}

export function renderTree(ctx) {
  const { state, itemsById } = ctx;
  const container = document.getElementById('tree-container');
  if (!state.selected.length) {
    container.innerHTML = `<p class="empty">${esc(t(state.lang, 'empty_selection'))}</p>`;
    return;
  }
  const expanded = new Set(state.expanded);
  container.innerHTML = state.selected.map((sel) => {
    const tree = buildTree(sel.id, sel.qty, itemsById);
    return `<ul class="tree tree-root">${renderNode(ctx, tree, sel.id, expanded, true)}</ul>`;
  }).join('');
}

function renderNode(ctx, node, path, expanded, isRoot) {
  const { state, itemsById } = ctx;
  const lang = state.lang;
  const item = itemsById.get(node.id);
  const hasChildren = node.children.length > 0;
  const isOpen = isRoot || expanded.has(path);

  let status = '';
  if (item.type === 'raw') {
    const stock = state.inventory[node.id] ?? 0;
    const have = Math.min(stock, node.qty);
    status = `<span class="leaf-count ${stock >= node.qty ? 'have' : 'lack'}">${have}/${node.qty}</span>`;
  } else {
    status = `<span class="node-qty">${node.qty}×</span>`;
  }

  const toggle = hasChildren && !isRoot
    ? `<button type="button" class="toggle" data-toggle="${esc(path)}"
         aria-expanded="${isOpen}" aria-label="${esc(t(lang, isOpen ? 'collapse' : 'expand'))}">${isOpen ? '▾' : '▸'}</button>`
    : '<span class="toggle-spacer"></span>';

  const children = hasChildren && isOpen
    ? `<ul class="tree">${node.children.map((c) => renderNode(ctx, c, `${path}/${c.id}`, expanded, false)).join('')}</ul>`
    : '';

  return `<li class="${isRoot ? 'root-node' : ''} ${item.type}">
    <div class="tree-row">
      ${toggle}
      ${isRoot ? `<span class="node-qty">${node.qty}×</span>` : ''}
      <span class="node-name">${esc(localName(item, lang))}
        ${item.unverified ? `<small class="unverified" title="${esc(t(lang, 'unverified'))}">≈</small>` : ''}
      </span>
      ${isRoot ? '' : status}
    </div>
    ${children}
  </li>`;
}
