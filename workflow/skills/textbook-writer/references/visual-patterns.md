# Visual Patterns for guide.html

## When to Use Visuals

| Concept type | Visual | Why |
|-------------|--------|-----|
| Spatial relationships (prototype chains, trees, linked lists) | SVG diagram | Spatial reasoning > text parsing |
| Temporal processes (execution order, state changes, data flow) | CSS/JS animation | Sequence becomes visible motion |
| Comparisons (call vs apply vs bind) | Side-by-side layout | Instant diff perception |
| Interactive verification ("try changing this param") | Editable code + live output | Trial-and-error is fastest learning |

## Pattern 1: Step-by-Step Reveal

Use CSS `max-height` transitions to show/hide content progressively. Each click reveals one concept.

```html
<div class="step" onclick="this.classList.toggle('active')">
  <div class="step-header">Step 1: ...</div>
  <div class="step-body">
    <!-- content hidden until .active -->
  </div>
</div>
<style>
.step-body { max-height: 0; overflow: hidden; transition: max-height 0.4s; }
.step.active .step-body { max-height: 2000px; }
</style>
```

## Pattern 2: Animated Object Attachment

Show a function being "attached" to an object, called, then removed. Use CSS keyframes.

```css
@keyframes attach-call-remove {
  0%   { transform: translateX(0); opacity: 1; }
  30%  { transform: translateX(100px); opacity: 1; }  /* move to object */
  60%  { transform: translateX(100px); opacity: 1; }  /* execute */
  100% { transform: translateX(100px); opacity: 0; }  /* delete */
}
```

## Pattern 3: Prototype Chain Diagram

SVG with arrows showing inheritance direction.

```html
<svg viewBox="0 0 600 80">
  <rect x="10" y="10" width="120" height="40" rx="8" fill="#1a1a24" stroke="#6c8cff"/>
  <text x="70" y="35" text-anchor="middle" fill="#e4e4ef" font-size="13">p</text>
  <!-- arrow -->
  <line x1="130" y1="30" x2="170" y2="30" stroke="#6c8cff" marker-end="url(#arrow)"/>
  <!-- next node... -->
</svg>
```

## Pattern 4: Code Diff Highlight

Show before/after with only the changed line highlighted.

```html
<pre><code><span class="removed">- const context = thisArg</span>
<span class="added">+ const context = this instanceof bound ? this : thisArg</span></code></pre>
<style>
.removed { background: rgba(248,113,113,0.15); color: #f87171; }
.added { background: rgba(74,222,128,0.15); color: #4ade80; }
</style>
```

## Pattern 5: Runnable Code Snippet

Embed a `<textarea>` for code and a `<button>` that evals it into an output div.

```html
<textarea id="code">const obj = { name: 'Alice' };
function hi() { return this.name; }
console.log(hi.myCall(obj));</textarea>
<button onclick="run()">Run</button>
<pre id="out"></pre>
<script>
function run() {
  const log = [];
  const orig = console.log;
  console.log = (...a) => log.push(a.join(' '));
  try { new Function(document.getElementById('code').value)(); }
  catch(e) { log.push('Error: ' + e.message); }
  console.log = orig;
  document.getElementById('out').textContent = log.join('\n');
}
</script>
```

## Design Constraints

- Single HTML file, zero external dependencies
- Dark theme (bg: #0f0f13, text: #e4e4ef, accent: #6c8cff)
- Mobile responsive (max-width: 640px breakpoints)
- Each visual corresponds to exactly one concept
- No decorative-only elements
