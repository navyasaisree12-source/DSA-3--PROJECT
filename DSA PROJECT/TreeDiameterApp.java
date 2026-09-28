import javax.swing.*;
import java.awt.*;
import java.util.*;

public class TreeDiameterApp extends JFrame {

    private JTextArea inputArea;
    private JTextField nodeField;
    private JLabel resultLabel;
    private TreePanel treePanel;

    private int n;
    private ArrayList<Integer>[] graph;
    private ArrayList<Integer> diameterPath;

    public TreeDiameterApp() {

        setTitle("Tree Diameter Computation System");
        setSize(1000, 700);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);

        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setBorder(
                BorderFactory.createEmptyBorder(10, 10, 10, 10)
        );

        // ================= TOP PANEL =================

        JPanel topPanel = new JPanel(new FlowLayout());

        topPanel.add(new JLabel("Number of Nodes:"));

        nodeField = new JTextField(5);
        topPanel.add(nodeField);

        JButton createButton = new JButton("Create Tree");
        topPanel.add(createButton);

        JButton calculateButton = new JButton("Calculate Diameter");
        topPanel.add(calculateButton);

        JButton clearButton = new JButton("Clear");
        topPanel.add(clearButton);

        mainPanel.add(topPanel, BorderLayout.NORTH);

        // ================= LEFT PANEL =================

        JPanel inputPanel = new JPanel(new BorderLayout(5, 5));

        JLabel instruction = new JLabel(
                "<html>Enter edges, one per line:<br>" +
                "Example: 1 2<br>" +
                "1 3<br>" +
                "2 4</html>"
        );

        inputPanel.add(instruction, BorderLayout.NORTH);

        inputArea = new JTextArea();
        inputArea.setFont(
                new Font("Monospaced", Font.PLAIN, 15)
        );

        JScrollPane scrollPane = new JScrollPane(inputArea);
        inputPanel.add(scrollPane, BorderLayout.CENTER);

        inputPanel.setPreferredSize(
                new Dimension(250, 500)
        );

        mainPanel.add(inputPanel, BorderLayout.WEST);

        // ================= CENTER PANEL =================

        treePanel = new TreePanel();
        mainPanel.add(treePanel, BorderLayout.CENTER);

        // ================= BOTTOM PANEL =================

        JPanel bottomPanel = new JPanel(new BorderLayout());

        resultLabel = new JLabel(
                "Enter nodes and edges, then click Calculate Diameter.",
                SwingConstants.CENTER
        );

        resultLabel.setFont(
                new Font("Arial", Font.BOLD, 16)
        );

        bottomPanel.add(resultLabel, BorderLayout.CENTER);

        mainPanel.add(bottomPanel, BorderLayout.SOUTH);

        // ================= BUTTON ACTIONS =================

        createButton.addActionListener(e -> createTree());

        calculateButton.addActionListener(e -> calculateDiameter());

        clearButton.addActionListener(e -> clearAll());

        add(mainPanel);
    }

    // =========================================================
    // CREATE TREE
    // =========================================================

    private void createTree() {

        try {

            n = Integer.parseInt(
                    nodeField.getText().trim()
            );

            if (n <= 0 || n > 1000) {

                JOptionPane.showMessageDialog(
                        this,
                        "Number of nodes must be between 1 and 1000."
                );

                return;
            }

            graph = new ArrayList[n + 1];

            for (int i = 1; i <= n; i++) {
                graph[i] = new ArrayList<>();
            }

            diameterPath = null;

            resultLabel.setText(
                    "Tree created. Enter " +
                    (n - 1) +
                    " edges and calculate the diameter."
            );

            treePanel.setGraph(
                    graph,
                    n,
                    null
            );

        } catch (NumberFormatException ex) {

            JOptionPane.showMessageDialog(
                    this,
                    "Please enter a valid number of nodes."
            );
        }
    }

    // =========================================================
    // READ EDGES
    // =========================================================

    private boolean readEdges() {

        if (graph == null) {

            JOptionPane.showMessageDialog(
                    this,
                    "Please create the tree first."
            );

            return false;
        }

        String input = inputArea.getText().trim();

        if (input.isEmpty()) {

            JOptionPane.showMessageDialog(
                    this,
                    "Please enter the tree edges."
            );

            return false;
        }

        // Clear previous edges
        for (int i = 1; i <= n; i++) {
            graph[i].clear();
        }

        String[] lines = input.split("\\r?\\n");

        int edgeCount = 0;

        for (String line : lines) {

            line = line.trim();

            if (line.isEmpty()) {
                continue;
            }

            String[] parts = line.split("\\s+");

            if (parts.length != 2) {

                JOptionPane.showMessageDialog(
                        this,
                        "Invalid edge format: " +
                        line +
                        "\nUse format: u v"
                );

                return false;
            }

            try {

                int u = Integer.parseInt(parts[0]);
                int v = Integer.parseInt(parts[1]);

                // Check node range
                if (u < 1 || u > n ||
                        v < 1 || v > n) {

                    JOptionPane.showMessageDialog(
                            this,
                            "Node numbers must be between 1 and " +
                            n
                    );

                    return false;
                }

                // Check self-loop
                if (u == v) {

                    JOptionPane.showMessageDialog(
                            this,
                            "A node cannot be connected to itself."
                    );

                    return false;
                }

                // Check duplicate edge
                if (graph[u].contains(v)) {

                    JOptionPane.showMessageDialog(
                            this,
                            "Duplicate edge found: " +
                            u + " " + v
                    );

                    return false;
                }

                graph[u].add(v);
                graph[v].add(u);

                edgeCount++;

            } catch (NumberFormatException ex) {

                JOptionPane.showMessageDialog(
                        this,
                        "Invalid numbers in edge: " +
                        line
                );

                return false;
            }
        }

        // A tree with N nodes must have N-1 edges
        if (edgeCount != n - 1) {

            JOptionPane.showMessageDialog(
                    this,
                    "A tree with " +
                    n +
                    " nodes must contain exactly " +
                    (n - 1) +
                    " edges.\nYou entered: " +
                    edgeCount
            );

            return false;
        }

        // Check connectivity
        if (!isConnected()) {

            JOptionPane.showMessageDialog(
                    this,
                    "The given edges do not form a connected tree."
            );

            return false;
        }

        return true;
    }

    // =========================================================
    // CHECK CONNECTIVITY USING BFS
    // =========================================================

    private boolean isConnected() {

        boolean[] visited =
                new boolean[n + 1];

        Queue<Integer> queue =
                new LinkedList<>();

        queue.add(1);
        visited[1] = true;

        int count = 0;

        while (!queue.isEmpty()) {

            int current = queue.poll();

            count++;

            for (int next : graph[current]) {

                if (!visited[next]) {

                    visited[next] = true;
                    queue.add(next);
                }
            }
        }

        return count == n;
    }

    // =========================================================
    // CALCULATE DIAMETER
    // =========================================================

    private void calculateDiameter() {

        if (!readEdges()) {
            return;
        }

        // Special case: one node
        if (n == 1) {

            diameterPath = new ArrayList<>();
            diameterPath.add(1);

            resultLabel.setText(
                    "Tree Diameter = 0 edges | Node: 1"
            );

            treePanel.setGraph(
                    graph,
                    n,
                    diameterPath
            );

            return;
        }

        /*
         * DFS + Dynamic Programming
         *
         * For every node:
         *
         * height = maximum distance from this node
         *          to any node in its subtree.
         *
         * Diameter through a node =
         * largest child height +
         * second largest child height.
         */

        DPResult result = dfs(1, 0);

        // Get the two endpoints of the diameter
        int start = result.diameterStart;
        int end = result.diameterEnd;

        // Reconstruct actual path
        diameterPath = findPath(start, end);

        resultLabel.setText(
                "Tree Diameter = " +
                result.diameter +
                " edges    |    Diameter Path: " +
                diameterPath
        );

        treePanel.setGraph(
                graph,
                n,
                diameterPath
        );
    }

    // =========================================================
    // DP RESULT CLASS
    // =========================================================

    private static class DPResult {

        int height;
        int deepestNode;

        int diameter;
        int diameterStart;
        int diameterEnd;

        DPResult(
                int height,
                int deepestNode,
                int diameter,
                int diameterStart,
                int diameterEnd
        ) {

            this.height = height;
            this.deepestNode = deepestNode;
            this.diameter = diameter;
            this.diameterStart = diameterStart;
            this.diameterEnd = diameterEnd;
        }
    }

    // =========================================================
    // DFS + DYNAMIC PROGRAMMING
    // =========================================================

    private DPResult dfs(
            int node,
            int parent
    ) {

        int largestHeight = 0;
        int secondLargestHeight = 0;

        int largestDeepestNode = node;
        int secondDeepestNode = node;

        // Best diameter found inside child subtrees
        int bestDiameter = 0;
        int bestStart = node;
        int bestEnd = node;

        for (int child : graph[node]) {

            if (child == parent) {
                continue;
            }

            // Recursively solve child subtree
            DPResult childResult =
                    dfs(child, node);

            int childHeight =
                    childResult.height + 1;

            // Keep the best diameter found below
            if (childResult.diameter > bestDiameter) {

                bestDiameter =
                        childResult.diameter;

                bestStart =
                        childResult.diameterStart;

                bestEnd =
                        childResult.diameterEnd;
            }

            // Find largest and second largest heights
            if (childHeight > largestHeight) {

                secondLargestHeight =
                        largestHeight;

                secondDeepestNode =
                        largestDeepestNode;

                largestHeight =
                        childHeight;

                largestDeepestNode =
                        childResult.deepestNode;

            } else if (childHeight >
                    secondLargestHeight) {

                secondLargestHeight =
                        childHeight;

                secondDeepestNode =
                        childResult.deepestNode;
            }
        }

        /*
         * Diameter passing through current node.
         */
        int currentDiameter =
                largestHeight +
                secondLargestHeight;

        if (currentDiameter > bestDiameter) {

            bestDiameter =
                    currentDiameter;

            // First endpoint
            if (largestHeight > 0) {
                bestStart =
                        largestDeepestNode;
            } else {
                bestStart = node;
            }

            // Second endpoint
            if (secondLargestHeight > 0) {
                bestEnd =
                        secondDeepestNode;
            } else {
                bestEnd = node;
            }
        }

        /*
         * Deepest node of current subtree.
         */
        int deepestNode;

        if (largestHeight > 0) {
            deepestNode =
                    largestDeepestNode;
        } else {
            deepestNode = node;
        }

        return new DPResult(
                largestHeight,
                deepestNode,
                bestDiameter,
                bestStart,
                bestEnd
        );
    }

    // =========================================================
    // FIND PATH BETWEEN TWO NODES
    // =========================================================

    private ArrayList<Integer> findPath(
            int start,
            int end
    ) {

        boolean[] visited =
                new boolean[n + 1];

        ArrayList<Integer> path =
                new ArrayList<>();

        if (findPathDFS(
                start,
                end,
                visited,
                path
        )) {

            return path;
        }

        return new ArrayList<>();
    }

    // =========================================================
    // PATH DFS
    // =========================================================

    private boolean findPathDFS(
            int current,
            int target,
            boolean[] visited,
            ArrayList<Integer> path
    ) {

        visited[current] = true;

        path.add(current);

        if (current == target) {
            return true;
        }

        for (int next : graph[current]) {

            if (!visited[next]) {

                if (findPathDFS(
                        next,
                        target,
                        visited,
                        path
                )) {

                    return true;
                }
            }
        }

        // Backtrack
        path.remove(
                path.size() - 1
        );

        return false;
    }

    // =========================================================
    // CLEAR
    // =========================================================

    private void clearAll() {

        nodeField.setText("");

        inputArea.setText("");

        resultLabel.setText(
                "Enter nodes and edges, then click Calculate Diameter."
        );

        graph = null;

        diameterPath = null;

        treePanel.clear();
    }

    // =========================================================
    // TREE VISUALIZATION PANEL
    // =========================================================

    class TreePanel extends JPanel {

        private ArrayList<Integer>[] graph;
        private int n;
        private ArrayList<Integer> diameterPath;

        public TreePanel() {

            setBackground(Color.WHITE);
        }

        public void setGraph(
                ArrayList<Integer>[] graph,
                int n,
                ArrayList<Integer> diameterPath
        ) {

            this.graph = graph;
            this.n = n;
            this.diameterPath = diameterPath;

            repaint();
        }

        public void clear() {

            graph = null;
            diameterPath = null;
            n = 0;

            repaint();
        }

        @Override
        protected void paintComponent(
                Graphics g
        ) {

            super.paintComponent(g);

            if (graph == null || n == 0) {

                g.setFont(
                        new Font(
                                "Arial",
                                Font.BOLD,
                                18
                        )
                );

                g.drawString(
                        "Tree visualization will appear here.",
                        50,
                        50
                );

                return;
            }

            Graphics2D g2 =
                    (Graphics2D) g;

            g2.setRenderingHint(
                    RenderingHints.KEY_ANTIALIASING,
                    RenderingHints.VALUE_ANTIALIAS_ON
            );

            // Calculate layout
            HashMap<Integer, Point> positions =
                    createTreeLayout();

            // Draw edges first
            drawEdges(
                    g2,
                    positions
            );

            // Draw nodes
            drawNodes(
                    g2,
                    positions
            );
        }

        // =====================================================
        // CREATE TREE LAYOUT
        // =====================================================

        private HashMap<Integer, Point>
        createTreeLayout() {

            HashMap<Integer, Point> positions =
                    new HashMap<>();

            boolean[] visited =
                    new boolean[n + 1];

            Queue<Integer> queue =
                    new LinkedList<>();

            HashMap<Integer, Integer> level =
                    new HashMap<>();

            HashMap<Integer, Integer> levelCount =
                    new HashMap<>();

            queue.add(1);
            visited[1] = true;
            level.put(1, 0);

            // BFS to calculate levels
            while (!queue.isEmpty()) {

                int current =
                        queue.poll();

                for (int next :
                        graph[current]) {

                    if (!visited[next]) {

                        visited[next] = true;

                        level.put(
                                next,
                                level.get(current) + 1
                        );

                        queue.add(next);
                    }
                }
            }

            // Count nodes in each level
            for (int i = 1; i <= n; i++) {

                int currentLevel =
                        level.getOrDefault(i, 0);

                levelCount.put(
                        currentLevel,
                        levelCount.getOrDefault(
                                currentLevel,
                                0
                        ) + 1
                );
            }

            HashMap<Integer, Integer>
                    currentPosition =
                    new HashMap<>();

            int maxLevel = 0;

            for (int l : level.values()) {

                maxLevel =
                        Math.max(
                                maxLevel,
                                l
                        );
            }

            int verticalSpacing =
                    Math.max(
                            70,
                            getHeight() /
                                    (maxLevel + 2)
                    );

            // Position nodes level by level
            for (int node = 1;
                 node <= n;
                 node++) {

                int l =
                        level.getOrDefault(
                                node,
                                0
                        );

                int count =
                        levelCount.get(l);

                int position =
                        currentPosition.getOrDefault(
                                l,
                                0
                        );

                currentPosition.put(
                        l,
                        position + 1
                );

                int horizontalSpacing =
                        getWidth() /
                                (count + 1);

                int x =
                        horizontalSpacing *
                                (position + 1);

                int y =
                        60 +
                        l * verticalSpacing;

                positions.put(
                        node,
                        new Point(x, y)
                );
            }

            return positions;
        }

        // =====================================================
        // DRAW EDGES
        // =====================================================

        private void drawEdges(
                Graphics2D g2,
                HashMap<Integer, Point> positions
        ) {

            for (int u = 1;
                 u <= n;
                 u++) {

                for (int v :
                        graph[u]) {

                    // Draw each undirected edge once
                    if (u < v) {

                        Point p1 =
                                positions.get(u);

                        Point p2 =
                                positions.get(v);

                        boolean diameterEdge =
                                isDiameterEdge(
                                        u,
                                        v
                                );

                        if (diameterEdge) {

                            g2.setStroke(
                                    new BasicStroke(5)
                            );

                            g2.setColor(
                                    Color.RED
                            );

                        } else {

                            g2.setStroke(
                                    new BasicStroke(2)
                            );

                            g2.setColor(
                                    Color.DARK_GRAY
                            );
                        }

                        g2.drawLine(
                                p1.x,
                                p1.y,
                                p2.x,
                                p2.y
                        );
                    }
                }
            }
        }

        // =====================================================
        // CHECK DIAMETER EDGE
        // =====================================================

        private boolean isDiameterEdge(
                int u,
                int v
        ) {

            if (diameterPath == null ||
                    diameterPath.size() < 2) {

                return false;
            }

            for (int i = 0;
                 i < diameterPath.size() - 1;
                 i++) {

                int a =
                        diameterPath.get(i);

                int b =
                        diameterPath.get(i + 1);

                if ((a == u && b == v) ||
                        (a == v && b == u)) {

                    return true;
                }
            }

            return false;
        }

        // =====================================================
        // DRAW NODES
        // =====================================================

        private void drawNodes(
                Graphics2D g2,
                HashMap<Integer, Point> positions
        ) {

            int radius = 22;

            for (int node = 1;
                 node <= n;
                 node++) {

                Point p =
                        positions.get(node);

                if (p == null) {
                    continue;
                }

                boolean isDiameterNode =
                        diameterPath != null &&
                        diameterPath.contains(node);

                // Diameter nodes are red
                if (isDiameterNode) {

                    g2.setColor(
                            Color.RED
                    );

                } else {

                    g2.setColor(
                            new Color(
                                    70,
                                    130,
                                    180
                            )
                    );
                }

                g2.fillOval(
                        p.x - radius,
                        p.y - radius,
                        radius * 2,
                        radius * 2
                );

                // Border
                g2.setColor(Color.BLACK);

                g2.setStroke(
                        new BasicStroke(2)
                );

                g2.drawOval(
                        p.x - radius,
                        p.y - radius,
                        radius * 2,
                        radius * 2
                );

                // Node number
                String text =
                        String.valueOf(node);

                g2.setFont(
                        new Font(
                                "Arial",
                                Font.BOLD,
                                14
                        )
                );

                FontMetrics fm =
                        g2.getFontMetrics();

                int textWidth =
                        fm.stringWidth(text);

                int textHeight =
                        fm.getAscent();

                g2.setColor(Color.WHITE);

                g2.drawString(
                        text,
                        p.x - textWidth / 2,
                        p.y + textHeight / 2
                );
            }
        }
    }

    // =========================================================
    // MAIN METHOD
    // =========================================================

    public static void main(
            String[] args
    ) {

        SwingUtilities.invokeLater(
                () -> {

                    TreeDiameterApp app =
                            new TreeDiameterApp();

                    app.setVisible(true);
                }
        );
    }
}
