// =========================================================================
// 📦 MODULE IMPORTS (External Functions & Core Modules)
// =========================================================================
import { 
  animateBookClick,      // Kitab par click hone par smooth cinematic zoom animation chalata hai
  renderBooksGrid,       // Database se books lekar main screen par grid format me html inject karta hai
  renderAuthSystem,      // User ke login status ke hisab se Header me Login/Profile button badalta hai
  fetchAndRenderLibrary, // Logged-in user ke account se uski purchased (kharidi hui) books fetch karta hai
  syncStaticToDynamic,   // Universal PWA Dynamic Sync Engine (Firestore Field to HTML Dynamic Linker)
  startBookReader,       // Local PDF files ko render karne wala reader engine import kiya
  syncCategoriesToNavbar,// 🔥 Dynamic Categories Injection Engine
  openCategoryViewPage   // 🔥 Dynamic Category Viewer Router Layer
} from './functions.js';

import { observeAuthState, db } from './firebase.js'; // Ye Firebase ka real-time event listener hai
import { initHeroRotationEngine } from "./heroEngine.js";

// =========================================================================
// ⏳ APP INITIALIZATION RUNNER & BACK NAVIGATION EVENTS
// =========================================================================
window.showLoader(); // Loader Start

// Browser History Back Navigation Trace Logic
window.addEventListener('pageshow', (event) => {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        console.log("🔄 User returned from Ad page. Checking UI State...");
        if (window.currentUserData && typeof window.syncFloatingWidgetState === 'function') {
            window.syncFloatingWidgetState(window.currentUserData);
        }
    }
});

// Main DOM Structure Loaded Parser
window.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements Variables (Sidebar aur Navigation state control)
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const topNav = document.querySelector('.top-nav');
    const navItems = document.querySelectorAll('.nav-item');
    
    // -------------------------------------------------------------------------
    // 🌍 GLOBAL FUNCTIONS BINDING (HTML onClick Handler Fallback)
    // -------------------------------------------------------------------------
    window.openDetails = (bookId) => {
        if (event && event.currentTarget) {
            animateBookClick(event.currentTarget, bookId);
        }
    };

    // 🔥 UPDATED: REACTIVE CLICK FILTER HANDLER
    window.filterByCategory = (categoryId, element) => {
        console.log(`%c[Category Clicked] Filtering system targeting: ${categoryId}`, "color: #6366f1; font-weight: bold;");
        
        // 1. Purane active button se glow class hatao
        const allPills = document.querySelectorAll('.category-pill');
        allPills.forEach(pill => pill.classList.remove('active'));
        
        // 2. Jis par click hua use active karo (Glow overlay state management)
        if (element) {
            element.classList.add('active');
        }

        // 3. Category Name dynamically nikalne ke liye button ke span text ko read karo
        const categoryName = element ? element.querySelector('span').innerText : "Vault Selection";

        // 4. View Layer Matrix ko badlo aur data fetch stream open karo
        openCategoryViewPage(db, categoryId, categoryName, window.currentUserData);
    };


    // =========================================================================
    // 📡 PWA WEB SHARE TARGET INTERCEPTOR ROUTE
    // =========================================================================
    const interceptSharedPDFStream = async () => {
        const url = new URL(window.location.href);
        
        // Match target end route boundaries specified inside the manifest.json
        if (url.pathname.endsWith('/handle-shared-pdf')) {
            console.log("%c[PWA Share Target] Incoming system pipeline stream intercepted!", "color: #6366f1; font-weight: bold;");
            if (window.showLoader) window.showLoader();

            try {
                // Check if ServiceWorker registry contexts are fully bootable
                await navigator.serviceWorker.ready;
                
                // Native system parameters se active POST form data extract karo
                const formData = await new Response(window.location.search).formData().catch(() => null);
                const file = formData ? formData.get('shared_pdf') : null;

                if (file && file.type === "application/pdf") {
                    console.log(`%c[PWA Share Target] Processing file stream: ${file.name}`, "color: #10b981; font-weight: bold;");
                    
                    // Switch interface view layer to Reader mode instantly
                    if (window.render) window.render('ReaderPage');
                    
                    // Trigger dynamic book flip rendering loop (isLocalFile = true flags allocated)
                    setTimeout(() => {
                        if (typeof startBookReader === 'function') {
                            startBookReader(file, true);
                        } else if (window.startBookReader) {
                            window.startBookReader(file, true);
                        }
                    }, 600);
                } else {
                    console.warn("[PWA Share Target] File empty or format mismatch. Bypassing stream.");
                    alert("Bhai, yeh valid PDF file nahi hai.");
                    if (window.render) window.render('home');
                    if (window.hideLoader) window.hideLoader();
                }
            } catch (err) {
                console.error("Critical error inside share target capture array:", err);
                if (window.render) window.render('home');
                if (window.hideLoader) window.hideLoader();
            }
        }
    };
    
    // Fire shared event checking engine
    interceptSharedPDFStream();

    // -------------------------------------------------------------------------
    // 🔐 FIREBASE AUTHENTICATION CORE ROUTER (Asynchronous Stream)
    // -------------------------------------------------------------------------
    observeAuthState(async (user) => {
        // Clear screen containers grids to block resource leaks
        const grid = document.querySelector('.ink-grid');
        if(grid) grid.innerHTML = ''; 

        const urlParams = new URLSearchParams(window.location.search);
        const urlPage = urlParams.get('page');

        // Bypassing default auth redirects if app is handling a local share task
        const isShareAction = window.location.pathname.endsWith('/handle-shared-pdf');

        if (!user) {
            console.warn("🔒 Guest Mode Active: Loading public marketplace.");
            window.currentUserData = null;
            
            renderAuthSystem(null);
            
            try {
                await renderBooksGrid('.ink-grid', 21, null, true);
            } catch (err) {
                console.error("Error rendering guest books grid:", err);
            }

            if (!isShareAction) {
                if (!urlPage) {
                    window.render("home"); 
                } else {
                    window.render(urlPage);
                }
            }
            
            // Sync dynamic components for guest mode view layer
            try { await syncCategoriesToNavbar(db, '#categoriesNavContainer'); } catch(e){}
            try { await syncStaticToDynamic(db, '#ceo-avatar', 'founderimg1'); } catch(e){}
            try { await initHeroRotationEngine(db); } catch(e){}
            setupBackButtonHandler();

            if (!isShareAction) window.hideLoader();
            return; 
        }

        // 🟢 USER LOGGED IN PATH
        let userData = { ...user };
        
        const lastAdDate = userData.lastAdTimestamp ? new Date(userData.lastAdTimestamp).toDateString() : "";
        const todayDate = new Date().toDateString();

        if (lastAdDate !== todayDate && userData.adsWatchedToday > 0) {
            console.log("🌞 New day detected! Resetting daily ad limits locally & on cloud.");
            userData.adsWatchedToday = 0;
            
            if (window.updateData) {
                await window.updateData("users", userData.uid, { adsWatchedToday: 0 });
            }
        }

        window.currentUserData = userData; 
        
        try {
            await renderBooksGrid('.ink-grid', 21, window.currentUserData, true);
        } catch (err) {
            console.error("Error rendering logged-in books grid node:", err);
        }
        
        renderAuthSystem(window.currentUserData);
        
        if (typeof window.syncFloatingWidgetState === 'function') {
            window.syncFloatingWidgetState(window.currentUserData);
        }
        
        // =========================================================================
        // 💳 INSTAMOJO ROUTER: PAYMENT SUCCESS RESPONSE CHECK
        // =========================================================================
        const paymentId = urlParams.get('payment_id');
        const paymentStatus = urlParams.get('payment_status'); 
        const redirectBookId = urlParams.get('bookId');       

        if (paymentId && paymentStatus === 'Credit' && redirectBookId) {
            window.showLoader(); 
            try {
                if (typeof window.unlockBookInFirestore === 'function') {
                    await window.unlockBookInFirestore(redirectBookId); 
                }
                alert("Payment Successful! Your book has been unlocked successfully. 📚✨");
                const cleanURL = window.location.origin + window.location.pathname + "?page=LibraryPage";
                window.history.replaceState({}, document.title, cleanURL);
                window.render("LibraryPage");
            } catch (error) {
                console.error("Error unlocking book post-purchase:", error);
                alert("Payment received, but error unlocking book. Contact Support.");
            }
            window.hideLoader(); 
            return; 
        }

        // =========================================================================
        // 🌐 DEEP LINKING ROUTER AUTOMATION (Shared Links Engine)
        // =========================================================================
        const targetPage = urlParams.get('page'); 
        const sharedBookId = urlParams.get('id');
        let defaultPage = "home"; 

        if (targetPage === 'BookDetailsPage' && sharedBookId) {
            defaultPage = "BookPage"; 
            setTimeout(() => {
                window.render("BookPage");
                const dummyElement = document.createElement('div');
                try {
                    animateBookClick(dummyElement, sharedBookId); 
                } catch (err) {
                    console.error("Error triggering book click animation:", err);
                }
            }, 100);
        }
        
        if (window.currentUserData) {
            try {
                await fetchAndRenderLibrary(window.currentUserData);
            } catch (err) {
                console.warn("Library data bypass node exception caught:", err);
            }
        }

        // Sync core UI elements from cloud matrices safely
        try { await syncCategoriesToNavbar(db, '#categoriesNavContainer'); } catch(e){}
        try {
            await syncStaticToDynamic(db, '#ceo-avatar', 'founderimg1');
        } catch (err) {
            console.error("Static elements loading pipeline slow/broken.");
        }

        // =========================================================================
        // 🧠 DYNAMIC LAYOUT PAGE ROUTER (The Blank Screen Fix)
        // =========================================================================
        if (!isShareAction) {
            if (!urlPage) {
                window.render(defaultPage); 
            } else if (urlPage && urlPage !== 'BookDetailsPage') {
                window.render(urlPage);
            }
        }
        
        try {
            await initHeroRotationEngine(db);
        } catch(e) {
            console.error("Hero slider engine error:", e);
        }

        setupBackButtonHandler();

        if (!isShareAction) window.hideLoader();
    });
    
    renderAuthSystem(null, 'login');
});

// =========================================================================
// 🧠 CENTRAL DISPLAY DISPLAY PROCESSING ENGINE (The Core Router)
// =========================================================================
window.render = (pageId) => {
    if (window.history.state !== 'app-active') {
        window.history.pushState('app-active', document.title, window.location.href);
    }

    const pages = [
      'home', 
      'profile',
      'BookPage',
      'LibraryPage',
      'ReaderPage',
      'SettingPage',
      'latestBooksPage',
      'premiumBooksPage',
      'wishList-page',
      'login',
      'categoryPage' // Registered Category Section Component
    ]; 

    pages.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            if (id === pageId) {
                section.style.display = 'block';         
                section.classList.add('animate-in');     
            } else {
                section.style.display = 'none';          
            }
        }
    });
    
    if (pageId === 'LibraryPage' && window.currentUserData) {
        if (typeof window.fetchAndRenderLibrary === 'function') {
            window.fetchAndRenderLibrary(window.currentUserData);
        } else if (typeof fetchAndRenderLibrary === 'function') {
            fetchAndRenderLibrary(window.currentUserData);
        }
    }
    
    if (pageId !== 'ReaderPage') {
        if (window.readingWakeLock && typeof window.readingWakeLock.release === 'function') {
            window.readingWakeLock.release();
        }
        if (window.speechPlayer && typeof window.speechPlayer.stop === 'function') {
            window.speechPlayer.stop();
        }
    }



if (pageId === 'LibraryPage' && bookId) {
    document.title = `Read Book ${bookId} | TalkInk Premium`;
    document.querySelector('meta[name="description"]').setAttribute("content", `Listen to the exclusive AI audio explanation for Book ID: ${bookId} inside TalkInk vault.`);
}







    window.scrollTo(0, 0);
};

// =========================================================================
// 📱 MOBILE HARDWARE BACK BUTTON HANDLER
// =========================================================================
const setupBackButtonHandler = () => {
    if (window.history.state !== 'app-active') {
        window.history.pushState('app-active', document.title, window.location.href);
    }

    window.addEventListener('popstate', (event) => {
        let currentPage = 'home';
        const pages = [
          'home', 
          'profile', 
          'BookPage', 
          'LibraryPage', 
          'ReaderPage', 
          'SettingPage', 
          'latestBooksPage', 
          'premiumBooksPage', 
          'wishList-page',
          'login',
          'categoryPage' // Added validation route for category navigation back events
        ];
        
        pages.forEach(id => {
            const section = document.getElementById(id);
            if (section && section.style.display === 'block') {
                currentPage = id;
            }
        });

        if (currentPage !== 'home' && currentPage !== 'login') {
            window.render('home');
            window.history.pushState('app-active', document.title, window.location.href);
        } else {
            console.log("Exiting view states.");
        }
    });
};

// =========================================================================
// 🏆 CUSTOM TALKINK REWARD SUCCESS POP-UP ENGINE
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('reward') === 'success') {
        const rewardToast = document.createElement('div');
        rewardToast.id = 'talkink-success-toast';
        
        rewardToast.innerHTML = `
            <div class="toast-glow-boundary"></div>
            <div class="toast-content-wrapper">
                <div class="toast-icon-wrapper">
                    <span class="toast-emoji">🪙</span>
                    <div class="toast-emoji-pulse"></div>
                </div>
                <div class="toast-text-group">
                    <h3>MISSION UPDATED!</h3>
                    <p>+50 Coins securely added to your wallet.</p>
                </div>
                <button class="toast-close-x" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="toast-progress-timeline"></div>
        `;
        
        document.body.appendChild(rewardToast);
        
        const style = document.createElement('style');
        style.innerHTML = `
            #talkink-success-toast {
                position: fixed;
                top: 25px;
                right: 25px;
                background: rgba(15, 23, 42, 0.85);
                border: 1px solid rgba(99, 102, 241, 0.35);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border-radius: 16px;
                padding: 18px 24px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                z-index: 100001;
                width: 320px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 
                            inset 0 0 15px rgba(168, 85, 247, 0.1);
                overflow: hidden;
                animation: toastSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25) forwards;
            }
            .toast-glow-boundary {
                position: absolute;
                inset: 0;
                background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.15), transparent);
                transform: translateX(-100%);
                animation: boundaryShimmer 2.5s infinite linear;
                pointer-events: none;
            }
            .toast-content-wrapper { display: flex; align-items: center; gap: 16px; position: relative; z-index: 2; }
            .toast-icon-wrapper { position: relative; width: 42px; height: 42px; background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .toast-emoji { font-size: 1.35rem; z-index: 3; filter: drop-shadow(0 0 6px #eab308); animation: coinSpinEffect 3s infinite linear; }
            .toast-emoji-pulse { position: absolute; inset: -2px; border: 2px solid rgba(234, 179, 8, 0.4); border-radius: 50%; animation: toastRadar 1.5s infinite linear; }
            .toast-text-group { flex-grow: 1; }
            .toast-text-group h3 { margin: 0 0 2px 0; color: #ffffff; font-size: 0.95rem; font-weight: 800; letter-spacing: 1px; background: linear-gradient(90deg, #ffffff, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .toast-text-group p { margin: 0; color: rgba(248, 250, 252, 0.5); font-size: 0.75rem; font-weight: 500; line-height: 1.3; }
            .toast-close-x { background: transparent; border: none; color: rgba(255, 255, 255, 0.4); cursor: pointer; font-size: 0.85rem; transition: color 0.2s; padding: 5px; }
            .toast-close-x:hover { color: #ef4444; }
            .toast-progress-timeline { height: 3px; background: linear-gradient(90deg, #6366f1, #a855f7); width: 100%; border-radius: 2px; align-self: flex-start; transform-origin: left; animation: progressShrink 4s linear forwards; }
            @keyframes toastSlideIn { 0% { transform: translateX(50px) scale(0.9); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
            @keyframes toastFadeOut { 0% { transform: translateX(0) scale(1); opacity: 1; } 100% { transform: translateX(30px) scale(0.9); opacity: 0; } }
            @keyframes boundaryShimmer { 100% { transform: translateX(100%); } }
            @keyframes coinSpinEffect { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
            @keyframes toastRadar { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
            @keyframes progressShrink { 100% { transform: scaleX(0); } }
            @media (max-width: 480px) { #talkink-success-toast { top: auto; bottom: 20px; right: 5%; left: 5%; width: 90%; box-sizing: border-box; } }
        `;
        document.head.appendChild(style);

        if (window.currentUserData) {
            window.currentUserData.coins = (window.currentUserData.coins || 0) + 50;
            window.currentUserData.adsWatchedToday = (window.currentUserData.adsWatchedToday || 0) + 1;
            
            if (typeof window.syncFloatingWidgetState === 'function') {
                window.syncFloatingWidgetState(window.currentUserData);
            }
        }

        setTimeout(() => {
            if (rewardToast) {
                rewardToast.style.animation = "toastFadeOut 0.4s ease-in forwards";
                setTimeout(() => rewardToast.remove(), 400);
            }
        }, 4000);

        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
