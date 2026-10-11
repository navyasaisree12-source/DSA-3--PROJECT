"use strict";

(() => {
  const form = document.getElementById("tree-form");
  const nodeInput = document.getElementById("node-count");
  const edgesInput = document.getElementById("edge-list");
  const message = document.getElementById("form-message");
  const emptyState = document.getElementById("empty-state");
  const svg = document.getElementById("tree-svg");
  const caption = document.getElementById("tree-caption");
  const results = document.getElementById("diameter-results");
  const outputIds = ["analysis", "kmp", "diameter", "flow", "cover", "sort"];
  let currentTree = null;
  let currentDiameter = null;

  const clearModuleOutputs = () => {
    outputIds.forEach((name) => { document.getElementById(`output-${name}`).textContent = ""; });
  };

  function resetComputedState({ showEmpty = false } = {}) {
    currentTree = null;
    currentDiameter = null;
    results.hidden = true;
    svg.hidden = true;
    svg.innerHTML = "";
    if (showEmpty) emptyState.hidden = false;
    caption.textContent = "Create a valid tree to inspect its structure.";
    clearModuleOutputs();
  }

  function showError(text) {
    message.textContent = text;
    message.classList.remove("success");
  }

  function showSuccess(text) {
    message.textContent = text;
    message.classList.add("success");
  }

  // Parse and validate the complete tree before changing the active workspace.
  function readTree() {
    const rawCount = nodeInput.value.trim();
    if (!/^[1-9]\d*$/.test(rawCount)) return { error: "Node count must be a positive integer." };
    const n = Number(rawCount);
    if (!Number.isSafeInteger(n) || n > 10000) return { error: "Use a node count from 1 to 10,000 for a responsive visualization." };

    const lines = edgesInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length !== n - 1) {
      return { error: `A tree with ${n} nodes needs exactly ${n - 1} edge${n === 2 ? "" : "s"}; found ${lines.length}.` };
    }
    const adjacency = Array.from({ length: n + 1 }, () => []);
    const edges = [];
    const seen = new Set();
    for (let index = 0; index < lines.length; index += 1) {
      const parts = lines[index].split(/[\s,]+/);
      if (parts.length !== 2 || !parts.every((part) => /^\d+$/.test(part))) {
        return { error: `Edge on line ${index + 1} must contain exactly two integer node IDs.` };
      }
      const a = Number(parts[0]);
      const b = Number(parts[1]);
      if (a < 1 || a > n || b < 1 || b > n) return { error: `Line ${index + 1}: node IDs must be between 1 and ${n}.` };
      if (a === b) return { error: `Line ${index + 1}: self-loops are not allowed (node ${a}).` };
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      if (seen.has(key)) return { error: `Line ${index + 1}: edge ${a}–${b} is duplicated.` };
      seen.add(key);
      adjacency[a].push(b);
      adjacency[b].push(a);
      edges.push([a, b]);
    }

    const visited = new Uint8Array(n + 1);
    const queue = [1];
    visited[1] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      for (const neighbor of adjacency[queue[head]]) {
        if (!visited[neighbor]) {
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }
    if (queue.length !== n) {
      const missing = [];
      for (let id = 1; id <= n; id += 1) if (!visited[id]) missing.push(id);
      return { error: `The graph is disconnected. Unreachable node${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.` };
    }
    return { tree: { n, adjacency, edges } };
  }

  // Iterative DFS roots the tree at 1; pushing neighbors in reverse preserves
  // the input adjacency order in the resulting preorder.
  function rootTree(tree) {
    const { n, adjacency } = tree;
    const parent = new Int32Array(n + 1);
    const depth = new Int32Array(n + 1);
    const preorder = [];
    const stack = [1];
    parent[1] = -1;
    while (stack.length) {
      const node = stack.pop();
      preorder.push(node);
      const neighbors = adjacency[node];
      for (let i = neighbors.length - 1; i >= 0; i -= 1) {
        const next = neighbors[i];
        if (next === parent[node]) continue;
        parent[next] = node;
        depth[next] = depth[node] + 1;
        stack.push(next);
      }
    }
    return { parent, depth, preorder };
  }

  // Bottom-up tree DP: each vertex keeps its two greatest child heights.
  // Strict comparisons preserve the first encountered branch on equal heights.
  function computeDiameter(tree) {
    const rooted = rootTree(tree);
    const { n } = tree;
    const height = new Int32Array(n + 1);
    const endpoint = new Int32Array(n + 1);
    for (let id = 1; id <= n; id += 1) endpoint[id] = id;
    let bestLength = 0;
    let bestA = 1;
    let bestB = 1;

    for (let index = rooted.preorder.length - 1; index >= 0; index -= 1) {
      const node = rooted.preorder[index];
      let firstHeight = 0;
      let secondHeight = 0;
      let firstEnd = node;
      let secondEnd = node;
      for (const child of tree.adjacency[node]) {
        if (rooted.parent[child] !== node) continue;
        const candidate = height[child] + 1;
        if (candidate > firstHeight) {
          secondHeight = firstHeight;
          secondEnd = firstEnd;
          firstHeight = candidate;
          firstEnd = endpoint[child];
        } else if (candidate > secondHeight) {
          secondHeight = candidate;
          secondEnd = endpoint[child];
        }
      }
      height[node] = firstHeight;
      endpoint[node] = firstEnd;
      const candidateDiameter = firstHeight + secondHeight;
      if (candidateDiameter > bestLength) {
        bestLength = candidateDiameter;
        bestA = firstEnd;
        bestB = secondHeight > 0 ? secondEnd : node;
      }
    }

    const ancestors = new Map();
    let cursor = bestA;
    let steps = 0;
    while (cursor > 0 && steps <= n) {
      ancestors.set(cursor, steps++);
      cursor = rooted.parent[cursor];
    }
    const right = [];
    cursor = bestB;
    while (!ancestors.has(cursor)) {
      right.push(cursor);
      cursor = rooted.parent[cursor];
    }
    const lca = cursor;
    const left = [];
    cursor = bestA;
    while (cursor !== lca) {
      left.push(cursor);
      cursor = rooted.parent[cursor];
    }
    left.push(lca);
    right.reverse();
    const path = left.concat(right);
    return { length: bestLength, path, rooted };
  }

  // Lay out the rooted tree with leaves spread evenly and parents centered.
  function renderTree(tree, diameterPath = []) {
    emptyState.hidden = true;
    svg.hidden = false;
    const rooted = rootTree(tree);
    const pathSet = new Set(diameterPath);
    const pathEdges = new Set();
    for (let i = 1; i < diameterPath.length; i += 1) {
      const a = diameterPath[i - 1];
      const b = diameterPath[i];
      pathEdges.add(`${Math.min(a, b)}:${Math.max(a, b)}`);
    }
    const x = new Float64Array(tree.n + 1);
    const y = new Float64Array(tree.n + 1);
    let leafIndex = 0;
    const maxDepth = Math.max(...Array.from(rooted.depth).slice(1));
    for (let i = rooted.preorder.length - 1; i >= 0; i -= 1) {
      const node = rooted.preorder[i];
      const children = tree.adjacency[node].filter((neighbor) => rooted.parent[neighbor] === node);
      if (!children.length) x[node] = leafIndex++;
      else x[node] = children.reduce((sum, child) => sum + x[child], 0) / children.length;
      y[node] = rooted.depth[node];
    }
    const stepX = Math.min(82, Math.max(56, 850 / Math.max(1, leafIndex - 1)));
    const padX = 48;
    const width = Math.max(150, padX * 2 + (leafIndex - 1) * stepX);
    const stepY = 82;
    const padY = 48;
    const height = Math.max(105, padY * 2 + maxDepth * stepY);
    const sx = (node) => padX + x[node] * stepX;
    const sy = (node) => padY + y[node] * stepY;
    const edgeMarkup = [];
    for (const [a, b] of tree.edges) {
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      edgeMarkup.push(`<line class="tree-edge${pathEdges.has(key) ? " diameter" : ""}" x1="${sx(a)}" y1="${sy(a)}" x2="${sx(b)}" y2="${sy(b)}"/>`);
    }
    const nodeMarkup = [];
    for (let id = 1; id <= tree.n; id += 1) {
      const highlight = pathSet.has(id) ? " diameter" : "";
      nodeMarkup.push(`<g><circle class="tree-node${highlight}" cx="${sx(id)}" cy="${sy(id)}" r="17"/><text class="node-label${highlight}" x="${sx(id)}" y="${sy(id)}">${id}</text></g>`);
    }
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("aria-label", diameterPath.length ? `Tree with ${tree.n} nodes; diameter path ${diameterPath.join(", ")}` : `Tree with ${tree.n} nodes`);
    svg.innerHTML = `<title>Tree structure${diameterPath.length ? ` and diameter path ${diameterPath.join(" to ")}` : ""}</title>${edgeMarkup.join("")}${nodeMarkup.join("")}`;
  }

  function commitTree(tree) {
    currentTree = tree;
    currentDiameter = null;
    clearModuleOutputs();
    results.hidden = true;
    renderTree(tree);
    caption.textContent = `${tree.n} nodes · ${tree.edges.length} edges · rooted at node 1`;
    showSuccess(`Valid tree created: ${tree.n} nodes and ${tree.edges.length} edges. Ready to compute.`);
  }

  function calculateAndDisplay() {
    if (!currentTree) {
      const parsed = readTree();
      if (parsed.error) {
        showError(parsed.error);
        return null;
      }
      commitTree(parsed.tree);
    }
    currentDiameter = computeDiameter(currentTree);
    renderTree(currentTree, currentDiameter.path);
    document.getElementById("diameter-number").textContent = String(currentDiameter.length);
    document.getElementById("diameter-path").textContent = `[${currentDiameter.path.join(", ")}]`;
    document.getElementById("result-nodes").textContent = String(currentTree.n);
    document.getElementById("result-edges").textContent = String(currentTree.edges.length);
    results.hidden = false;
    caption.textContent = `Diameter highlighted · ${currentDiameter.path.length} vertices on the longest path`;
    showSuccess(`Diameter computed: ${currentDiameter.length} edges.`);
    return currentDiameter;
  }

  function requireTree(output) {
    if (!currentTree) {
      output.textContent = "Create a valid tree first. Module results are always based on the current tree.";
      return false;
    }
    return true;
  }

  function runKmp() {
    const output = document.getElementById("output-kmp");
    if (!requireTree(output)) return;
    const rawPattern = document.getElementById("kmp-pattern").value.trim();
    const pattern = rawPattern ? rawPattern.split(/\s+/).map(Number) : [];
    if (!pattern.length || pattern.some((value) => !Number.isSafeInteger(value))) {
      output.textContent = "Enter a non-empty pattern of whole numbers separated by spaces.";
      return;
    }
    const sequence = rootTree(currentTree).preorder;
    const prefix = new Array(pattern.length).fill(0);
    for (let i = 1, j = 0; i < pattern.length; i += 1) {
      while (j > 0 && pattern[i] !== pattern[j]) j = prefix[j - 1];
      if (pattern[i] === pattern[j]) j += 1;
      prefix[i] = j;
    }
    const matches = [];
    for (let i = 0, j = 0; i < sequence.length; i += 1) {
      while (j > 0 && sequence[i] !== pattern[j]) j = prefix[j - 1];
      if (sequence[i] === pattern[j]) j += 1;
      if (j === pattern.length) {
        matches.push(i - pattern.length + 1);
        j = prefix[j - 1];
      }
    }
    output.innerHTML = `<div>DFS preorder: <code>[${sequence.join(", ")}]</code></div><div>Pattern: <code>[${pattern.join(", ")}]</code></div><div>${matches.length ? `<span class="ok">Match${matches.length === 1 ? "" : "es"} at zero-based index${matches.length === 1 ? "" : "es"} ${matches.join(", ")}.</span>` : "No match in this preorder."}</div>`;
  }

  // Edmonds–Karp uses BFS augmenting paths over the residual graph. Both
  // directions begin with unit capacity, representing an undirected link.
  function runMaxFlow() {
    const output = document.getElementById("output-flow");
    if (!requireTree(output)) return;
    const source = Number(document.getElementById("flow-source").value);
    const sink = Number(document.getElementById("flow-destination").value);
    if (!Number.isInteger(source) || !Number.isInteger(sink) || source < 1 || source > currentTree.n || sink < 1 || sink > currentTree.n) {
      output.textContent = `Source and destination must be node IDs from 1 to ${currentTree.n}.`;
      return;
    }
    if (source === sink) {
      output.textContent = "Source and destination must be different nodes.";
      return;
    }
    const residual = Array.from({ length: currentTree.n + 1 }, () => new Map());
    currentTree.edges.forEach(([a, b]) => { residual[a].set(b, 1); residual[b].set(a, 1); });
    let flow = 0;
    while (true) {
      const parent = new Int32Array(currentTree.n + 1);
      const queue = [source];
      parent[source] = -1;
      for (let head = 0; head < queue.length && parent[sink] === 0; head += 1) {
        const u = queue[head];
        for (const v of currentTree.adjacency[u]) {
          if ((residual[u].get(v) || 0) > 0 && parent[v] === 0) {
            parent[v] = u;
            queue.push(v);
            if (v === sink) break;
          }
        }
      }
      if (parent[sink] === 0) break;
      let bottleneck = Infinity;
      for (let v = sink; v !== source; v = parent[v]) bottleneck = Math.min(bottleneck, residual[parent[v]].get(v));
      for (let v = sink; v !== source; v = parent[v]) {
        const u = parent[v];
        residual[u].set(v, residual[u].get(v) - bottleneck);
        residual[v].set(u, (residual[v].get(u) || 0) + bottleneck);
      }
      flow += bottleneck;
    }
    output.innerHTML = `Maximum flow from <code>${source}</code> to <code>${sink}</code>: <strong>${flow}</strong> unit${flow === 1 ? "" : "s"}.`;
  }

  // A greedy maximal matching yields the standard 2-approximate vertex cover.
  function runVertexCover() {
    const output = document.getElementById("output-cover");
    if (!requireTree(output)) return;
    const matched = new Uint8Array(currentTree.n + 1);
    const cover = new Set();
    const matching = [];
    for (const [a, b] of currentTree.edges) {
      if (!matched[a] && !matched[b]) {
        matched[a] = matched[b] = 1;
        matching.push([a, b]);
        cover.add(a);
        cover.add(b);
      }
    }
    output.innerHTML = `Matching: <code>${matching.length ? matching.map((edge) => `(${edge.join(",")})`).join(" ") : "∅"}</code><br>Vertex cover: <strong>{${Array.from(cover).sort((a, b) => a - b).join(", ")}}</strong> · size ${cover.size}<br><span class="ok">Factor-2 guarantee: |C| ≤ 2 × OPT.</span>`;
  }

  // Iterative randomized quicksort sorts the real degree sequence in place.
  function randomizedQuickSort(values) {
    const stack = [[0, values.length - 1]];
    while (stack.length) {
      const [low, high] = stack.pop();
      if (low >= high) continue;
      const pivotIndex = low + Math.floor(Math.random() * (high - low + 1));
      [values[pivotIndex], values[high]] = [values[high], values[pivotIndex]];
      const pivot = values[high];
      let boundary = low;
      for (let index = low; index < high; index += 1) {
        if (values[index] <= pivot) {
          [values[boundary], values[index]] = [values[index], values[boundary]];
          boundary += 1;
        }
      }
      [values[boundary], values[high]] = [values[high], values[boundary]];
      if (boundary - 1 > low) stack.push([low, boundary - 1]);
      if (boundary + 1 < high) stack.push([boundary + 1, high]);
    }
    return values;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const parsed = readTree();
    if (parsed.error) {
      resetComputedState({ showEmpty: true });
      showError(parsed.error);
      return;
    }
    commitTree(parsed.tree);
  });

  document.getElementById("calculate-button").addEventListener("click", calculateAndDisplay);
  document.getElementById("clear-button").addEventListener("click", () => {
    form.reset();
    nodeInput.value = "";
    edgesInput.value = "";
    document.getElementById("kmp-pattern").value = "";
    document.getElementById("flow-source").value = "";
    document.getElementById("flow-destination").value = "";
    resetComputedState({ showEmpty: true });
    message.textContent = "";
    message.classList.remove("success");
    caption.textContent = "Create a valid tree to inspect its structure.";
  });

  [nodeInput, edgesInput].forEach((input) => {
    input.addEventListener("input", () => {
      resetComputedState({ showEmpty: true });
      message.textContent = "Inputs changed. Create the tree again to refresh all results.";
      message.classList.remove("success");
    });
  });

  document.getElementById("kmp-pattern").addEventListener("input", () => {
    document.getElementById("output-kmp").textContent = "";
  });
  [document.getElementById("flow-source"), document.getElementById("flow-destination")].forEach((input) => {
    input.addEventListener("input", () => { document.getElementById("output-flow").textContent = ""; });
  });

  document.querySelectorAll(".module-button").forEach((button) => {
    button.addEventListener("click", () => {
      const module = button.dataset.module;
      if (module === "diameter") {
        const result = calculateAndDisplay();
        const output = document.getElementById("output-diameter");
        if (result) output.innerHTML = `DP result: <strong>${result.length} edges</strong> · path <code>[${result.path.join(", ")}]</code>.`;
      } else if (module === "analysis") {
        const output = document.getElementById("output-analysis");
        if (!requireTree(output)) return;
        output.innerHTML = `<strong>Tree Dynamic Programming</strong><br>Time: <code>O(N)</code> · Space: <code>O(N)</code><br>Evaluated on ${currentTree.n} nodes and ${currentTree.edges.length} edges.`;
      } else if (module === "kmp") runKmp();
      else if (module === "flow") runMaxFlow();
      else if (module === "cover") runVertexCover();
      else if (module === "sort") {
        const output = document.getElementById("output-sort");
        if (!requireTree(output)) return;
        const degrees = currentTree.adjacency.slice(1).map((neighbors) => neighbors.length);
        randomizedQuickSort(degrees);
        output.innerHTML = `Sorted degrees: <code>[${degrees.join(", ")}]</code><br>Values from ${currentTree.n} current nodes.`;
      }
    });
  });
})();
