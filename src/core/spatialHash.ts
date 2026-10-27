/**
 * Uniform-grid spatial hash over a bounded arena, rebuilt every tick.
 * Stores integer ids (indices into the caller's entity array) in linked
 * lists held in typed arrays, so a rebuild allocates nothing.
 *
 * Big entities (bosses) are inserted into every cell their bounding box
 * overlaps; queries de-duplicate with a per-query stamp.
 */
export class SpatialHash {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  private head: Int32Array;
  private next: Int32Array;
  private ids: Int32Array;
  private count = 0;
  private stamps: Uint32Array;
  private stamp = 1;

  constructor(width: number, height: number, cell: number, maxEntries = 8192, maxIds = 4096) {
    this.cell = cell;
    this.cols = Math.ceil(width / cell) + 1;
    this.rows = Math.ceil(height / cell) + 1;
    this.head = new Int32Array(this.cols * this.rows).fill(-1);
    this.next = new Int32Array(maxEntries);
    this.ids = new Int32Array(maxEntries);
    this.stamps = new Uint32Array(maxIds);
  }

  clear(): void {
    this.head.fill(-1);
    this.count = 0;
  }

  private cellIndex(cx: number, cy: number): number {
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  private push(cellIdx: number, id: number): void {
    if (this.count >= this.ids.length) return; // full: silently drop (never happens at our caps)
    const n = this.count++;
    this.ids[n] = id;
    this.next[n] = this.head[cellIdx];
    this.head[cellIdx] = n;
  }

  insert(id: number, x: number, y: number, r = 0): void {
    const c = this.cell;
    if (r <= c * 0.5) {
      this.push(this.cellIndex(Math.floor(x / c), Math.floor(y / c)), id);
      return;
    }
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) this.push(this.cellIndex(cx, cy), id);
  }

  /**
   * Collect ids whose cell overlaps the query circle into `out` (cleared first).
   * Caller does the precise distance test. Returns count.
   */
  query(x: number, y: number, r: number, out: number[]): number {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    const stamp = ++this.stamp;
    if (stamp === 0xffffffff) {
      this.stamps.fill(0);
      this.stamp = 1;
    }
    for (let cy = Math.max(0, y0); cy <= Math.min(this.rows - 1, y1); cy++) {
      for (let cx = Math.max(0, x0); cx <= Math.min(this.cols - 1, x1); cx++) {
        let n = this.head[cy * this.cols + cx];
        while (n !== -1) {
          const id = this.ids[n];
          if (id < this.stamps.length) {
            if (this.stamps[id] !== this.stamp) {
              this.stamps[id] = this.stamp;
              out.push(id);
            }
          } else out.push(id);
          n = this.next[n];
        }
      }
    }
    return out.length;
  }
}
