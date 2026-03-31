<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-app overflow-hidden">

      <!-- Ambient orbs -->
      <div class="float-orb pointer-events-none fixed w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 bg-gradient-radial from-accent to-transparent -top-40 -left-40" />
      <div class="float-orb pointer-events-none fixed w-[500px] h-[500px] rounded-full blur-[100px] opacity-10 bg-gradient-radial from-accent3 to-transparent -bottom-32 -right-32" style="animation-delay:-4s" />

      <!-- Card -->
      <div class="relative w-full max-w-md px-6">

        <!-- Step dots -->
        <div class="flex justify-center gap-2 mb-10">
          <span
            v-for="i in TOTAL_STEPS" :key="i"
            class="rounded-full transition-all duration-300"
            :class="step === i ? 'w-6 h-2 bg-accent' : 'w-2 h-2 bg-fg/15'"
          />
        </div>

        <!-- ── Step 1: Welcome ── -->
        <Transition name="step" mode="out-in">
          <div v-if="step === 1" key="1" class="text-center flex flex-col items-center gap-6">
            <div class="w-20 h-20 rounded-[28px] bg-accent/15 border border-accent/25 flex items-center justify-center shadow-glow">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-accent2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-semibold text-fg/90 tracking-tight">Welcome</h1>
              <p class="text-fg/40 mt-2 text-sm leading-relaxed">
                A fast, minimal browser built<br>around the way you work.
              </p>
            </div>
            <button class="btn-primary mt-2" @click="step = 2">Get started</button>
          </div>
        </Transition>

        <!-- ── Step 2: Name ── -->
        <Transition name="step" mode="out-in">
          <div v-if="step === 2" key="2" class="flex flex-col items-center gap-6">
            <div class="text-center">
              <h2 class="text-2xl font-semibold text-fg/90 tracking-tight">What's your name?</h2>
              <p class="text-fg/35 mt-2 text-sm">We'll use this to greet you on every new tab.</p>
            </div>
            <input
              ref="nameRef"
              v-model="nameInput"
              type="text"
              placeholder="Your name…"
              maxlength="32"
              autocomplete="off"
              spellcheck="false"
              class="w-full text-center text-xl font-light text-fg/90 bg-transparent border-b-2
                     border-fg/15 focus:border-accent pb-2 outline-none placeholder-fg/20
                     transition-colors caret-accent"
              @keydown.enter="confirmName"
            />
            <div class="flex gap-3 w-full">
              <button class="btn-secondary flex-1" @click="step = 1">Back</button>
              <button
                class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
                :class="nameInput.trim() ? 'btn-primary' : 'bg-fg/8 text-fg/25 cursor-not-allowed'"
                :disabled="!nameInput.trim()"
                @click="confirmName"
              >Continue</button>
            </div>
          </div>
        </Transition>

        <!-- ── Step 3: Theme ── -->
        <Transition name="step" mode="out-in">
          <div v-if="step === 3" key="3" class="flex flex-col items-center gap-6">
            <div class="text-center">
              <h2 class="text-2xl font-semibold text-fg/90 tracking-tight">Make it yours</h2>
              <p class="text-fg/35 mt-2 text-sm">Pick a look — you can change this any time in settings.</p>
            </div>

            <!-- Light / Dark -->
            <div class="flex w-full rounded-xl overflow-hidden border border-fg/10">
              <button
                class="flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors"
                :class="currentMode === 'dark' ? 'bg-accent/20 text-accent2' : 'text-fg/40 hover:bg-fg/5'"
                @click="setMode('dark')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                Dark
              </button>
              <button
                class="flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors border-l border-fg/10"
                :class="currentMode === 'light' ? 'bg-accent/20 text-accent2' : 'text-fg/40 hover:bg-fg/5'"
                @click="setMode('light')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                Light
              </button>
            </div>

            <!-- Color presets -->
            <div class="w-full">
              <p class="text-xs text-fg/25 uppercase tracking-widest font-semibold mb-3">Accent color</p>
              <div class="flex items-center justify-between">
                <button
                  v-for="p in PRESETS"
                  :key="p.name"
                  class="flex flex-col items-center gap-1.5 group"
                  :title="p.name"
                  @click="pickPreset(p)"
                >
                  <span
                    class="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-offset-app transition-all"
                    :style="{ background: presetHex(p) }"
                    :class="activePreset?.name === p.name
                      ? 'ring-fg/40 scale-110'
                      : 'ring-transparent group-hover:ring-fg/20'"
                  />
                  <span class="text-[10px] text-fg/25 group-hover:text-fg/50 transition-colors">{{ p.name }}</span>
                </button>

                <!-- Custom color wheel -->
                <div class="flex flex-col items-center gap-1.5">
                  <label class="relative w-8 h-8 cursor-pointer group" title="Custom">
                    <input
                      type="color"
                      :value="customHex"
                      class="color-wheel-sm"
                      @input="onCustomColor($event.target.value)"
                    />
                  </label>
                  <span class="text-[10px] text-fg/25">Custom</span>
                </div>
              </div>
            </div>

            <div class="flex gap-3 w-full">
              <button class="btn-secondary flex-1" @click="step = 2">Back</button>
              <button class="btn-primary flex-1" @click="step = 4">Continue</button>
            </div>
          </div>
        </Transition>

        <!-- ── Step 4: Done ── -->
        <Transition name="step" mode="out-in">
          <div v-if="step === 4" key="4" class="text-center flex flex-col items-center gap-6">
            <div class="w-20 h-20 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-semibold text-fg/90">Hey, {{ savedName }}!</h2>
              <p class="text-fg/35 mt-2 text-sm leading-relaxed">
                You're all set. Every new tab<br>will be your fresh start.
              </p>
            </div>
            <button class="btn-primary px-10" @click="finish">Start browsing</button>
          </div>
        </Transition>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { applyTheme, hexToHsl, hueToAccentHex, PRESETS } from '../useTheme'

const emit = defineEmits(['done'])

const TOTAL_STEPS = 4
const step        = ref(1)
const nameInput   = ref('')
const savedName   = ref('')
const nameRef     = ref(null)

/* ── Theme state ── */
const currentHue  = ref(248)
const currentSat  = ref(72)
const currentMode = ref('dark')
const customHex   = computed(() => hueToAccentHex(currentHue.value, currentMode.value))

const activePreset = computed(() =>
  PRESETS.find(p => Math.abs(p.hue - currentHue.value) < 5) ?? null
)

function presetHex(p) { return hueToAccentHex(p.hue, currentMode.value) }

function pickPreset(p) {
  currentHue.value = p.hue
  currentSat.value = p.sat
  applyTheme(p.hue, p.sat, currentMode.value)
}

function onCustomColor(hex) {
  const [h, s] = hexToHsl(hex)
  currentHue.value = h
  currentSat.value = Math.max(40, s)
  applyTheme(currentHue.value, currentSat.value, currentMode.value)
}

function setMode(mode) {
  currentMode.value = mode
  applyTheme(currentHue.value, currentSat.value, mode)
}

/* ── Step logic ── */
function confirmName() {
  const name = nameInput.value.trim()
  if (!name) return
  savedName.value = name
  step.value = 3
}

function finish() {
  localStorage.setItem('user-name', savedName.value)
  emit('done')
}

watch(step, val => {
  if (val === 2) nextTick(() => nameRef.value?.focus())
})
</script>

<style scoped>
.btn-primary {
  @apply px-8 py-2.5 rounded-xl bg-accent text-white font-medium text-sm
         hover:bg-accent/90 transition-all shadow-glow active:scale-95;
}
.btn-secondary {
  @apply py-2.5 rounded-xl border border-fg/10 text-fg/40 text-sm
         hover:bg-fg/5 hover:text-fg/60 transition-all;
}

/* Tiny circular color wheel */
.color-wheel-sm {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  background: none;
  overflow: hidden;
  opacity: 1;
}
.color-wheel-sm::-webkit-color-swatch-wrapper { padding: 0; }
.color-wheel-sm::-webkit-color-swatch { border: none; border-radius: 50%; }

.step-enter-active,
.step-leave-active { transition: opacity 0.2s, transform 0.2s; }
.step-enter-from   { opacity: 0; transform: translateX(24px); }
.step-leave-to     { opacity: 0; transform: translateX(-24px); }
</style>
