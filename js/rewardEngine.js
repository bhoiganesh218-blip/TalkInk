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
let hilltopPlayerInstance = null; // 🔥 Fluid Player instance track karne ke liye

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
        
        // Under limits check to handle initial action states
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
        console.log("🎯 HilltopAds VAST endpoint linked successfully!");
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

    // 🚨 TEST MODE ENHANCEMENT
    if (IS_TEST_MODE) {
        console.log("🛠_ Test mode active: Simulating 5 seconds watch reward loop.");
        alert("TEST MODE ACTIVE: Simulating 5 seconds watch reward loop... (Ad script bypassed)");
        
        const watchBtn = document.getElementById('modal-watch-btn');
        if (watchBtn) watchBtn.innerText = "⏳ SIMULATING WATCH TIME...";

        setTimeout(async () => {
            await processSuccessfulAdWatch();
        }, 5000);
        
        return; 
    }

    // 🎬 LIVE MODE: Triggers when IS_TEST_MODE = false
    if (isAdReady) {
        console.log("🎬 Activating Fluid Player Container for VAST Streaming...");
        
        const videoContainer = document.getElementById('ad-video-container');
        const watchBtn = document.getElementById('modal-watch-btn');
        
        if (videoContainer) videoContainer.style.display = 'block';
        if (watchBtn) {
            watchBtn.disabled = true;
            watchBtn.innerText = "📺 WATCHING AD...";
        }

        try {
            // Fluid Player Engine Core Initialization
            hilltopPlayerInstance = fluidPlayer('talkink-ad-player', {
                vastOptions: {
                    adList: [
                        {
                            roll: 'preRoll', // Player load hote hi video trigger hoga
                            vastTag: HILLTOP_VAST_URL
                        }
                    ],
                    // 👑 USER REWARD VERIFICATION EVENT (Triggered automatically on full ad stream completion)
                    adFinishedCallback: async () => {
                        console.log("💰 Ad closed after successful playback stream! Awarding points...");
                        if (videoContainer) videoContainer.style.display = 'none';
                        await processSuccessfulAdWatch();
                    }
                },
                layoutControls: {
                    fillToContainer: true,
                    autoPlay: true, 
                    mute: false,
                    allowTheatre: false,
                    playbackRateControl: false // Anti-Cheat: User speed badha nahi sakta
                }
            });

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


// --- ⚙️ CORE MUTATION PROTOCOL (Save -> Redirect) ---
async function processSuccessfulAdWatch() {
    if (!currentUID) return;

    localUserProgress.adsWatchedToday += 1;
    localUserProgress.coins += 50; 
    localUserProgress.lastAdTimestamp = Date.now();
    
    const watchBtn = document.getElementById('modal-watch-btn');
    if (watchBtn) watchBtn.innerText = "🏁 COMMITTING REWARD TO CLOUD...";

    const updateStatus = await updateData("users", currentUID, {
        coins: localUserProgress.coins,
        adsWatchedToday: localUserProgress.adsWatchedToday,
        lastAdTimestamp: localUserProgress.lastAdTimestamp
    });

    if (updateStatus && updateStatus.success) {
        console.log("🚀 Sync completed. Initiating automatic return channel...");
        window.location.href = 'index.html?reward=success';
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
