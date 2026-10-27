import { Particle, ParticleContainer, type Texture } from 'pixi.js';

/** Particle with its index in the layer for O(1) swap-removal. */
export class PP extends Particle {
  li = -1;
}

/**
 * A batched layer of sprites sharing one atlas. add/remove are O(1); a free
 * list makes it an object pool too.
 */
export class PLayer {
  readonly pc: ParticleContainer<PP>;
  private free: PP[] = [];

  constructor(texture: Texture, opts: { blend?: 'add' | 'normal'; dynamicScale?: boolean; rotation?: boolean } = {}) {
    this.pc = new ParticleContainer<PP>({
      texture,
      dynamicProperties: { position: true, rotation: opts.rotation ?? true, color: true, uvs: true, vertex: opts.dynamicScale ?? true },
      roundPixels: false,
    });
    if (opts.blend === 'add') this.pc.blendMode = 'add';
  }

  get count(): number {
    return this.pc.particleChildren.length;
  }

  acquire(tex: Texture, x: number, y: number): PP {
    const p = this.free.pop() ?? new PP({ texture: tex, anchorX: 0.5, anchorY: 0.5 });
    p.texture = tex;
    p.x = x;
    p.y = y;
    p.scaleX = 1;
    p.scaleY = 1;
    p.rotation = 0;
    p.alpha = 1;
    p.tint = 0xffffff;
    p.anchorX = 0.5;
    p.anchorY = 0.5;
    const arr = this.pc.particleChildren;
    p.li = arr.length;
    arr.push(p);
    this.pc.update();
    return p;
  }

  release(p: PP): void {
    const arr = this.pc.particleChildren;
    const i = p.li;
    if (i < 0 || arr[i] !== p) return;
    const last = arr.pop()!;
    if (last !== p) {
      arr[i] = last;
      last.li = i;
    }
    p.li = -1;
    this.free.push(p);
    this.pc.update();
  }

  clear(): void {
    for (const p of this.pc.particleChildren) {
      p.li = -1;
      this.free.push(p);
    }
    this.pc.particleChildren.length = 0;
    this.pc.update();
  }
}
