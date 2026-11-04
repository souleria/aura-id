import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import {
  EMPTY,
  cleanProfile,
  importProfile,
  createExport,
  createTasteToken,
  asMarkdown,
  parseNeeds,
  matchCatalog,
  SAMPLE_STORE_CATALOG,
} from '../dist/profile.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createProfileStore(filePath) {
  let current = EMPTY();
  if (filePath && fs.existsSync(filePath)) {
    try {
      current = importProfile(fs.readFileSync(filePath, 'utf8'));
    } catch {
      current = EMPTY();
    }
  }
  return {
    get() {
      return current;
    },
    set(next) {
      current = cleanProfile(next);
      if (filePath) {
        const exported = createExport(current, {
          context: true,
          communication: true,
          visual: true,
          taste: true,
        });
        fs.writeFileSync(filePath, JSON.stringify(exported, null, 2), 'utf8');
      }
      return current;
    },
  };
}

export const MCP_TOOLS = [
  {
    name: 'get_taste_token',
    description:
      'Generate a scoped, PII-free Aura ID Taste Token to share with store agents or external platforms.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Target domain (e.g., "commerce", "footwear", "lighting").',
        },
        includeNeeds: {
          type: 'boolean',
          description: 'Whether to include the active shopping/intent list.',
        },
      },
    },
  },
  {
    name: 'update_taste',
    description:
      'Update the user’s material taste, product priority, practical constraints, or things to avoid.',
    inputSchema: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['quality', 'value', 'minimal', 'unspecified'],
        },
        taste: { type: 'string', description: 'Aesthetic and material preferences.' },
        constraints: { type: 'string', description: 'Sizes, specs, or sensitivities.' },
        avoid: { type: 'string', description: 'Brands, patterns, or behaviors to avoid.' },
      },
    },
  },
  {
    name: 'manage_needs',
    description:
      'List, add, remove, or clear items in the user’s active shopping and intent list inside their Taste Token.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'add', 'remove', 'clear'],
        },
        item: {
          type: 'string',
          description: 'Shopping need or intent item to add or remove.',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'match_store_catalog',
    description:
      'Filter and rank a store agent’s product catalog using a scoped Aura ID Taste Token.',
    inputSchema: {
      type: 'object',
      properties: {
        catalog: {
          type: 'array',
          description: 'Optional custom store catalog array; defaults to sample store catalog.',
        },
      },
    },
  },
];

export function handleRpcRequest(msg, store) {
  const { id, method, params = {} } = msg;
  try {
    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'aura-id-mcp', version: '0.2.0' },
          capabilities: { resources: {}, tools: {} },
        },
      };
    }
    if (method === 'notifications/initialized') return null;

    if (method === 'resources/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            {
              uri: 'aura://profile/taste-token',
              name: 'Scoped Taste Token (No PII)',
              mimeType: 'application/json',
            },
            {
              uri: 'aura://profile/markdown',
              name: 'Aura ID Markdown Instructions',
              mimeType: 'text/markdown',
            },
          ],
        },
      };
    }

    if (method === 'resources/read') {
      const p = store.get();
      if (params.uri === 'aura://profile/taste-token') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri: params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(createTasteToken(p), null, 2),
              },
            ],
          },
        };
      }
      if (params.uri === 'aura://profile/markdown') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri: params.uri,
                mimeType: 'text/markdown',
                text: asMarkdown(
                  createExport(p, {
                    context: true,
                    communication: true,
                    visual: true,
                    taste: true,
                  })
                ),
              },
            ],
          },
        };
      }
      throw new Error(`Unknown resource URI: ${params.uri}`);
    }

    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
    }

    if (method === 'tools/call') {
      const name = params.name;
      const args = params.arguments || {};
      const current = store.get();

      if (name === 'get_taste_token') {
        const token = createTasteToken(current, {
          domain: args.domain,
          includeNeeds: args.includeNeeds !== false,
        });
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(token, null, 2) }],
          },
        };
      }

      if (name === 'update_taste') {
        const updated = store.set({
          ...current,
          priority: args.priority !== undefined ? args.priority : current.priority,
          taste: args.taste !== undefined ? args.taste : current.taste,
          constraints:
            args.constraints !== undefined ? args.constraints : current.constraints,
          avoid: args.avoid !== undefined ? args.avoid : current.avoid,
        });
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(createTasteToken(updated), null, 2),
              },
            ],
          },
        };
      }

      if (name === 'manage_needs') {
        let items = parseNeeds(current.needs);
        if (args.action === 'add' && args.item) {
          const cleanItem = String(args.item).trim();
          if (cleanItem && !items.includes(cleanItem)) items.push(cleanItem);
        } else if (args.action === 'remove' && args.item) {
          const target = String(args.item).trim().toLowerCase();
          items = items.filter(x => !x.toLowerCase().includes(target));
        } else if (args.action === 'clear') {
          items = [];
        }
        const updated = store.set({ ...current, needs: items.join('\n') });
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { active_needs: parseNeeds(updated.needs) },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (name === 'match_store_catalog') {
        const token = createTasteToken(current);
        const matches = matchCatalog(
          token,
          Array.isArray(args.catalog) ? args.catalog : SAMPLE_STORE_CATALOG
        );
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ token_summary: token.taste_vector, matches }, null, 2),
              },
            ],
          },
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  } catch (err) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: err.message || 'Server error' },
    };
  }
}

function startHttpServer(port, store) {
  const distDir = path.resolve(__dirname, '../dist');
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (req.method === 'GET' && url.pathname === '/.well-known/aura-id.json') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          {
            protocol: 'aura-id',
            version: '0.2',
            endpoints: {
              taste_token: '/api/taste-token',
              needs: '/api/needs',
              store_match: '/api/a2a/store-match',
            },
          },
          null,
          2
        )
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/taste-token') {
      const domain = url.searchParams.get('domain') || 'commerce-and-agents';
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(createTasteToken(store.get(), { domain }), null, 2));
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/needs' || url.pathname === '/api/a2a/store-match')) {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 100000) req.destroy();
      });
      req.on('end', () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          if (url.pathname === '/api/needs') {
            const rpcRes = handleRpcRequest(
              {
                id: 1,
                method: 'tools/call',
                params: { name: 'manage_needs', arguments: payload },
              },
              store
            );
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(rpcRes.result.content[0].text);
            return;
          }
          const token = payload.token || createTasteToken(store.get());
          const catalog = Array.isArray(payload.catalog)
            ? payload.catalog
            : SAMPLE_STORE_CATALOG;
          const matches = matchCatalog(token, catalog);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify(
              {
                schema: 'aura-id/store-match-response',
                privacy_preserved: token.privacy === 'scoped-handshake-no-pii',
                boundaries: token.boundaries,
                matches,
              },
              null,
              2
            )
          );
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    const relPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const safePath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.join(distDir, safePath);
    if (!fullPath.startsWith(distDir) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(fullPath));
  });

  server.listen(port, () => {
    console.error(`Aura ID web app & Agent API listening on http://localhost:${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const profileIdx = args.indexOf('--profile');
  const profilePath = profileIdx !== -1 ? args[profileIdx + 1] : null;
  const httpIdx = args.indexOf('--http');
  const store = createProfileStore(profilePath);

  if (httpIdx !== -1) {
    const port = Number(args[httpIdx + 1]) || 8000;
    startHttpServer(port, store);
  } else {
    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    rl.on('line', line => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line);
        const response = handleRpcRequest(msg, store);
        if (response) process.stdout.write(JSON.stringify(response) + '\n');
      } catch (err) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error' },
          }) + '\n'
        );
      }
    });
  }
}
