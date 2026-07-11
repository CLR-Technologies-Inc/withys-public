import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import { useColors } from '@/lib/ThemeProvider';
import { useEntries, useContacts } from '@/lib/hooks';
import { parseMarkdownEntry } from '@/lib/markdownParser';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isEncryptedEntry } from '@/lib/vault';

// ── Types ────────────────────────────────────────────────────────────────────
interface GraphNode {
  id: string;
  name: string;
  group: 'contact' | 'tag';
  radius: number;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

// ⚡ Hoisted regex for mention detection — avoid re-compilation in the loop
const MENTION_PATTERN = /(?:^|\s)@([A-Z][a-zA-ZÀ-ÿ]+(?:\s+[A-Z][a-zA-ZÀ-ÿ]+)*)/g;

// ── Graph data builder (shared between web and native) ───────────────────────
function useGraphData(entries: any[], contacts: any[]) {
  return useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkMap = new Map<string, GraphLink>();

    // ⚡ Pre-calculate contact lookup maps for O(1) matching instead of O(C)
    const contactMap = new Map<string, any>();
    contacts.forEach(c => {
      contactMap.set(c.name.toLowerCase(), c);
    });

    // ⚡ Track contact nodes by lowercase name → nodeId for O(1) lookups
    const contactNodeNames = new Map<string, string>();

    // 1. Add known contacts to ensure they exist (skip archived)
    // ⚡ Pre-calculate lowercased names for faster fuzzy matching
    const contactSearchData = contacts
      .filter((c: any) => !c.is_archived)
      .map((c: any) => {
        const contactNodeId = 'contact:' + c.name;
        const lowerName = c.name.toLowerCase();

        nodeMap.set(contactNodeId, {
          id: contactNodeId,
          name: c.name,
          group: 'contact',
          radius: 15 + Math.min(c.entry_count * 2, 20),
        });

        contactNodeNames.set(lowerName, contactNodeId);

        return { name: c.name, lowerName };
      });

    // 2. Iterate entries to build edges and add tags
    entries.forEach((e: any) => {
      const contactNodeId = 'contact:' + e.contact_name;
      if (!nodeMap.has(contactNodeId)) {
        nodeMap.set(contactNodeId, {
          id: contactNodeId,
          name: e.contact_name,
          group: 'contact',
          radius: 15,
        });
        contactNodeNames.set(e.contact_name.toLowerCase(), contactNodeId);
      }

      e.tags?.forEach((t: string) => {
        // Exclude system tags like vault:true
        if (t.startsWith('vault:')) return;

        // Clean up the tag display name for the graph
        const cleanTagName = t.replace(/^(relationship|topic|event):/, '');
        const tagNodeId = 'tag:' + t;

        if (!nodeMap.has(tagNodeId)) {
          nodeMap.set(tagNodeId, {
            id: tagNodeId,
            name: cleanTagName,
            group: 'tag',
            radius: 8,
          });
        }

        const linkId = `${contactNodeId}--${tagNodeId}`;
        const existingLink = linkMap.get(linkId);
        if (existingLink) {
          existingLink.value += 1;
        } else {
          linkMap.set(linkId, {
            source: contactNodeId,
            target: tagNodeId,
            value: 1,
          });
        }
      });

      // ⚡ Fast-path: Skip parsing if entry has no potential mentions or frontmatter 'with'
      const hasMentions = e.raw_text.includes('@') || e.raw_text.includes('with:');
      if (!hasMentions || isEncryptedEntry(e.raw_text)) return;

      // Extract people mentioned in markdown (with: and @Mentions)
      try {
        const md = parseMarkdownEntry(e.raw_text);
        const mentionedPeople = new Set<string>();

        // 1. From frontmatter "with:"
        md.frontmatter.with?.forEach((p: string) => mentionedPeople.add(p));

        // 2. From body "@Mentions" — match multi-word names like @Valentina Restrepo
        MENTION_PATTERN.lastIndex = 0; // Reset regex state
        let match;
        while ((match = MENTION_PATTERN.exec(md.body)) !== null) {
          mentionedPeople.add(match[1]);
        }

        if (mentionedPeople.size === 0) return;

        const entryContactLower = e.contact_name.toLowerCase();

        mentionedPeople.forEach(person => {
          let cleanPerson = person.trim();
          const lowerPerson = cleanPerson.toLowerCase();
          if (!cleanPerson || lowerPerson === entryContactLower) return;

          // ⚡ Optimized normalization: Check Map first before O(C) find
          // Use pre-calculated contactSearchData to avoid redundant .toLowerCase()
          const existingContact = contactMap.get(lowerPerson) || contactSearchData.find((c) => {
            const cn = c.lowerName;
            return cn.startsWith(lowerPerson + ' ') || cn.endsWith(' ' + lowerPerson)
              || lowerPerson.startsWith(cn + ' ') || lowerPerson.endsWith(' ' + cn);
          });

          if (existingContact) {
            cleanPerson = existingContact.name; // Use canonical name
          }

          const targetLower = cleanPerson.toLowerCase();
          let targetNodeId = contactNodeNames.get(targetLower);

          if (!targetNodeId) {
            // ⚡ Optimized merge check: search in contactNodeNames Map instead of nodeMap keys
            let existingNodeKey: string | undefined;
            for (const [name, nodeId] of contactNodeNames.entries()) {
              if (name.includes(targetLower) || targetLower.includes(name)) {
                existingNodeKey = nodeId;
                break;
              }
            }

            if (existingNodeKey) {
              // Merge into the existing node
              const sortedIds = [contactNodeId, existingNodeKey].sort();
              const linkId = `${sortedIds[0]}--${sortedIds[1]}`;
              const existingLink = linkMap.get(linkId);
              if (existingLink) {
                existingLink.value += 1;
              } else {
                linkMap.set(linkId, { source: sortedIds[0], target: sortedIds[1], value: 1 });
              }
              return;
            }

            targetNodeId = 'contact:' + cleanPerson;
            nodeMap.set(targetNodeId, {
              id: targetNodeId,
              name: cleanPerson,
              group: 'contact',
              radius: 15,
            });
            contactNodeNames.set(targetLower, targetNodeId);
          }

          // Create a bidirectional link by sorting IDs to prevent duplicates
          const sortedIds = [contactNodeId, targetNodeId].sort();
          const linkId = `${sortedIds[0]}--${sortedIds[1]}`;

          const existingLink = linkMap.get(linkId);
          if (existingLink) {
            existingLink.value += 1;
          } else {
            linkMap.set(linkId, {
              source: sortedIds[0],
              target: sortedIds[1],
              value: 1,
            });
          }
        });
      } catch {
        // Ignore parse errors for older non-markdown entries
      }
    });

    // Filter out tags that only have 1 connection (they don't connect people)
    const tagConnectionCount = new Map<string, number>();
    linkMap.forEach(link => {
      const tagId = link.target as string;
      tagConnectionCount.set(tagId, (tagConnectionCount.get(tagId) || 0) + 1);
    });

    const nodes = Array.from(nodeMap.values()).filter(node => {
      if (node.group === 'tag') {
        return (tagConnectionCount.get(node.id) || 0) > 1;
      }
      return true; // Keep all contacts
    });

    // Filter links to only those where both source and target still exist
    const activeNodeIds = new Set(nodes.map(n => n.id));
    const links = Array.from(linkMap.values()).filter(l =>
      activeNodeIds.has(l.source as string) && activeNodeIds.has(l.target as string)
    );

    return { nodes, links };
  }, [entries, contacts]);
}

// ── Web implementation (Canvas via react-force-graph-2d) ─────────────────────
function WebGraph({ graphData, Colors, contacts, router, graphWidth, graphHeight }: {
  graphData: { nodes: GraphNode[]; links: GraphLink[] };
  Colors: ReturnType<typeof useColors>;
  contacts: any[];
  router: any;
  graphWidth: number;
  graphHeight: number;
}) {
  const [ForceGraph, setForceGraph] = useState<any>(null);
  const fgRef = useRef<any>(null);

  // Dynamic import — react-force-graph-2d uses Canvas which only works in browser
  useEffect(() => {
    import('react-force-graph-2d').then(mod => {
      setForceGraph(() => mod.default);
    });
  }, []);

  // Zoom to fit after data loads
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      const timer = setTimeout(() => {
        fgRef.current?.zoomToFit(400, 60);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [graphData, ForceGraph]);

  const handleNodeClick = useCallback((node: any) => {
    if (node.group === 'contact') {
      const c = contacts.find((c: any) => c.name === node.name);
      if (c) router.push(`/person/${c.id}` as any);
    }
  }, [contacts, router]);

  // Custom node renderer using Canvas API
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isContact = node.group === 'contact';
    const r = node.radius || (isContact ? 18 : 8);
    const fontSize = Math.max((isContact ? 12 : 10) / globalScale, 3);
    const x = node.x ?? 0;
    const y = node.y ?? 0;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (isContact) {
      ctx.fillStyle = Colors.primaryAccent;
    } else {
      ctx.fillStyle = Colors.surfaceCard;
      ctx.strokeStyle = Colors.secondaryAccent;
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }
    ctx.fill();

    // Draw glow for contacts
    if (isContact) {
      ctx.save();
      ctx.shadowColor = Colors.primaryAccent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }

    // Draw label below node
    ctx.font = `${isContact ? 'bold' : 'normal'} ${fontSize}px SpaceMono, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isContact ? Colors.textPrimary : Colors.secondaryAccent;
    ctx.fillText(node.name, x, y + r + 4 / globalScale);
  }, [Colors]);

  // Custom link renderer for glow effect
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const source = link.source;
    const target = link.target;
    if (!source || !target || source.x === undefined || target.x === undefined) return;

    const strokeW = Math.min((link.value || 1) + 0.5, 4) / globalScale;

    // Draw glow
    ctx.save();
    ctx.shadowColor = Colors.secondaryAccent;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = Colors.secondaryAccent;
    ctx.lineWidth = strokeW;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.restore();
  }, [Colors]);

  if (!ForceGraph) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Loading graph…</Text>
      </View>
    );
  }

  return (
    <ForceGraph
      ref={fgRef}
      graphData={graphData}
      width={graphWidth}
      height={graphHeight}
      backgroundColor={Colors.background}
      // Node config
      nodeId="id"
      nodeLabel={(node: any) => node.name}
      nodeVal={(node: any) => node.radius * 2}
      nodeCanvasObject={nodeCanvasObject}
      nodeCanvasObjectMode={() => 'replace' as const}
      nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
        const r = node.radius || 18;
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }}
      // Link config
      linkCanvasObject={linkCanvasObject}
      linkCanvasObjectMode={() => 'replace' as const}
      // Physics config
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      cooldownTicks={200}
      // Interaction
      onNodeClick={handleNodeClick}
      enableNodeDrag={true}
      enableZoomInteraction={true}
      enablePanInteraction={true}
    />
  );
}

// ── Native fallback (SVG — preserves original for iOS/Android) ───────────────
function NativeGraph({ graphData, Colors, contacts, router, graphWidth, graphHeight }: {
  graphData: { nodes: GraphNode[]; links: GraphLink[] };
  Colors: ReturnType<typeof useColors>;
  contacts: any[];
  router: any;
  graphWidth: number;
  graphHeight: number;
}) {
  // Lazy-load SVG deps only on native to avoid bundling them on web
  const [SvgModule, setSvgModule] = useState<any>(null);
  const [d3Module, setD3Module] = useState<any>(null);
  const [simNodes, setSimNodes] = useState<any[]>([]);
  const [simLinks, setSimLinks] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      import('react-native-svg'),
      import('d3-force'),
    ]).then(([svg, d3]) => {
      setSvgModule(svg);
      setD3Module(d3);
    });
  }, []);

  useEffect(() => {
    if (!d3Module || graphData.nodes.length === 0) return;

    const nodesCopy = graphData.nodes.map(n => ({ ...n }));
    const linksCopy = graphData.links.map(l => ({ ...l }));

    const simulation = d3Module.forceSimulation(nodesCopy)
      .force('link', d3Module.forceLink(linksCopy).id((d: any) => d.id).distance(80))
      .force('charge', d3Module.forceManyBody().strength(-200))
      .force('center', d3Module.forceCenter(graphWidth / 2, graphHeight / 2))
      .force('collide', d3Module.forceCollide().radius((d: any) => d.radius + 15));

    // Compute synchronously for native to avoid jank
    simulation.stop();
    for (let i = 0; i < 300; ++i) simulation.tick();
    setSimNodes([...nodesCopy]);
    setSimLinks([...linksCopy]);

    return () => { simulation.stop(); };
  }, [d3Module, graphData, graphWidth, graphHeight]);

  if (!SvgModule) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Loading graph…</Text>
      </View>
    );
  }

  const { Svg, Line, Circle, Text: SvgText, G } = SvgModule;

  return (
    <Svg width={graphWidth} height={graphHeight}>
      {simLinks.map((link: any, i: number) => {
        const source = link.source;
        const target = link.target;
        if (source?.x === undefined || target?.x === undefined) return null;
        return (
          <Line
            key={`link-${i}`}
            x1={source.x} y1={source.y}
            x2={target.x} y2={target.y}
            stroke={Colors.secondaryAccent}
            strokeWidth={Math.min(link.value + 1, 5)}
            opacity={0.6}
          />
        );
      })}
      {simNodes.map((node: any) => {
        if (node.x === undefined || node.y === undefined) return null;
        const isContact = node.group === 'contact';
        return (
          <G
            key={`node-${node.id}`}
            x={node.x} y={node.y}
            onPress={() => {
              if (isContact) {
                const c = contacts.find((c: any) => c.name === node.name);
                if (c) router.push(`/person/${c.id}` as any);
              }
            }}
          >
            <Circle
              r={node.radius}
              fill={isContact ? Colors.primaryAccent : Colors.surfaceCard}
              stroke={isContact ? undefined : Colors.secondaryAccent}
              strokeWidth={isContact ? 0 : 1}
            />
            <SvgText
              fill={isContact ? Colors.textPrimary : Colors.secondaryAccent}
              fontSize={isContact ? 12 : 10}
              fontWeight={isContact ? "bold" : "normal"}
              textAnchor="middle"
              dy={node.radius + 14}
            >
              {node.name}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function GraphScreen() {
  const Colors = useColors();
  const styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const { data: entries = [] } = useEntries();
  const { data: contacts = [] } = useContacts();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { width, height } = Dimensions.get('window');
  const graphWidth = width;
  const graphHeight = height - 150 - insets.bottom - insets.top;

  const graphData = useGraphData(entries, contacts);

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social Network</Text>
        <Text style={styles.headerSubtitle}>
          {isWeb
            ? 'Drag to pan · Scroll to zoom · Click a contact to view'
            : 'Tap a contact to view their profile'}
        </Text>
        {graphData.nodes.length > 0 && (
          <Text style={styles.headerStats}>
            {graphData.nodes.filter(n => n.group === 'contact').length} people · {graphData.nodes.filter(n => n.group === 'tag').length} tags · {graphData.links.length} connections
          </Text>
        )}
      </View>
      <View
        style={[styles.graphContainer, webOnlyStyles]}
        // @ts-ignore — web-only data attribute
        data-graph-container="true"
      >
        {isWeb ? (
          <WebGraph
            graphData={graphData}
            Colors={Colors}
            contacts={contacts}
            router={router}
            graphWidth={graphWidth}
            graphHeight={graphHeight}
          />
        ) : (
          <NativeGraph
            graphData={graphData}
            Colors={Colors}
            contacts={contacts}
            router={router}
            graphWidth={graphWidth}
            graphHeight={graphHeight}
          />
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const makeStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  headerStats: {
    color: Colors.secondaryAccent,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'SpaceMono',
  },
  graphContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});

// Web-only CSS properties that can't go through StyleSheet.create
const webOnlyStyles = Platform.OS === 'web' ? {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
} as any : {};
