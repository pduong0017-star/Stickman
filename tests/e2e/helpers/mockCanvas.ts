export interface SerializedGradient {
  __gradient: true;
  kind: 'linear' | 'radial';
  x0: number;
  y0: number;
  r0: number;
  x1: number;
  y1: number;
  r1: number;
  stops: Array<[number, string]>;
}

export interface TessellatedSubpath {
  closed: boolean;
  pts: Array<[number, number]>;
}

export interface DrawCommand {
  op: 'fill' | 'stroke' | 'fillRect' | 'strokeRect' | 'fillText' | 'strokeText';
  subpaths?: TessellatedSubpath[];
  rectPts?: Array<[number, number]>;
  text?: string;
  x?: number;
  y?: number;
  fontSize?: number;
  textAlign?: string;
  style: string | SerializedGradient;
  lineWidth: number;
  lineCap: string;
  lineJoin?: string;
  lineDash?: number[];
  fillRule?: string;
  globalAlpha: number;
  composite: string;
}

export interface TraceMetrics {
  saveCount: number;
  restoreCount: number;
  maxSaveDepth: number;
  unbalancedSaveRestore: boolean;
  shadowBlurUsed: boolean;
  maxShadowBlur: number;
  nanDetected: boolean;
  nanEvents: string[];
  uniqueColors: Set<string>;
  opCounts: Record<string, number>;
  compositeOps: Set<string>;
}

export class MockCanvasGradient {
  public readonly kind: 'linear' | 'radial';
  public readonly x0: number;
  public readonly y0: number;
  public readonly r0: number;
  public readonly x1: number;
  public readonly y1: number;
  public readonly r1: number;
  public readonly stops: Array<[number, string]> = [];
  private onNan: (msg: string) => void;

  constructor(
    kind: 'linear' | 'radial',
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
    onNan: (msg: string) => void
  ) {
    this.kind = kind;
    this.x0 = x0;
    this.y0 = y0;
    this.r0 = r0;
    this.x1 = x1;
    this.y1 = y1;
    this.r1 = r1;
    this.onNan = onNan;
    if (![x0, y0, r0, x1, y1, r1].every(Number.isFinite)) {
      this.onNan(`Non-finite gradient coord (${x0},${y0},${r0},${x1},${y1},${r1})`);
    }
  }

  public addColorStop(offset: number, color: string): void {
    if (!Number.isFinite(offset)) {
      this.onNan(`Non-finite gradient color stop offset: ${offset}`);
      return;
    }
    this.stops.push([Math.max(0, Math.min(1, offset)), String(color)]);
  }
}

interface CtxState {
  matrix: [number, number, number, number, number, number];
  fillStyle: string | MockCanvasGradient;
  strokeStyle: string | MockCanvasGradient;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  globalAlpha: number;
  globalCompositeOperation: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  lineDash: number[];
  shadowBlur: number;
  shadowColor: string;
}

function mulMatrix(
  m: [number, number, number, number, number, number],
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
): [number, number, number, number, number, number] {
  return [
    m[0] * a + m[2] * b,
    m[1] * a + m[3] * b,
    m[0] * c + m[2] * d,
    m[1] * c + m[3] * d,
    m[0] * e + m[2] * f + m[4],
    m[1] * e + m[3] * f + m[5],
  ];
}

function transformPt(
  m: [number, number, number, number, number, number],
  x: number,
  y: number
): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function parseFontSize(font: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  return m ? Math.max(8, Math.round(Number(m[1]))) : 14;
}

export class RecordingContext2D {
  public canvas: MockCanvasElement;
  public commands: DrawCommand[] = [];
  public metrics: TraceMetrics = {
    saveCount: 0,
    restoreCount: 0,
    maxSaveDepth: 0,
    unbalancedSaveRestore: false,
    shadowBlurUsed: false,
    maxShadowBlur: 0,
    nanDetected: false,
    nanEvents: [],
    uniqueColors: new Set<string>(),
    opCounts: {},
    compositeOps: new Set<string>(),
  };

  private stack: CtxState[] = [];
  private state: CtxState;
  private subpaths: TessellatedSubpath[] = [];
  private currentSubpath: TessellatedSubpath | null = null;
  private lastLocalPt: [number, number] = [0, 0];
  public clipCalls = 0;

  constructor(canvas: MockCanvasElement) {
    this.canvas = canvas;
    this.state = this.defaultState();
  }

  private defaultState(): CtxState {
    return {
      matrix: [1, 0, 0, 1, 0, 0],
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      lineDash: [],
      shadowBlur: 0,
      shadowColor: 'rgba(0,0,0,0)',
    };
  }

  public resetTrace(): void {
    this.commands = [];
    this.stack = [];
    this.state = this.defaultState();
    this.subpaths = [];
    this.currentSubpath = null;
    this.lastLocalPt = [0, 0];
    this.clipCalls = 0;
    this.metrics = {
      saveCount: 0,
      restoreCount: 0,
      maxSaveDepth: 0,
      unbalancedSaveRestore: false,
      shadowBlurUsed: false,
      maxShadowBlur: 0,
      nanDetected: false,
      nanEvents: [],
      uniqueColors: new Set<string>(),
      opCounts: {},
      compositeOps: new Set<string>(),
    };
  }

  public getSaveDepth(): number {
    return this.stack.length;
  }

  private flagNan(context: string): void {
    this.metrics.nanDetected = true;
    if (this.metrics.nanEvents.length < 20) {
      this.metrics.nanEvents.push(context);
    }
  }

  private checkFinite(context: string, ...vals: number[]): boolean {
    for (const v of vals) {
      if (!Number.isFinite(v)) {
        this.flagNan(`${context}: ${vals.join(', ')}`);
        return false;
      }
    }
    return true;
  }

  // Properties
  get fillStyle(): string | MockCanvasGradient {
    return this.state.fillStyle;
  }
  set fillStyle(v: string | MockCanvasGradient) {
    this.state.fillStyle = v;
  }

  get strokeStyle(): string | MockCanvasGradient {
    return this.state.strokeStyle;
  }
  set strokeStyle(v: string | MockCanvasGradient) {
    this.state.strokeStyle = v;
  }

  get lineWidth(): number {
    return this.state.lineWidth;
  }
  set lineWidth(v: number) {
    if (!Number.isFinite(v)) {
      this.flagNan(`lineWidth=${v}`);
      return;
    }
    if (v > 0) this.state.lineWidth = v;
  }

  get lineCap(): string {
    return this.state.lineCap;
  }
  set lineCap(v: string) {
    this.state.lineCap = v;
  }

  get lineJoin(): string {
    return this.state.lineJoin;
  }
  set lineJoin(v: string) {
    this.state.lineJoin = v;
  }

  get globalAlpha(): number {
    return this.state.globalAlpha;
  }
  set globalAlpha(v: number) {
    if (!Number.isFinite(v)) {
      this.flagNan(`globalAlpha=${v}`);
      return;
    }
    if (v >= 0 && v <= 1) {
      this.state.globalAlpha = v;
    } else if (v < 0) {
      this.state.globalAlpha = 0;
    } else if (v > 1) {
      this.state.globalAlpha = 1;
    }
  }

  get globalCompositeOperation(): string {
    return this.state.globalCompositeOperation;
  }
  set globalCompositeOperation(v: string) {
    this.state.globalCompositeOperation = v;
  }

  get font(): string {
    return this.state.font;
  }
  set font(v: string) {
    this.state.font = v;
  }

  get textAlign(): string {
    return this.state.textAlign;
  }
  set textAlign(v: string) {
    this.state.textAlign = v;
  }

  get textBaseline(): string {
    return this.state.textBaseline;
  }
  set textBaseline(v: string) {
    this.state.textBaseline = v;
  }

  get shadowBlur(): number {
    return this.state.shadowBlur;
  }
  set shadowBlur(v: number) {
    if (!Number.isFinite(v)) {
      this.flagNan(`shadowBlur=${v}`);
      return;
    }
    this.state.shadowBlur = v;
    if (v > 0) {
      this.metrics.shadowBlurUsed = true;
      this.metrics.maxShadowBlur = Math.max(this.metrics.maxShadowBlur, v);
    }
  }

  get shadowColor(): string {
    return this.state.shadowColor;
  }
  set shadowColor(v: string) {
    this.state.shadowColor = v;
  }

  // State stack & transforms
  public save(): void {
    this.stack.push({
      ...this.state,
      matrix: [...this.state.matrix],
      lineDash: [...this.state.lineDash],
    });
    this.metrics.saveCount++;
    if (this.stack.length > this.metrics.maxSaveDepth) {
      this.metrics.maxSaveDepth = this.stack.length;
    }
    this.metrics.unbalancedSaveRestore = this.metrics.saveCount !== this.metrics.restoreCount;
  }

  public restore(): void {
    this.metrics.restoreCount++;
    const prev = this.stack.pop();
    if (prev) {
      this.state = prev;
    } else {
      this.metrics.unbalancedSaveRestore = true;
    }
    this.metrics.unbalancedSaveRestore =
      this.metrics.saveCount !== this.metrics.restoreCount || this.metrics.unbalancedSaveRestore && this.stack.length > 0;
  }

  public translate(x: number, y: number): void {
    if (!this.checkFinite('translate', x, y)) return;
    this.state.matrix = mulMatrix(this.state.matrix, 1, 0, 0, 1, x, y);
  }

  public scale(sx: number, sy: number): void {
    if (!this.checkFinite('scale', sx, sy)) return;
    this.state.matrix = mulMatrix(this.state.matrix, sx, 0, 0, sy, 0, 0);
  }

  public rotate(angle: number): void {
    if (!this.checkFinite('rotate', angle)) return;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    this.state.matrix = mulMatrix(this.state.matrix, c, s, -s, c, 0, 0);
  }

  public transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    if (!this.checkFinite('transform', a, b, c, d, e, f)) return;
    this.state.matrix = mulMatrix(this.state.matrix, a, b, c, d, e, f);
  }

  public setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    if (!this.checkFinite('setTransform', a, b, c, d, e, f)) return;
    this.state.matrix = [a, b, c, d, e, f];
  }

  public resetTransform(): void {
    this.state.matrix = [1, 0, 0, 1, 0, 0];
  }

  public setLineDash(segments: number[]): void {
    if (!Array.isArray(segments)) {
      this.state.lineDash = [];
      return;
    }
    for (const seg of segments) {
      if (!Number.isFinite(seg) || seg < 0) {
        this.flagNan(`setLineDash invalid segment: ${seg}`);
        return;
      }
    }
    this.state.lineDash = [...segments];
  }

  public getLineDash(): number[] {
    return [...this.state.lineDash];
  }

  public createLinearGradient(x0: number, y0: number, x1: number, y1: number): MockCanvasGradient {
    return new MockCanvasGradient('linear', x0, y0, 0, x1, y1, 0, (msg) => this.flagNan(msg));
  }

  public createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): MockCanvasGradient {
    const safeR0 = Math.max(0, r0);
    const safeR1 = Math.max(0, r1);
    if (r0 < 0 || r1 < 0) {
      this.flagNan(`Negative radial gradient radius (${r0}, ${r1})`);
    }
    return new MockCanvasGradient('radial', x0, y0, safeR0, x1, y1, safeR1, (msg) => this.flagNan(msg));
  }

  public measureText(text: string): { width: number } {
    return { width: String(text).length * (parseFontSize(this.state.font) * 0.55) };
  }

  public clearRect(x: number, y: number, w: number, h: number): void {
    this.checkFinite('clearRect', x, y, w, h);
    // Recorded as no-op for trace buffer; canvas remains clean
  }

  public clip(_fillRule?: string): void {
    this.clipCalls++;
  }

  public drawImage(_image: unknown, ...args: number[]): void {
    const nums = args.filter((v) => typeof v === 'number');
    this.checkFinite('drawImage', ...nums);
  }

  // Path building with screen-space tessellation
  public beginPath(): void {
    this.subpaths = [];
    this.currentSubpath = null;
  }

  private ensureSubpath(x: number, y: number): TessellatedSubpath {
    if (!this.currentSubpath) {
      this.currentSubpath = {
        closed: false,
        pts: [transformPt(this.state.matrix, x, y)],
      };
      this.subpaths.push(this.currentSubpath);
      this.lastLocalPt = [x, y];
    }
    return this.currentSubpath;
  }

  public moveTo(x: number, y: number): void {
    if (!this.checkFinite('moveTo', x, y)) return;
    this.currentSubpath = {
      closed: false,
      pts: [transformPt(this.state.matrix, x, y)],
    };
    this.subpaths.push(this.currentSubpath);
    this.lastLocalPt = [x, y];
  }

  public lineTo(x: number, y: number): void {
    if (!this.checkFinite('lineTo', x, y)) return;
    const sp = this.ensureSubpath(x, y);
    sp.pts.push(transformPt(this.state.matrix, x, y));
    this.lastLocalPt = [x, y];
  }

  public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    if (!this.checkFinite('quadraticCurveTo', cpx, cpy, x, y)) return;
    const [x0, y0] = this.lastLocalPt;
    const sp = this.ensureSubpath(x0, y0);
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const px = mt * mt * x0 + 2 * mt * t * cpx + t * t * x;
      const py = mt * mt * y0 + 2 * mt * t * cpy + t * t * y;
      sp.pts.push(transformPt(this.state.matrix, px, py));
    }
    this.lastLocalPt = [x, y];
  }

  public bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void {
    if (!this.checkFinite('bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y)) return;
    const [x0, y0] = this.lastLocalPt;
    const sp = this.ensureSubpath(x0, y0);
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const px =
        mt * mt * mt * x0 +
        3 * mt * mt * t * cp1x +
        3 * mt * t * t * cp2x +
        t * t * t * x;
      const py =
        mt * mt * mt * y0 +
        3 * mt * mt * t * cp1y +
        3 * mt * t * t * cp2y +
        t * t * t * y;
      sp.pts.push(transformPt(this.state.matrix, px, py));
    }
    this.lastLocalPt = [x, y];
  }

  public arc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
    ccw = false
  ): void {
    if (!this.checkFinite('arc', cx, cy, r, startAngle, endAngle)) return;
    if (r < 0) {
      this.flagNan(`arc negative radius: ${r}`);
      return;
    }
    let sweep = endAngle - startAngle;
    const TAU = Math.PI * 2;
    if (ccw) {
      if (sweep > 0) sweep = (sweep % TAU) - TAU;
      if (sweep === 0 && endAngle !== startAngle) sweep = -TAU;
      if (sweep < -TAU) sweep = -TAU;
    } else {
      if (sweep < 0) sweep = (sweep % TAU) + TAU;
      if (sweep === 0 && endAngle !== startAngle) sweep = TAU;
      if (sweep > TAU) sweep = TAU;
    }
    const steps = Math.max(12, Math.ceil(Math.abs(sweep) * 16));
    const sx = cx + Math.cos(startAngle) * r;
    const sy = cy + Math.sin(startAngle) * r;
    if (!this.currentSubpath) {
      this.currentSubpath = {
        closed: false,
        pts: [transformPt(this.state.matrix, sx, sy)],
      };
      this.subpaths.push(this.currentSubpath);
    } else {
      this.currentSubpath.pts.push(transformPt(this.state.matrix, sx, sy));
    }
    for (let i = 1; i <= steps; i++) {
      const a = startAngle + (sweep * i) / steps;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      this.currentSubpath.pts.push(transformPt(this.state.matrix, px, py));
    }
    this.lastLocalPt = [cx + Math.cos(startAngle + sweep) * r, cy + Math.sin(startAngle + sweep) * r];
  }

  public ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    ccw = false
  ): void {
    if (!this.checkFinite('ellipse', cx, cy, rx, ry, rotation, startAngle, endAngle)) return;
    if (rx < 0 || ry < 0) {
      this.flagNan(`ellipse negative radius: (${rx}, ${ry})`);
      return;
    }
    let sweep = endAngle - startAngle;
    const TAU = Math.PI * 2;
    if (ccw) {
      if (sweep > 0) sweep = (sweep % TAU) - TAU;
      if (sweep < -TAU) sweep = -TAU;
    } else {
      if (sweep < 0) sweep = (sweep % TAU) + TAU;
      if (sweep > TAU) sweep = TAU;
    }
    const steps = Math.max(12, Math.ceil(Math.abs(sweep) * 16));
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const evalPt = (a: number): [number, number] => {
      const lx = Math.cos(a) * rx;
      const ly = Math.sin(a) * ry;
      return [cx + lx * cosR - ly * sinR, cy + lx * sinR + ly * cosR];
    };
    const [sx, sy] = evalPt(startAngle);
    if (!this.currentSubpath) {
      this.currentSubpath = {
        closed: false,
        pts: [transformPt(this.state.matrix, sx, sy)],
      };
      this.subpaths.push(this.currentSubpath);
    } else {
      this.currentSubpath.pts.push(transformPt(this.state.matrix, sx, sy));
    }
    for (let i = 1; i <= steps; i++) {
      const a = startAngle + (sweep * i) / steps;
      const [px, py] = evalPt(a);
      this.currentSubpath.pts.push(transformPt(this.state.matrix, px, py));
    }
    this.lastLocalPt = evalPt(startAngle + sweep);
  }

  public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    if (!this.checkFinite('arcTo', x1, y1, x2, y2, radius)) return;
    if (radius < 0) {
      this.flagNan(`arcTo negative radius: ${radius}`);
      return;
    }
    const [x0, y0] = this.lastLocalPt;
    this.ensureSubpath(x0, y0);
    const v1x = x0 - x1;
    const v1y = y0 - y1;
    const v2x = x2 - x1;
    const v2y = y2 - y1;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (radius === 0 || len1 < 1e-6 || len2 < 1e-6) {
      this.lineTo(x1, y1);
      return;
    }
    const u1x = v1x / len1;
    const u1y = v1y / len1;
    const u2x = v2x / len2;
    const u2y = v2y / len2;
    const cross = u1x * u2y - u1y * u2x;
    if (Math.abs(cross) < 1e-6) {
      this.lineTo(x1, y1);
      return;
    }
    const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
    const halfAngle = Math.acos(dot) * 0.5;
    const dist = radius / Math.tan(halfAngle);
    const t1x = x1 + u1x * dist;
    const t1y = y1 + u1y * dist;
    const t2x = x1 + u2x * dist;
    const t2y = y1 + u2y * dist;
    this.lineTo(t1x, t1y);

    let nx = -u1y;
    let ny = u1x;
    if (nx * u2x + ny * u2y < 0) {
      nx = -nx;
      ny = -ny;
    }
    const cx = t1x + nx * radius;
    const cy = t1y + ny * radius;
    const startAngle = Math.atan2(t1y - cy, t1x - cx);
    const endAngle = Math.atan2(t2y - cy, t2x - cx);
    this.arc(cx, cy, radius, startAngle, endAngle, cross > 0);
  }

  public rect(x: number, y: number, w: number, h: number): void {
    if (!this.checkFinite('rect', x, y, w, h)) return;
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  public roundRect(x: number, y: number, w: number, h: number, radii?: number | number[]): void {
    if (!this.checkFinite('roundRect', x, y, w, h)) return;
    if (typeof radii === 'number' && !this.checkFinite('roundRect.radii', radii)) return;
    if (Array.isArray(radii)) {
      for (const r of radii) {
        if (typeof r === 'number' && !this.checkFinite('roundRect.radii', r)) return;
      }
    }
    this.rect(x, y, w, h);
  }

  public closePath(): void {
    if (this.currentSubpath) {
      this.currentSubpath.closed = true;
      if (this.currentSubpath.pts.length > 0) {
        const first = this.currentSubpath.pts[0];
        this.currentSubpath.pts.push([first[0], first[1]]);
      }
    }
  }

  private serializeStyle(style: string | MockCanvasGradient): string | SerializedGradient {
    if (typeof style === 'string') {
      this.metrics.uniqueColors.add(style.toLowerCase());
      return style;
    }
    const [tx0, ty0] = transformPt(this.state.matrix, style.x0, style.y0);
    const [tx1, ty1] = transformPt(this.state.matrix, style.x1, style.y1);
    const scaleApprox = Math.hypot(this.state.matrix[0], this.state.matrix[1]);
    for (const [, c] of style.stops) {
      this.metrics.uniqueColors.add(c.toLowerCase());
    }
    return {
      __gradient: true,
      kind: style.kind,
      x0: tx0,
      y0: ty0,
      r0: style.r0 * scaleApprox,
      x1: tx1,
      y1: ty1,
      r1: style.r1 * scaleApprox,
      stops: style.stops.map(([off, col]) => [off, col]),
    };
  }

  private recordOp(op: DrawCommand['op']): void {
    this.metrics.opCounts[op] = (this.metrics.opCounts[op] ?? 0) + 1;
    this.metrics.compositeOps.add(this.state.globalCompositeOperation);
  }

  public fill(fillRule?: string): void {
    if (this.subpaths.length === 0) return;
    this.recordOp('fill');
    this.commands.push({
      op: 'fill',
      subpaths: this.subpaths.map((sp) => ({
        closed: sp.closed,
        pts: sp.pts.map(([x, y]) => [x, y]),
      })),
      style: this.serializeStyle(this.state.fillStyle),
      lineWidth: this.state.lineWidth,
      lineCap: this.state.lineCap,
      lineJoin: this.state.lineJoin,
      fillRule: fillRule ?? 'nonzero',
      globalAlpha: this.state.globalAlpha,
      composite: this.state.globalCompositeOperation,
    });
  }

  public stroke(): void {
    if (this.subpaths.length === 0) return;
    this.recordOp('stroke');
    this.commands.push({
      op: 'stroke',
      subpaths: this.subpaths.map((sp) => ({
        closed: sp.closed,
        pts: sp.pts.map(([x, y]) => [x, y]),
      })),
      style: this.serializeStyle(this.state.strokeStyle),
      lineWidth: this.state.lineWidth * Math.max(0.5, Math.hypot(this.state.matrix[0], this.state.matrix[1])),
      lineCap: this.state.lineCap,
      lineJoin: this.state.lineJoin,
      lineDash: this.state.lineDash.length > 0 ? [...this.state.lineDash] : undefined,
      globalAlpha: this.state.globalAlpha,
      composite: this.state.globalCompositeOperation,
    });
  }

  public fillRect(x: number, y: number, w: number, h: number): void {
    if (!this.checkFinite('fillRect', x, y, w, h)) return;
    this.recordOp('fillRect');
    const rectPts: Array<[number, number]> = [
      transformPt(this.state.matrix, x, y),
      transformPt(this.state.matrix, x + w, y),
      transformPt(this.state.matrix, x + w, y + h),
      transformPt(this.state.matrix, x, y + h),
    ];
    this.commands.push({
      op: 'fillRect',
      rectPts,
      style: this.serializeStyle(this.state.fillStyle),
      lineWidth: this.state.lineWidth,
      lineCap: this.state.lineCap,
      globalAlpha: this.state.globalAlpha,
      composite: this.state.globalCompositeOperation,
    });
  }

  public strokeRect(x: number, y: number, w: number, h: number): void {
    if (!this.checkFinite('strokeRect', x, y, w, h)) return;
    this.recordOp('strokeRect');
    const rectPts: Array<[number, number]> = [
      transformPt(this.state.matrix, x, y),
      transformPt(this.state.matrix, x + w, y),
      transformPt(this.state.matrix, x + w, y + h),
      transformPt(this.state.matrix, x, y + h),
    ];
    this.commands.push({
      op: 'strokeRect',
      rectPts,
      style: this.serializeStyle(this.state.strokeStyle),
      lineWidth: this.state.lineWidth,
      lineCap: this.state.lineCap,
      lineJoin: this.state.lineJoin,
      lineDash: this.state.lineDash.length > 0 ? [...this.state.lineDash] : undefined,
      globalAlpha: this.state.globalAlpha,
      composite: this.state.globalCompositeOperation,
    });
  }

  public fillText(text: string, x: number, y: number): void {
    if (!this.checkFinite('fillText', x, y)) return;
    this.recordOp('fillText');
    const [tx, ty] = transformPt(this.state.matrix, x, y);
    const scaleApprox = Math.max(0.5, Math.hypot(this.state.matrix[0], this.state.matrix[1]));
    this.commands.push({
      op: 'fillText',
      text: String(text),
      x: tx,
      y: ty,
      fontSize: Math.max(8, Math.round(parseFontSize(this.state.font) * scaleApprox)),
      textAlign: this.state.textAlign,
      style: this.serializeStyle(this.state.fillStyle),
      lineWidth: this.state.lineWidth,
      lineCap: this.state.lineCap,
      globalAlpha: this.state.globalAlpha,
      composite: this.state.globalCompositeOperation,
    });
  }

  public strokeText(text: string, x: number, y: number): void {
    if (!this.checkFinite('strokeText', x, y)) return;
    this.recordOp('strokeText');
    const [tx, ty] = transformPt(this.state.matrix, x, y);
    const scaleApprox = Math.max(0.5, Math.hypot(this.state.matrix[0], this.state.matrix[1]));
    this.commands.push({
      op: 'strokeText',
      text: String(text),
      x: tx,
      y: ty,
      fontSize: Math.max(8, Math.round(parseFontSize(this.state.font) * scaleApprox)),
      textAlign: this.state.textAlign,
      style: this.serializeStyle(this.state.strokeStyle),
      lineWidth: this.state.lineWidth,
      lineCap: this.state.lineCap,
      globalAlpha: this.state.globalAlpha,
      composite: this.state.globalCompositeOperation,
    });
  }

  /**
   * Deterministic structural + palette signature for comparing two rendered scenes.
   */
  public getTraceSignature(): string {
    const colors = Array.from(this.metrics.uniqueColors).sort().join(',');
    const ops = Object.entries(this.metrics.opCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const totalPts = this.commands.reduce((acc, c) => {
      if (c.subpaths) {
        return acc + c.subpaths.reduce((s, sp) => s + sp.pts.length, 0);
      }
      return acc + (c.rectPts ? 4 : 1);
    }, 0);
    return `colors=[${colors}]::ops=[${ops}]::cmds=${this.commands.length}::pts=${totalPts}`;
  }
}

export class MockCanvasElement {
  public width: number;
  public height: number;
  public style: Record<string, string> = {};
  public readonly ctx: RecordingContext2D;

  constructor(width = 1280, height = 720) {
    this.width = width;
    this.height = height;
    this.ctx = new RecordingContext2D(this);
  }

  public getContext(type: string): CanvasRenderingContext2D | null {
    if (type !== '2d') return null;
    return this.ctx as unknown as CanvasRenderingContext2D;
  }

  public getBoundingClientRect(): { width: number; height: number; left: number; top: number } {
    return { width: this.width, height: this.height, left: 0, top: 0 };
  }

  public addEventListener(): void {}
  public removeEventListener(): void {}
}

// =========================================================================
// Node DOM / Window / localStorage / rAF Shim
// =========================================================================

class MockStorage {
  private map = new Map<string, string>();
  public getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  public setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  public removeItem(key: string): void {
    this.map.delete(key);
  }
  public clear(): void {
    this.map.clear();
  }
}

let rafSeq = 1;
const rafQueue = new Map<number, (now: number) => void>();
let simNowMs = 1000;
const storageSingleton = new MockStorage();

export function installDomShims(opts?: {
  innerWidth?: number;
  innerHeight?: number;
  devicePixelRatio?: number;
  search?: string;
}): {
  localStorage: MockStorage;
  flushAnimationFrames: (count?: number, stepMs?: number) => number;
  clearRafQueue: () => void;
} {
  const g = globalThis as Record<string, unknown>;

  if (typeof g.HTMLElement === 'undefined') {
    g.HTMLElement = class MockHTMLElement {
      public blur(): void {}
    };
  }

  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const addEv = (type: string, fn: (...args: unknown[]) => void) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(fn);
  };
  const remEv = (type: string, fn: (...args: unknown[]) => void) => {
    listeners.get(type)?.delete(fn);
  };

  const mockWindow = {
    innerWidth: opts?.innerWidth ?? 1280,
    innerHeight: opts?.innerHeight ?? 720,
    devicePixelRatio: opts?.devicePixelRatio ?? 1,
    localStorage: storageSingleton,
    location: { search: opts?.search ?? '' },
    visualViewport: {
      addEventListener: addEv,
      removeEventListener: remEv,
    },
    addEventListener: addEv,
    removeEventListener: remEv,
    requestAnimationFrame: (cb: (now: number) => void): number => {
      const id = rafSeq++;
      rafQueue.set(id, cb);
      return id;
    },
    cancelAnimationFrame: (id: number): void => {
      rafQueue.delete(id);
    },
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    AudioContext: undefined,
    webkitAudioContext: undefined,
  };

  const mockDocument = {
    body: { dataset: {} as Record<string, string> },
    activeElement: null as unknown,
    fullscreenEnabled: false,
    fullscreenElement: null as unknown,
    documentElement: {},
    addEventListener: addEv,
    removeEventListener: remEv,
    createElement: (tag: string) => {
      if (tag === 'canvas') return new MockCanvasElement();
      return { style: {}, dataset: {} };
    },
  };

  // Never overwrite read-only globalThis.navigator in Node 26
  g.window = mockWindow;
  g.document = mockDocument;

  return {
    localStorage: storageSingleton,
    flushAnimationFrames(count = 1, stepMs = 16.6667): number {
      let ran = 0;
      for (let i = 0; i < count; i++) {
        simNowMs += stepMs;
        const batch = Array.from(rafQueue.entries());
        rafQueue.clear();
        for (const [, cb] of batch) {
          cb(simNowMs);
          ran++;
        }
      }
      return ran;
    },
    clearRafQueue() {
      rafQueue.clear();
    },
  };
}
