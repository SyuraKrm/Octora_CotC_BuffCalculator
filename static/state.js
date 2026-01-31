// state.js
const state = {
  characters: null,
  capGroupIndex: null,
  
  highlightIndex: null,
  currentImpact: "offense",

  party: Array.from({ length: 8 }, (_, i) => ({
    slotIndex: i,
    character_id: null,
    selected_abilities: {
      battle: [],
      //ex: [],
      //support: []
    }
  })),

  ui: {
    abilityModal: {
      open: false,
      slotIndex: null,      // どのスロットのモーダルか
      tab: "battle"    // battle / ex / support
    },
    characterSelectorOpen: false,
    openSelectorWrapper: null,
    filters: {
      tab: "attack",
      stackGroup: "battle",
      scope: "both",
      selectedCharacter: null,
      attackCategory: "ALL",
    },
    highlightSettings: {
      cap_groups: [],
      stack_groups: ["battle"],
      view_only_highlights: false,
    },
    settingsModal: {
      open: false,
    },
    tooltip: {
      tooltipRAF: false,
      lastMouseEvent: null
    },
  },

  effects: []
};
