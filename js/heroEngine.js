import { syncStaticToDynamic } from "./functions.js"; // Apni functions file ka exact path map karna

let currentHeroIndex = 0;
let rotationIntervalId = null;

// ==========================================================
// 🌌 HERO UI TEMPLATES MATRIX (Pure Dynamic Strings)
// ==========================================================
const heroTemplates = [
    // --- UI VARIANT 1: HYPER KINETIC STUDIO (Current Original Style) ---
    () => `
    <section class="ti-hyper-hero variant-1">
        <div class="ti-orb ti-orb-1"></div>
        <div class="ti-orb ti-orb-2"></div>
        <div class="ti-hyper-grid"></div>
        <div class="ti-hyper-container">
            <div class="ti-hyper-stage">
                <div class="ti-hyper-left">
                    <div class="ti-hyper-badge-shimmer"><span>NEXT-GEN ARCHIVE</span></div>
                    <h1 class="ti-hyper-h1">
                        <span class="ti-fly-in-left">UNLEASH</span>
                        <span class="ti-fly-in-right ti-glow-text">THE INK.</span>
                        <span class="ti-fly-in-up ti-text-stroke">VOL. 26</span>
                    </h1>
                    <p class="ti-hyper-desc">We shatter standard reading layouts. Experience curated premium e-books wrapped in a high-octane digital aesthetic designed for the elite.</p>
                    <div class="ti-hyper-cta-wrapper">
                        <a href="about.html"><button class="ti-hyper-btn"><span class="ti-btn-glaze"></span><span class="ti-btn-content">ABOUT US</span></button></a>
                    </div>
                </div>
                <div class="ti-hyper-right">
                    <div class="ti-hyper-scene-box">
                        <div class="ti-hyper-ring"></div>
                        <div class="ti-hyper-avatar-wrap">
                            <img src="" alt="Ganesh Bhoi" class="ti-hyper-png" id="ceo-avatar">
                            <div class="ti-crosshair ch-1">+</div><div class="ti-crosshair ch-2">+</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>`,









    // --- UI VARIANT 2: SONIC EQUALIZER MATRIX (Audio-First Grid) ---
    () => `
    <section class="ti-hyper-hero variant-2">
        
        <div class="sonic-wave-bg"></div>
        <div class="ti-hyper-grid"></div>
        <div class="ti-orb ti-orb-1"></div>

        <div class="ti-hyper-container">
            <div class="ti-hyper-stage sonic-grid-layout">
                
                <div class="sonic-visual-column">
                    <div class="sonic-image-capsule">
                        <div class="sonic-frequency-rings">
                            <span class="s-pulse p-1"></span>
                            <span class="s-pulse p-2"></span>
                        </div>
                        
                        <img src="" id="cyber-hero-img" alt="Sonic Stream Emitter Node">
                        
                        <div class="sonic-live-pill">LIVE_AUDIO</div>
                    </div>
                </div>

                <div class="sonic-text-column">
                    
                    <div class="sonic-db-panel">
                        <span class="db-node">// BROADCAST: ACTIVE</span>
                        <span class="db-spacer"></span>
                        <span class="db-node">96.4 dB</span>
                    </div>

                    <h1 class="sonic-h1-waveform">
                        <span class="sonic-txt-compress">STREAM</span>
                        <span class="sonic-txt-glow">THE SOUND.</span>
                        <span class="sonic-txt-split">VOICE.AI</span>
                    </h1>

                    <div class="sonic-pulse-rail">
                        <span class="rail-bar rb-1"></span>
                        <span class="rail-bar rb-2"></span>
                        <span class="rail-bar rb-3"></span>
                        <span class="rail-bar rb-4"></span>
                        <span class="rail-bar rb-5"></span>
                        <span class="rail-bar rb-6"></span>
                    </div>

                    <p class="ti-hyper-desc sonic-desc-tweak">
                        Shatter the boundaries of traditional reading. Instantly convert premium narratives into immersive audiobooks, streaming flawlessly across multiple regional and global languages.
                    </p>

                    <div class="sonic-mixer-channels">
                        <span class="mix-node active-mix">DECK_A // EN</span>
                        <span class="mix-node">DECK_B // OR</span>
                        <span class="mix-node">DECK_C // HI</span>
                    </div>

                    <div class="ti-hyper-cta-wrapper">
                        <a href="privacy.html">
                            <button class="sonic-cyber-btn">
                                <span class="btn-icon">🎙️</span>
                                <span class="btn-text">LISTEN SECURELY</span>
                            </button>
                        </a>
                    </div>

                </div>

            </div>
        </div>
    </section>`,













    // --- UI VARIANT 3: VAULT SECURE LOCK SYSTEM (Visual-First Typography Format) ---
    () => `
    <section class="ti-hyper-hero variant-3">
        
        <div class="luxe-editorial-bg"></div>
        <div class="luxe-corner-frame-line"></div>
        <div class="ti-orb ti-orb-2"></div>
        
        <div class="ti-hyper-container luxe-full-wrapper">
            <div class="luxe-editorial-stage">
                
                <div class="luxe-title-block">
                    <div class="luxe-vault-badge">
                        <span class="vault-status-dot"></span>
                        <span class="vault-status-text">[ DIRECTORY_SECURED ]</span>
                    </div>
                    
                    <h1 class="luxe-massive-h1">
                        <span class="luxe-txt-solid">OWN FOREVER <span class="v-bracket">[</span>🔒<span class="v-bracket">]</span></span>
                        <span class="luxe-txt-stroke">VAULT.STASH</span>
                    </h1>
                </div>

                <div class="luxe-split-footer">
                    
                    <div class="luxe-portrait-anchor">
                        <div class="luxe-image-scanner">
                            <div class="luxe-scan-beam"></div>
                            <img src="" id="minimal-hero-img" alt="Immutable Asset Stash Lock">
                            
                            <div class="luxe-img-lock-overlay">SECURE STORAGE</div>
                        </div>
                    </div>

                    <div class="luxe-receipt-panel">
                        <div class="receipt-row">
                            <span class="r-label">OWNERSHIP REGISTRY:</span>
                            <span class="r-val status-green">VERIFIED_PERMANENT</span>
                        </div>
                        <div class="receipt-row">
                            <span class="r-label">STORAGE BLOCK:</span>
                            <span class="r-val">LOCAL_OFFLINE_CACHE</span>
                        </div>
                        
                        <p class="ti-hyper-desc luxe-clean-para">
                            Instant collection synchronization. Purchase once, secure permanently, and access your custom encrypted literary locker at any moment.
                        </p>

                        <div class="ti-hyper-cta-wrapper luxe-cta-pos">
                            <button class="luxe-editorial-btn" onclick="window.render('LibraryPage')">
                                <span class="btn-luxe-txt">OPEN MY REPOSITORY</span>
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </section>`,
    
    
    
    
    
    
    
    
 


];

// ==========================================================
// ⚙️ CORE ENGINE DRIVER (LOOP & FLOW CONTROLLER)
// ==========================================================
export const initHeroRotationEngine = async (db) => {
    const rootContainer = document.getElementById("hero-slider-root");
    if (!rootContainer) return;

    // Sub-routine jo har interval par UI change handle karega
    const renderNextCycle = async () => {
        // Opacity smooth fade-out out-animation trigger
        rootContainer.style.opacity = "0";
        rootContainer.style.transition = "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)";

        // 300ms ka safe timeout delay taaki fade completely execute ho jaye
        setTimeout(async () => {
            // 🧠 ANTI-LAG FLUSH: Purane DOM trees ko memory se completely wipe karo
            rootContainer.innerHTML = "";

            // Naya template execute karke content mount karo
            const currentTemplateGenerator = heroTemplates[currentHeroIndex];
            rootContainer.insertAdjacentHTML("beforeend", currentTemplateGenerator());
            
            // Bring opacity back up smoothly
            rootContainer.style.opacity = "1";

            // 🔥 CACHE-BASED IMAGE SYNC HOOKS (Saves queries, zero lag!)
            if (currentHeroIndex === 0) {
                await syncStaticToDynamic(db, '#ceo-avatar', 'founderimg1');
            } else if (currentHeroIndex === 1) {
                await syncStaticToDynamic(db, '#cyber-hero-img', 'founderimg2');
            } else if (currentHeroIndex === 2) {
                await syncStaticToDynamic(db, '#minimal-hero-img', 'founderimg3');
            }

            // Pointer loop rollover handler (0 -> 1 -> 2 -> 0)
            currentHeroIndex = (currentHeroIndex + 1) % heroTemplates.length;
        }, 300);
    };

    // First instant bootstrap load execution call
    await renderNextCycle();

    // Pehle se chal rahe duplicate cycles ko remove/reset karo safety ke liye
    if (rotationIntervalId) clearInterval(rotationIntervalId);

    // 🛸 6-SECONDS TIMEOUT LOOP CONTROLLER LOCK
    rotationIntervalId = setInterval(async () => {
        await renderNextCycle();
    }, 6000);
};
