const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'todos.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readTodos() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeTodos(todos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
}

// GET /api/todos
app.get('/api/todos', (req, res) => {
  res.json(readTodos());
});

// POST /api/todos
app.post('/api/todos', (req, res) => {
  const { text, assignee = '', color = '', urgent = false } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });

  const todo = {
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false,
    urgent: !!urgent,
    color: color || '',
    assignee: assignee || '',
    createdAt: new Date().toISOString()
  };

  const todos = readTodos();
  todos.push(todo);
  writeTodos(todos);
  res.status(201).json(todo);
});

// PATCH /api/todos/:id
app.patch('/api/todos/:id', (req, res) => {
  const todos = readTodos();
  const idx = todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });

  const allowed = ['done', 'urgent', 'color', 'text', 'assignee'];
  for (const key of allowed) {
    if (key in req.body) todos[idx][key] = req.body[key];
  }
  writeTodos(todos);
  res.json(todos[idx]);
});

// DELETE /api/todos/:id
app.delete('/api/todos/:id', (req, res) => {
  const todos = readTodos();
  const idx = todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });

  todos.splice(idx, 1);
  writeTodos(todos);
  res.status(204).end();
});

// POST /api/todos/import
app.post('/api/todos/import', (req, res) => {
  const incoming = req.body;
  if (!Array.isArray(incoming)) return res.status(400).json({ error: 'expected array' });

  const current = readTodos();
  const existingIds = new Set(current.map(t => t.id));
  const existingTexts = new Set(current.map(t => t.text.trim().toLowerCase()));

  for (const todo of incoming) {
    if (!todo.id || !todo.text) continue;
    if (existingIds.has(todo.id)) continue;
    if (existingTexts.has(todo.text.trim().toLowerCase())) continue;
    current.push(todo);
    existingIds.add(todo.id);
    existingTexts.add(todo.text.trim().toLowerCase());
  }

  writeTodos(current);
  res.json(current);
});

app.listen(PORT, () => {
  console.log(`Shared To-Do List running on http://localhost:${PORT}`);
});
