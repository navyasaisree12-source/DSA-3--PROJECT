// ======================================================
// TREE DIAMETER COMPUTATION SYSTEM
// DFS + RECURSION + DYNAMIC PROGRAMMING
// ======================================================

let numberOfNodes = 0;
let adjacencyList = {};
let diameterPath = [];
let diameter = 0;


// ======================================================
// ELEMENTS
// ======================================================

const nodeCountInput = document.getElementById("nodeCount");
const edgeInput = document.getElementById("edgeInput");

const createTreeBtn = document.getElementById("createTreeBtn");
const calculateBtn = document.getElementById("calculateBtn");
const clearBtn = document.getElementById("clearBtn");

const treeCanvas = document.getElementById("treeCanvas");

const resultCard = document.getElementById("resultCard");
const diameterValue = document.getElementById("diameterValue");
const diameterPathElement = document.getElementById("diameterPath");


// ======================================================
// CREATE TREE
// ======================================================

createTreeBtn.addEventListener("click", createTree);

function createTree() {

    numberOfNodes = parseInt(nodeCountInput.value);

    if (
        isNaN(numberOfNodes) ||
        numberOfNodes < 1 ||
        numberOfNodes > 1000
    ) {
        showMessage("Please enter a number of nodes between 1 and 1000.");
        return;
    }

    adjacencyList = {};

    for (let i = 1; i <= numberOfNodes; i++) {
        adjacencyList[i] = [];
    }

    resultCard.classList.add("hidden");

    treeCanvas.innerHTML = `
        <div class="empty-state">
            <div class="tree-icon">🌳</div>
            <h3>Tree Created</h3>
            <p>Enter the edges and click Calculate Diameter.</p>
        </div>
    `;

    showMessage(
        `Tree created successfully with ${numberOfNodes} nodes.`
    );
}


// ======================================================
// READ EDGES
// ======================================================

function readEdges() {

    const text = edgeInput.value.trim();

    if (!text) {
        throw new Error("Please enter the edges.");
    }

    const lines = text.split("\n");

    adjacencyList = {};

    for (let i = 1; i <= numberOfNodes; i++) {
        adjacencyList[i] = [];
    }

    const edges = [];

    for (let line of lines) {

        line = line.trim();

        if (!line) continue;

        const parts = line.split(/\s+/);

        if (parts.length !== 2) {
            throw new Error(
                `Invalid edge: "${line}". Use format: 1 2`
            );
        }

        const u = parseInt(parts[0]);
        const v = parseInt(parts[1]);

        if (
            isNaN(u) ||
            isNaN(v) ||
            u < 1 ||
            u > numberOfNodes ||
            v < 1 ||
            v > numberOfNodes
        ) {
            throw new Error(
                `Invalid nodes in edge: "${line}".`
            );
        }

        if (u === v) {
            throw new Error(
                `Self-loop is not allowed: "${line}".`
            );
        }

        const duplicate = edges.some(
            edge =>
                (edge[0] === u && edge[1] === v) ||
                (edge[0] === v && edge[1] === u)
        );

        if (duplicate) {
            throw new Error(
                `Duplicate edge found: "${line}".`
            );
        }

        edges.push([u, v]);

        adjacencyList[u].push(v);
        adjacencyList[v].push(u);
    }


    // A tree with N nodes must have N-1 edges

    if (edges.length !== numberOfNodes - 1) {

        throw new Error(
            `A tree with ${numberOfNodes} nodes must have ${
                numberOfNodes - 1
            } edges. You entered ${edges.length}.`
        );
    }


    // Check connectivity

    if (!isConnected()) {

        throw new Error(
            "The given graph is not connected. Please enter a valid tree."
        );
    }

    return edges;
}


// ======================================================
// CONNECTIVITY CHECK
// ======================================================

function isConnected() {

    const visited = new Set();

    const queue = [1];

    visited.add(1);

    while (queue.length > 0) {

        const current = queue.shift();

        for (const neighbor of adjacencyList[current]) {

            if (!visited.has(neighbor)) {

                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return visited.size === numberOfNodes;
}


// ======================================================
// CALCULATE DIAMETER
// ======================================================

calculateBtn.addEventListener(
    "click",
    calculateDiameter
);


function calculateDiameter() {

    try {

        if (!numberOfNodes) {

            throw new Error(
                "Please enter the number of nodes and click Create Tree first."
            );
        }

        readEdges();


        // Special case: one node

        if (numberOfNodes === 1) {

            diameter = 0;
            diameterPath = [1];

            displayResult();

            drawTree();

            return;
        }


        // Run DFS + Dynamic Programming

        const result = dfs(1, 0);


        diameter = result.diameter;
        diameterPath = findPath(
            result.start,
            result.end
        );


        displayResult();

        drawTree();

    }

    catch (error) {

        showMessage(error.message);
    }
}


// ======================================================
// DFS + DYNAMIC PROGRAMMING
// ======================================================

function dfs(node, parent) {

    let largestHeight = 0;
    let secondLargestHeight = 0;

    let deepestNode = node;

    let bestDiameter = 0;

    let bestStart = node;
    let bestEnd = node;


    for (const child of adjacencyList[node]) {

        if (child === parent) {
            continue;
        }


        const childResult = dfs(
            child,
            node
        );


        const childHeight =
            childResult.height + 1;


        // Keep the best subtree diameter

        if (
            childResult.diameter >
            bestDiameter
        ) {

            bestDiameter =
                childResult.diameter;

            bestStart =
                childResult.start;

            bestEnd =
                childResult.end;
        }


        // Find largest two child heights

        if (childHeight > largestHeight) {

            secondLargestHeight =
                largestHeight;

            largestHeight =
                childHeight;

            deepestNode =
                childResult.deepestNode;

        }

        else if (
            childHeight >
            secondLargestHeight
        ) {

            secondLargestHeight =
                childHeight;
        }
    }


    // Diameter passing through current node

    const throughNode =
        largestHeight +
        secondLargestHeight;


    if (throughNode > bestDiameter) {

        bestDiameter =
            throughNode;

        bestStart =
            deepestNode;

        bestEnd =
            findSecondDeepestNode(
                node,
                parent,
                largestHeight
            );
    }


    return {

        height: largestHeight,

        deepestNode: deepestNode,

        diameter: bestDiameter,

        start: bestStart,

        end: bestEnd
    };
}


// ======================================================
// FIND SECOND DEEPEST NODE
// ======================================================

function findSecondDeepestNode(
    node,
    parent,
    largestHeight
) {

    let bestNode = node;

    let bestHeight = 0;


    for (const child of adjacencyList[node]) {

        if (child === parent) {
            continue;
        }


        const result =
            getHeight(
                child,
                node
            );


        if (
            result.height + 1 <
            largestHeight &&
            result.height + 1 >
            bestHeight
        ) {

            bestHeight =
                result.height + 1;

            bestNode =
                result.node;
        }
    }


    return bestNode;
}


// ======================================================
// GET HEIGHT
// ======================================================

function getHeight(
    node,
    parent
) {

    let maxHeight = 0;

    let deepestNode = node;


    for (const child of adjacencyList[node]) {

        if (child === parent) {
            continue;
        }


        const result =
            getHeight(
                child,
                node
            );


        if (
            result.height + 1 >
            maxHeight
        ) {

            maxHeight =
                result.height + 1;

            deepestNode =
                result.node;
        }
    }


    return {

        height: maxHeight,

        node: deepestNode
    };
}


// ======================================================
// FIND DIAMETER PATH
// ======================================================

function findPath(
    start,
    end
) {

    const path = [];

    const visited = new Set();


    function search(node, parent) {

        path.push(node);


        if (node === end) {

            return true;
        }


        for (const neighbor of adjacencyList[node]) {

            if (
                neighbor === parent ||
                visited.has(neighbor)
            ) {

                continue;
            }


            visited.add(neighbor);


            if (
                search(
                    neighbor,
                    node
                )
            ) {

                return true;
            }
        }


        path.pop();

        return false;
    }


    search(start, 0);

    return path;
}


// ======================================================
// DISPLAY RESULT
// ======================================================

function displayResult() {

    diameterValue.textContent =
        diameter;

    diameterPathElement.textContent =
        diameterPath.join(" → ");

    resultCard.classList.remove(
        "hidden"
    );
}


// ======================================================
// DRAW TREE
// ======================================================

function drawTree() {

    treeCanvas.innerHTML = "";


    const width =
        treeCanvas.clientWidth;

    const height =
        treeCanvas.clientHeight;


    if (numberOfNodes === 1) {

        createNode(
            1,
            width / 2,
            height / 2,
            false
        );

        return;
    }


    // Create levels using BFS

    const levels = [];

    const queue = [
        {
            node: 1,
            parent: 0,
            level: 0
        }
    ];

    const visited = new Set();

    visited.add(1);


    while (queue.length > 0) {

        const current =
            queue.shift();


        if (!levels[current.level]) {

            levels[current.level] = [];
        }


        levels[current.level].push(
            current
        );


        for (
            const child
            of adjacencyList[current.node]
        ) {

            if (
                child === current.parent ||
                visited.has(child)
            ) {

                continue;
            }


            visited.add(child);


            queue.push({

                node: child,

                parent: current.node,

                level: current.level + 1

            });
        }
    }


    const positions = {};

    const verticalSpacing =
        Math.min(
            100,
            height /
            (levels.length + 1)
        );


    // Calculate node positions

    levels.forEach(
        (levelNodes, levelIndex) => {

            const y =
                70 +
                levelIndex *
                verticalSpacing;


            const spacing =
                width /
                (levelNodes.length + 1);


            levelNodes.forEach(
                (item, index) => {

                    positions[item.node] = {

                        x:
                            spacing *
                            (index + 1),

                        y:
                            y
                    };
                }
            );
        }
    );


    // Draw edges first

    for (
        let node = 1;
        node <= numberOfNodes;
        node++
    ) {

        for (
            const neighbor
            of adjacencyList[node]
        ) {

            if (node < neighbor) {

                const isDiameterEdge =
                    isEdgeInDiameter(
                        node,
                        neighbor
                    );


                drawEdge(
                    positions[node],
                    positions[neighbor],
                    isDiameterEdge
                );
            }
        }
    }


    // Draw nodes

    for (
        let node = 1;
        node <= numberOfNodes;
        node++
    ) {

        const position =
            positions[node];


        const isDiameterNode =
            diameterPath.includes(node);


        createNode(
            node,
            position.x,
            position.y,
            isDiameterNode
        );
    }
}


// ======================================================
// CHECK DIAMETER EDGE
// ======================================================

function isEdgeInDiameter(
    u,
    v
) {

    for (
        let i = 0;
        i < diameterPath.length - 1;
        i++
    ) {

        const a =
            diameterPath[i];

        const b =
            diameterPath[i + 1];


        if (
            (a === u && b === v) ||
            (a === v && b === u)
        ) {

            return true;
        }
    }

    return false;
}


// ======================================================
// DRAW EDGE
// ======================================================

function drawEdge(
    point1,
    point2,
    highlighted
) {

    const edge =
        document.createElement("div");


    edge.className =
        highlighted
            ? "tree-edge diameter-edge"
            : "tree-edge";


    const x1 =
        point1.x;

    const y1 =
        point1.y;

    const x2 =
        point2.x;

    const y2 =
        point2.y;


    const length =
        Math.sqrt(
            Math.pow(
                x2 - x1,
                2
            ) +
            Math.pow(
                y2 - y1,
                2
            )
        );


    const angle =
        Math.atan2(
            y2 - y1,
            x2 - x1
        ) *
        180 /
        Math.PI;


    edge.style.width =
        `${length}px`;

    edge.style.left =
        `${x1}px`;

    edge.style.top =
        `${y1}px`;

    edge.style.transform =
        `rotate(${angle}deg)`;


    treeCanvas.appendChild(
        edge
    );
}


// ======================================================
// CREATE NODE
// ======================================================

function createNode(
    value,
    x,
    y,
    highlighted
) {

    const node =
        document.createElement("div");


    node.className =
        highlighted
            ? "tree-node diameter-node"
            : "tree-node";


    node.textContent =
        value;


    node.style.left =
        `${x}px`;

    node.style.top =
        `${y}px`;


    treeCanvas.appendChild(
        node
    );
}


// ======================================================
// MESSAGE
// ======================================================

function showMessage(
    message
) {

    alert(message);
}


// ======================================================
// CLEAR
// ======================================================

clearBtn.addEventListener(
    "click",
    clearAll
);


function clearAll() {

    numberOfNodes = 0;

    adjacencyList = {};

    diameterPath = [];

    diameter = 0;


    nodeCountInput.value =
        "";

    edgeInput.value =
        "";


    resultCard.classList.add(
        "hidden"
    );


    treeCanvas.innerHTML = `
        <div class="empty-state">

            <div class="tree-icon">
                🌳
            </div>

            <h3>
                Your tree will appear here
            </h3>

            <p>
                Enter the nodes and edges,
                then calculate the diameter.
            </p>

        </div>
    `;
}