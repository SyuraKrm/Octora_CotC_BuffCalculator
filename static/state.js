// state.js
const state = {
  characters: null,
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
      selectedCharacter: null
    }
  },

  effects: []
};
