export type SpellKind = 'dash' | 'nova' | 'timeSlow' | 'heal' | 'magnet' | 'summon';

export interface SpellDef {
  id: string;
  name: string;
  kind: SpellKind;
  desc: string;
  cooldown: number;
  color: number;
}

export const SPELLS: Record<string, SpellDef> = {
  aegis_dash: {
    id: 'aegis_dash',
    name: 'Aegis Dash',
    kind: 'dash',
    desc: 'Dash forward, untouchable, slicing through the swarm.',
    cooldown: 5,
    color: 0x6ff3ff,
  },
  nova_burst: {
    id: 'nova_burst',
    name: 'Nova Burst',
    kind: 'nova',
    desc: 'Detonate a ring of starfire around you that hurls enemies back.',
    cooldown: 9,
    color: 0xffb330,
  },
  chrono_hush: {
    id: 'chrono_hush',
    name: 'Chrono Hush',
    kind: 'timeSlow',
    desc: 'Slow every enemy and enemy shot to a crawl for a few seconds.',
    cooldown: 18,
    color: 0x9b7bff,
  },
  mending_pulse: {
    id: 'mending_pulse',
    name: 'Mending Pulse',
    kind: 'heal',
    desc: 'Restore a third of your health over two seconds.',
    cooldown: 22,
    color: 0x7dff8a,
  },
  gem_tempest: {
    id: 'gem_tempest',
    name: 'Gem Tempest',
    kind: 'magnet',
    desc: 'Pull every gem and coin on the map straight to you.',
    cooldown: 30,
    color: 0x59f3ff,
  },
  void_pact: {
    id: 'void_pact',
    name: 'Void Pact',
    kind: 'summon',
    desc: 'Call six void spirits to fight beside you for eight seconds.',
    cooldown: 20,
    color: 0xc46dff,
  },
};

export const SPELL_IDS = Object.keys(SPELLS);
