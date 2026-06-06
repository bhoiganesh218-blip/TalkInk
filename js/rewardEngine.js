// --- 📦 FIREBASE CONFIGURATION & INSTANT IMPORTS ---
import { auth, db, updateData, getSingleDoc } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 🎚️ SYSTEM HARD-CORE CONFIGURATION ---
const COOLDOWN_TIME = 15 * 1000; // 15 Seconds Cooldown
const MAX_ADS_PER_DAY = 10;
const IS_TEST_MODE = false; // 🚨 Production pe jaate hi ise false kar dena bhaa

// Global States for HilltopAds VAST Integration
let isAdReady = false; 
let currentUID = null;
let hilltopPlayerInstance = null; 

// 🔥 HARDCORE SECURE GATEKEEPERS
let isAdActuallyPlaying = false; 
let adPlayDurationCounter = 0; // Tracks actual seconds watched
let adWatchIntervalTimer = null; // Interval instance tracking clock

// HilltopAds VAST Tag URL
const HILLTOP_VAST_URL = "https://helplessfew.com/dtm.FbzldBGlN/vKZ/GqUP/TekmH9luGZ_UllJk/PJTocDxFMBT/IfwUNMj/U/t/NQzUETxlM/joAa2nO_Qc";

// Live Local State Cache
let localUserProgress = {
    coins: 0,
    adsWatchedToday: 0,
    lastAdTimestamp: 0
};

// --- 🔐 AUTH STATUS MONITOR & FIRESTORE SYNC (WITH GUEST SAFEGUARDS) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUID = user.uid;
        console.log("👤 User Authenticated:", currentUID);
        
        try {
            const res = await getSingleDoc("users", currentUID);
            if (res && res.success && res.data) {
                localUserProgress.coins = res.data.coins || 0;
                localUserProgress.adsWatchedToday = res.data.adsWatchedToday || 0;
                localUserProgress.lastAdTimestamp = res.data.lastAdTimestamp || 0;
                
                // 🌞 AUTOMATIC MIDNIGHT / NEW DAY RESET CHECK
                const lastAdDate = localUserProgress.lastAdTimestamp ? new Date(localUserProgress.lastAdTimestamp).toDateString() : "";
                const todayDate = new Date().toDateString();

                if (lastAdDate !== todayDate && localUserProgress.adsWatchedToday > 0) {
                    console.log("📅 New day cycle detected! Resetting daily ad limits.");
                    localUserProgress.adsWatchedToday = 0;
                    await updateData("users", currentUID, { adsWatchedToday: 0 });
                }
            }
        } catch (error) {
            console.error("❌ Firestore read pipeline error:", error);
        }
        
        updateRewardModalUI();
        checkActiveCooldown();
        
        if (localUserProgress.adsWatchedToday < MAX_ADS_PER_DAY && !isSystemInCooldown()) {
            initHilltopVastEngine();
        }
    } else {
        console.warn("🔒 No session found, running guest structural fallsafe...");
        currentUID = null;
        localUserProgress = { coins: 0, adsWatchedToday: 0, lastAdTimestamp: 0 };
        
        updateRewardModalUI();
        
        setTimeout(() => {
            window.location.href = "index.html"; 
        }, 100);
    }
});


// --- 🛑 HILLTOPADS VAST VIDEO ENGINE INITIALIZATION ---
function initHilltopVastEngine() {
    console.log("🛠_ Preparing HilltopAds VAST Node Registry...");
    if (HILLTOP_VAST_URL) {
        isAdReady = true;
        toggleWatchButtonState(true);
    } else {
        isAdReady = false;
        toggleWatchButtonState(false);
    }
}


// --- 📺 INTERACTION ENGINE TRIGGER (FLUID PLAYER METHOD) ---
window.triggerAdWatchingProcess = async function() {
    if (!currentUID) {
        alert("Bhai pehle login toh kar lo! 😉");
        return;
    }
    if (localUserProgress.adsWatchedToday >= MAX_ADS_PER_DAY) return;
    if (isSystemInCooldown()) {
        alert("🔒 Anti-Spam protection active! Wait for cooling cycle to complete.");
        return;
    }

    // Clear and reset security variables before triggering ad engine
    isAdActuallyPlaying = false;
    adPlayDurationCounter = 0;
    if (adWatchIntervalTimer) clearInterval(adWatchIntervalTimer);

    // 🚨 TEST MODE ENHANCEMENT
    if (IS_TEST_MODE) {
        console.log("🛠_ Test mode active: Simulating 5 seconds watch reward loop.");
        alert("TEST MODE ACTIVE: Simulating 5 seconds watch reward loop...");
        
        const watchBtn = document.getElementById('modal-watch-btn');
        if (watchBtn) watchBtn.innerText = "⏳ SIMULATING WATCH TIME...";

        setTimeout(async () => {
            await processSuccessfulAdWatch();
        }, 5000);
        
        return; 
    }

    // 🎬 LIVE MODE
    if (isAdReady) {
        console.log("🎬 Activating Fluid Player Container for VAST Streaming...");
        
        const videoContainer = document.getElementById('ad-video-container');
        const watchBtn = document.getElementById('modal-watch-btn');
        
        if (videoContainer) videoContainer.style.display = 'block';
        if (watchBtn) {
            watchBtn.disabled = true;
            watchBtn.innerText = "📺 LOADING SECURE AD STREAM...";
        }

        try {
            hilltopPlayerInstance = fluidPlayer('talkink-ad-player', {
                vastOptions: {
                    adList: [
                        {
                            roll: 'preRoll', 
                            vastTag: HILLTOP_VAST_URL
                        }
                    ],
                    // 👑 1. When Ad Completes Stream
                    adFinishedCallback: async () => {
                        console.log("🔒 Player claimed ad finish. Verifying actual runtime criteria...");
                        verifyAndTriggerReward();
                    },
                    // 🚫 2. Error Handler (No Fill, Ads unavailable, Adblock active)
                    adErrorCallback: (error) => {
                        console.error("❌ Hilltop VAST Ad Engine Error Event:", error);
                        handleFakeOrFailedAdPlayback("Bhai abhi koi ads available nahi hain! Kuch der baad try karo.");
                    },
                    // ⏩ 3. Skipped Handler
                    adSkippedCallback: async () => {
                        console.log("⏩ Ad skip button pressed. Checking active progress logic...");
                        verifyAndTriggerReward();
                    }
                },
                layoutControls: {
                    fillToContainer: true,
                    autoPlay: true, 
                    mute: false,
                    allowTheatre: false,
                    playbackRateControl: false 
                }
            });

            // ⚓ CRYPTOGRAPHIC VERIFICATION MODULE (NATIVE AUDIO/VIDEO PROBING)
            const nativeVideoNode = document.getElementById('talkink-ad-player');
            if (nativeVideoNode) {
                
                // Triggers strictly when the rendering video buffer successfully loads and updates timeline frames
                nativeVideoNode.ontimeupdate = () => {
                    if (nativeVideoNode.currentTime > 0 && !isAdActuallyPlaying) {
                        console.log("▶️ Real Video Pixels Processing! Engaging stream watch tracking interval...");
                        isAdActuallyPlaying = true;
                        
                        if (watchBtn) watchBtn.innerText = "📺 WATCHING AD ACTIVE...";

                        // Start ticking every 1 second to build genuine streaming validation proof
                        adPlayDurationCounter = 0;
                        adWatchIntervalTimer = setInterval(() => {
                            adPlayDurationCounter++;
                            console.log(`⏱️ Actual Streaming Playback Duration Verified: ${adPlayDurationCounter}s`);
                        }, 1000);
                    }
                };

                // Native termination monitor
                nativeVideoNode.onended = async () => {
                    console.log("⚓ Native track terminal context caught.");
                    verifyAndTriggerReward();
                };
            }

        } catch (err) {
            console.error("Critical error firing Fluid Player instance:", err);
            alert("Ad player container loading crashed. Reloading node...");
            window.location.reload();
        }
    } else {
        alert("⏳ Ad is caching on your browser node, please give it 2-3 seconds.");
        initHilltopVastEngine();
    }
};

// --- 🛡️ SECURE VERIFICATION DISPATCH ENGINE ---
function verifyAndTriggerReward() {
    if (adWatchIntervalTimer) clearInterval(adWatchIntervalTimer);

    // CRITICAL THRESHOLD SECURE CHECK: Ad must play live for at least 4 seconds total
    if (isAdActuallyPlaying && adPlayDurationCounter >= 4) {
        console.log("🎯 Verification Successful! User matched streaming thresholds.");
        closeAdAndProcessReward();
    } else {
        console.warn(`🚨 Security Core Blocked Exploit: Attempted to secure reward with fake/empty stream. Watched duration: ${adPlayDurationCounter}s`);
        handleFakeOrFailedAdPlayback("Bhai ad poora load hokar chal nahi paya! Please dobara try karo.");
    }
}

function handleFakeOrFailedAdPlayback(alertMessage) {
    if (adWatchIntervalTimer) clearInterval(adWatchIntervalTimer);
    
    // Cleanup player elements completely
    isAdActuallyPlaying = false;
    adPlayDurationCounter = 0;
    
    alert(alertMessage);
    resetAdWatchUIState();
}

// --- ⚙️ BUFFER CONTROL MANAGEMENT FUNCTIONS ---
async function closeAdAndProcessReward() {
    if (adWatchIntervalTimer) clearInterval(adWatchIntervalTimer);
    
    const videoContainer = document.getElementById('ad-video-container');
    if (videoContainer) videoContainer.style.display = 'none';
    
    isAdActuallyPlaying = false;
    adPlayDurationCounter = 0;

    setTimeout(async () => {
        await processSuccessfulAdWatch();
    }, 400);
}

function resetAdWatchUIState() {
    if (adWatchIntervalTimer) clearInterval(adWatchIntervalTimer);
    
    const videoContainer = document.getElementById('ad-video-container');
    const watchBtn = document.getElementById('modal-watch-btn');
    
    isAdActuallyPlaying = false;
    adPlayDurationCounter = 0;
    
    if (videoContainer) videoContainer.style.display = 'none';
    if (watchBtn) {
        watchBtn.disabled = false;
        watchBtn.innerText = "⚡ CLK HERE TO STREAM AD";
    }
}


// --- ⚙️ CORE MUTATION PROTOCOL (Save -> Redirect) ---
async function processSuccessfulAdWatch() {
    if (!currentUID) return;

    localUserProgress.adsWatchedToday += 1;
    localUserProgress.coins += 50; 
    localUserProgress.lastAdTimestamp = Date.now();
    
    const watchBtn = document.getElementById('modal-watch-btn');
    if (watchBtn) {
        watchBtn.disabled = true;
        watchBtn.innerText = "🏁 COMMITTING REWARD TO CLOUD...";
    }

    updateRewardModalUI();

    const updateStatus = await updateData("users", currentUID, {
        coins: localUserProgress.coins,
        adsWatchedToday: localUserProgress.adsWatchedToday,
        lastAdTimestamp: localUserProgress.lastAdTimestamp
    });

    if (updateStatus && updateStatus.success) {
        console.log("🚀 Sync completed. Redirecting...");
        if (watchBtn) watchBtn.innerText = "🎉 SUCCESS! REDIRECTING...";
        
        setTimeout(() => {
            window.location.href = 'index.html?reward=success';
        }, 1500);
    } else {
        alert("❌ Sync pipeline broken. Reloading page state...");
        window.location.reload();
    }
}

// --- 🛠️ DYNAMIC UI RENDER INTERNALS ---
function updateRewardModalUI() {
    const coinsEl = document.getElementById('modal-user-coins');
    const countTextEl = document.getElementById('modal-ad-count-text');
    const progressFillEl = document.getElementById('modal-ad-progress-fill');
    
    if (coinsEl) coinsEl.innerText = localUserProgress.coins;
    if (countTextEl) countTextEl.innerText = `${localUserProgress.adsWatchedToday} / ${MAX_ADS_PER_DAY} COMPLETE`;
    
    if (progressFillEl) {
        const percentage = (localUserProgress.adsWatchedToday / MAX_ADS_PER_DAY) * 100;
        progressFillEl.style.width = `${percentage}%`;
    }
    
    if (localUserProgress.adsWatchedToday >= MAX_ADS_PER_DAY) {
        const watchBtn = document.getElementById('modal-watch-btn');
        if (watchBtn) {
            watchBtn.disabled = true;
            watchBtn.innerText = "🎉 ALL MISSIONS COMPLETED!";
        }
        fetchRandomCouponFromBooks();
    }
}

function toggleWatchButtonState(ready) {
    const btn = document.getElementById('modal-watch-btn');
    if (!btn || localUserProgress.adsWatchedToday >= MAX_ADS_PER_DAY || isSystemInCooldown()) return;
    
    if (ready) {
        btn.disabled = false;
        btn.innerHTML = `⚡ CLK HERE TO STREAM AD`;
        btn.style.opacity = "1";
    } else {
        btn.disabled = true;
        btn.innerHTML = `⏳ INJECTING MEDIA BUFFER...`;
        btn.style.opacity = "0.6";
    }
}

// --- 🕒 TIME & SAFETY MANAGEMENT LAYER ---
function isSystemInCooldown() {
    return (Date.now() - localUserProgress.lastAdTimestamp < COOLDOWN_TIME);
}

function checkActiveCooldown() {
    const timePassed = Date.now() - localUserProgress.lastAdTimestamp;
    if (timePassed < COOLDOWN_TIME) {
        startCooldownCountdown(COOLDOWN_TIME - timePassed);
    } else if (localUserProgress.adsWatchedToday < MAX_ADS_PER_DAY) {
        toggleWatchButtonState(isAdReady);
    }
}

function startCooldownCountdown(duration) {
    const lockLayer = document.getElementById('modal-cooldown-lock');
    const clockText = document.getElementById('modal-timer-clock');
    const watchBtn = document.getElementById('modal-watch-btn');
    
    if (lockLayer) lockLayer.style.display = 'flex';
    if (watchBtn) watchBtn.disabled = true;
    
    let timeRemaining = Math.floor(duration / 1000);
    
    const countdownInterval = setInterval(() => {
        timeRemaining--;
        
        let minutes = Math.floor(timeRemaining / 60);
        let seconds = Math.floor(timeRemaining % 60);
        
        if (clockText) {
            clockText.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeRemaining <= 0) {
            clearInterval(countdownInterval);
            if (lockLayer) lockLayer.style.display = 'none';
            window.location.reload();
        }
    }, 1000);
}

// --- 🎟️ LOOT CABINET: RANDOM PREMIUM BOOK & COUPON EXTRACTOR ---
async function fetchRandomCouponFromBooks() {
    const couponBox = document.getElementById('modal-coupon-box');
    const couponText = document.getElementById('modal-unlocked-coupon');
    
    const bookCoverImg = document.getElementById('modal-book-cover');
    const bookTitleText = document.getElementById('modal-book-title');
    const bookDescText = document.getElementById('modal-book-desc');
    const bookDirectLink = document.getElementById('modal-book-direct-link');

    if (!couponBox) return;
    
    couponBox.style.display = 'block';
    
    try {
        console.log("📥 Fetching eligible paid reward asset pools from Firestore...");
        const querySnapshot = await getDocs(collection(db, "books"));
        
        let targetEligibleBooks = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const bookPrice = Number(data.price) || 0; 
            
            if (data.allowedCoupons && data.allowedCoupons.length > 0 && bookPrice > 0) {
                targetEligibleBooks.push({
                    id: doc.id,
                    title: data.title || "Premium TalkInk Book",
                    cover: data.coverURL || "https://via.placeholder.com/120x180",
                    description: data.description || "Open the details blueprint inside the library catalog node.",
                    coupons: data.allowedCoupons
                });
            }
        });
        
        if (targetEligibleBooks.length > 0) {
            const randomBookIndex = Math.floor(Math.random() * targetEligibleBooks.length);
            const selectedBook = targetEligibleBooks[randomBookIndex];
            
            const randomCouponIndex = Math.floor(Math.random() * selectedBook.coupons.length);
            const selectedCoupon = selectedBook.coupons[randomCouponIndex];
            
            if (couponText) couponText.innerText = selectedCoupon;
            if (bookTitleText) bookTitleText.innerText = selectedBook.title.toUpperCase();
            if (bookCoverImg) bookCoverImg.src = selectedBook.cover;
            
            if (bookDescText) {
                const cleanText = selectedBook.description.replace(/<[^>]*>/g, '');
                bookDescText.innerText = cleanText.length > 90 
                    ? cleanText.substring(0, 90) + "..." 
                    : cleanText;
            }
            
            if (bookDirectLink) {
                bookDirectLink.href = `index.html?page=BookDetailsPage&id=${selectedBook.id}`;
            }

            console.log(`🎯 Fixed Reward matched Book ID: ${selectedBook.id}`);
        } else {
            if (couponText) couponText.innerText = "NO_ACTIVE_COUPON";
            if (bookTitleText) bookTitleText.innerText = "Missions Pool Exhausted";
        }
    } catch (error) {
        console.error("Critical error inside coupon database extraction:", error);
        if (couponText) couponText.innerText = "RETRYING ERROR...";
    }
}

// --- 📋 UNBREAKABLE CLIPBOARD ENGINE: COUPON COPY PROCESSOR ---
function copyUnlockedCoupon() {
    const couponElement = document.getElementById('modal-unlocked-coupon');
    const copyBtn = document.getElementById('copy-btn-text');
    
    if (!couponElement) {
        console.error("❌ Copy Error: Element '#modal-unlocked-coupon' not found in DOM.");
        return;
    }
    
    const couponText = couponElement.innerText.trim();
    
    if (couponText === "FETCHING..." || couponText === "" || couponText === "NO_ACTIVE_COUPON") {
        alert("Bhai, pehle mission complete karke coupon unlock hone do! 😉");
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(couponText)
            .then(() => {
                handleCopySuccess(copyBtn);
            })
            .catch((err) => {
                console.warn("Clipboard API failed, trying fallback method...", err);
                fallbackCopyMethod(couponText, copyBtn);
            });
    } else {
        fallbackCopyMethod(couponText, copyBtn);
    }
}

window.copyUnlockedCoupon = copyUnlockedCoupon;

function fallbackCopyMethod(text, buttonElement) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            handleCopySuccess(buttonElement);
        } else {
            alert("Bhai copy nahi ho paya, manually copy kar lo code: " + text);
        }
    } catch (err) {
        console.error("Fallback execution crash: ", err);
        alert("Copy Error! Code: " + text);
    }
    
    document.body.removeChild(textArea);
}

function handleCopySuccess(button) {
    console.log("🎯 Coupon successfully cloned to system clipboard memory!");
    if (button) {
        const originalText = button.innerText;
        button.innerText = "COPIED! 🔥";
        button.style.background = "#16a34a";
        
        setTimeout(() => {
            button.innerText = originalText;
            button.style.background = "";
        }, 1500);
    } else {
        alert("Coupon Code Copied Successfully!");
    }
}
