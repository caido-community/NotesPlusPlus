<template>
  <div
    class="dropdown-menu bg-surface-800 rounded-sm shadow-md border border-surface-700 p-0.5 max-h-52 overflow-y-auto w-64"
  >
    <div class="p-1 text-xs font-medium text-surface-300">
      Select a hosted file
    </div>
    <div class="h-px bg-surface-700 mb-1"></div>
    <template v-if="items.length">
      <button
        v-for="(item, index) in items"
        :key="index"
        class="w-full text-left px-2 py-1.5 text-sm hover:bg-surface-700 rounded-sm transition-colors text-surface-200 flex items-center gap-2"
        :class="{ 'bg-surface-600 text-surface-100': index === selectedIndex }"
        @click="selectItem(index)"
      >
        <i class="fas fa-file text-primary-500 text-xs"></i>
        <div class="flex-1 overflow-hidden">
          <div class="truncate">{{ item.name }}</div>
          <div class="text-xs text-surface-400">
            {{ formatSize(item.size) }}
          </div>
        </div>
      </button>
    </template>
    <div v-else class="px-2 py-2 text-sm text-surface-400 text-center">
      No files found
    </div>
  </div>
</template>

<script>
export default {
  props: {
    items: {
      type: Array,
      required: true,
    },
    command: {
      type: Function,
      required: true,
    },
  },

  data() {
    return {
      selectedIndex: 0,
    };
  },

  watch: {
    items() {
      this.selectedIndex = 0;
    },
  },

  methods: {
    formatSize(bytes) {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    },

    onKeyDown({ event }) {
      if (event.key === "ArrowUp") {
        this.upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        this.downHandler();
        return true;
      }

      if (event.key === "Enter") {
        this.enterHandler();
        return true;
      }

      return false;
    },

    upHandler() {
      this.selectedIndex =
        (this.selectedIndex + this.items.length - 1) % this.items.length;
    },

    downHandler() {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    },

    enterHandler() {
      this.selectItem(this.selectedIndex);
    },

    selectItem(index) {
      const item = this.items[index];
      if (item) {
        this.command(item);
      }
    },
  },
};
</script>
