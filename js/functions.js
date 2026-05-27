// functions.js - Part 1/3
import { 
    registerUser, 
    loginUser, 
    loginWithGoogle, 
    resetPassword, 
    getPaginatedData, 
    db, 
    auth 
} from './firebase.js';

// =========================================================================
// 📦 FIRESTORE CORE MODULES IMPORTS (Fixed: Added getDocs)
// =========================================================================
import { 
    getDoc, 
    getDocs,     // 🔥 YEH MISSING THA, ISE AB ADD KAR DIYA HAI!
    doc, 
    updateDoc, 
    arrayUnion,
    collection,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";








/**
 * GLOBAL LOADER SYSTEM
 * Handles the visual loading state across the app
 */
const injectLoader = () => {
    if (document.getElementById('ink-global-loader')) return;

    const loaderHTML = `
        <div id="ink-global-loader" class="loader-overlay">
            <div class="loader-content">
                <div class="ink-logo-animation">
                    <div class="ink-drop"></div>
                    <div class="ink-circle"></div>
                    <div class="ink-circle"></div>
                </div>
                <div class="loader-text">
                    <span class="letter">T</span><span class="letter">A</span><span class="letter">L</span><span class="letter">K</span>
                    <span class="letter">I</span><span class="letter">N</span><span class="letter">K</span>
                </div>
                <div class="loader-progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loaderHTML);
};

window.showLoader = () => {
    injectLoader();
    const loader = document.getElementById('ink-global-loader');
    loader.style.display = 'flex';
    setTimeout(() => loader.classList.add('active'), 10);
};

window.hideLoader = () => {
    const loader = document.getElementById('ink-global-loader');
    if (loader) {
        loader.classList.remove('active');
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
};

let lastVisible = null;






// =========================================================================
// 📚 UNIVERSAL REUSABLE GRID RENDERER ENGINE (Next & Previous Navigation Enabled)
// =========================================================================
export const renderBooksGrid = async (containerSelector, pageSize = 20, currentUserData = null, shouldShuffle = false, categoryFilter = null, dbInstance = null, isNavigationTrigger = false) => {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`🚨 Container not found for selector: ${containerSelector}`);
        return;
    }

    // Tracker Key engine (Humesha clean 'ink-grid' string dega)
    const trackerKey = containerSelector
        .trim()
        .replace(/^[.#]/, '')          
        .replace(/[.#\s]+/g, '_');     

    // 🧠 INITIALIZE ADVANCED NAVIGATION HISTORY TRACKER STACKS
    if (!window.gridPaginationTrackers) {
        window.gridPaginationTrackers = {};
    }
    if (!window.gridNavigationHistory) {
        window.gridNavigationHistory = {}; // Har trackerKey ki page snapshots history rakhega
    }
    if (!window.gridNavigationHistory[trackerKey]) {
        window.gridNavigationHistory[trackerKey] = []; // Array stack for backtracking
    }

    // Agar pehli baar load ho raha hai (Na ki Next/Prev click se), toh stack reset karo
    if (!isNavigationTrigger) {
        window.gridPaginationTrackers[trackerKey] = null;
        window.gridNavigationHistory[trackerKey] = [];
        container.innerHTML = ""; // Clean grid view state for fresh entry
    }

    window.showLoader(); 

    let response;
    const activeDB = dbInstance || db || window.db;

    // Firebase methods dynamic checks
    const firestoreLimit = typeof limit === 'function' ? limit : window.limit;
    const firestoreStartAfter = typeof startAfter === 'function' ? startAfter : window.startAfter;

    // --- 📡 DATA FETCHING MATRIX ---
    if (categoryFilter && categoryFilter !== 'all') {
        try {
            const booksRef = collection(activeDB, 'books');
            let q = query(booksRef, where("categoryId", "array-contains", categoryFilter));
            
            // Apply forward anchor point pointer matching from tracker cache
            if (window.gridPaginationTrackers[trackerKey] && typeof firestoreStartAfter === 'function') {
                q = query(q, firestoreStartAfter(window.gridPaginationTrackers[trackerKey]));
            }
            
            if (typeof firestoreLimit === 'function') {
                q = query(q, firestoreLimit(pageSize));
            }

            const snapshot = await getDocs(q);
            const firstDoc = snapshot.docs[0] || null;
            const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            response = { success: true, data: data, firstDoc: firstDoc, lastDoc: lastDoc };
        } catch (err) {
            console.error("Error fetching filtered array documents:", err);
            response = { success: false, data: [] };
        }
    } else {
        // Regular global marketplace routing fallback pipeline
        // (Note: Hum default getPaginatedData call kar rahe hain purane module parameters ko block na karne ke liye)
        response = await getPaginatedData('books', pageSize, window.gridPaginationTrackers[trackerKey]);
        // Polyfill features for standard responses structure compatibility
        if(response.success && response.data.length > 0) {
            response.firstDoc = "calculated_internally"; // Checked dynamic token fallback
        }
    }
    
    // Boundary structural validator check
    if (!response.success || response.data.length === 0) {
        const existingActionsZone = document.getElementById(`navActionsZone_${trackerKey}`);
        if (existingActionsZone) existingActionsZone.remove();
        window.hideLoader();
        return;
    }

    // If it's a valid navigation movement, clear the previous view to load the clean current chunk
    if (isNavigationTrigger) {
        container.innerHTML = ""; 
    }

    const purchasedList = currentUserData?.purchasedBooks || [];
    let cardsHTML = '';

    // Shuffle sequence
    let booksDataBatch = [...response.data]; 
    if (shouldShuffle) {
        for (let i = booksDataBatch.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [booksDataBatch[i], booksDataBatch[j]] = [booksDataBatch[j], booksDataBatch[i]];
        }
    }

    // --- 📦 CORE CARDS LOOP (Tumhara Original CSS/HTML Card Architecture) ---
    booksDataBatch.forEach(book => {
        const isPurchased = purchasedList.includes(book.id);
        const isFree = Number(book.price) === 0;
        const authorName = book.author || "Unknown";
        const currentCover = book.coverURL || book.coverImage || 'Dummy.jpg';

        if (isPurchased || isFree) {
            const clickAction = isPurchased ? `openReader('${book.id}')` : `animateBookClick(this, '${book.id}')`;
            cardsHTML += `
                <div class="ink-card purchased" onclick="${clickAction}">
                    <div class="card-visual"><img src="${currentCover}" alt="${book.title}"><div class="pdf-tag">PDF</div></div>
                    <div class="card-info">
                        <h3>${book.title}</h3>
                        <div class="meta-tags"><span>By ${authorName}</span></div>
                        <div class="price-bar"><span class="owned-text">${isFree && !isPurchased ? 'FREE' : 'READ'}</span></div>
                    </div>
                </div>`;
        } else {
            cardsHTML += `
                <div class="ink-card" onclick="openDetails('${book.id}')">
                    <div class="card-visual"><img src="${currentCover}" alt="${book.title}"><div class="ink-badge">PREMIUM</div></div>
                    <div class="card-info">
                        <h3>${book.title}</h3>
                        <div class="meta-tags"><span>By ${authorName}</span></div>
                        <div class="price-bar"><span class="price-val">₹${book.price}</span></div>
                    </div>
                </div>`;
        }
    });

    // Old button row cleaner to stop duplicate injections rows layers
    const oldActionsZone = document.getElementById(`navActionsZone_${trackerKey}`);
    if (oldActionsZone) oldActionsZone.remove();
    
    // Inject freshly compiled HTML cards
    container.insertAdjacentHTML('beforeend', cardsHTML);

    // --- 🎛️ NEW ADVANCED DUAL BUTTON SYSTEM GATEWAY ---
    const historyStack = window.gridNavigationHistory[trackerKey];
    const hasPrevious = historyStack.length > 0;
    const hasNext = response.data.length === pageSize;

    if (hasPrevious || hasNext) {
        const navActionsHTML = `
            <div id="navActionsZone_${trackerKey}" style="grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; gap: 20px; padding: 40px 0; width: 100%;">
                
                <button id="prevBtn_${trackerKey}" style="
                    background: ${hasPrevious ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)'}; 
                    color: ${hasPrevious ? '#6366f1' : '#475569'}; 
                    border: 1px solid ${hasPrevious ? 'rgba(99, 102, 241, 0.4)' : 'rgba(71, 85, 105, 0.2)'};
                    padding: 12px 35px; border-radius: 50px; font-weight: 700; font-size: 0.85rem; 
                    cursor: ${hasPrevious ? 'pointer' : 'not-allowed'}; transition: 0.3s all ease;
                    display: flex; align-items: center; gap: 8px;
                "
                ${!hasPrevious ? 'disabled' : ''}
                onmouseover="${hasPrevious ? "this.style.background='#6366f1'; this.style.color='#fff';" : ""}"
                onmouseout="${hasPrevious ? "this.style.background='rgba(255, 255, 255, 0.03)'; this.style.color='#6366f1';" : ""}"
                >
                    <i class="fa-solid fa-arrow-left"></i> Previous
                </button>

                <button id="nextBtn_${trackerKey}" style="
                    background: ${hasNext ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)'}; 
                    color: ${hasNext ? '#6366f1' : '#475569'}; 
                    border: 1px solid ${hasNext ? 'rgba(99, 102, 241, 0.4)' : 'rgba(71, 85, 105, 0.2)'};
                    padding: 12px 35px; border-radius: 50px; font-weight: 700; font-size: 0.85rem; 
                    cursor: ${hasNext ? 'pointer' : 'not-allowed'}; transition: 0.3s all ease;
                    display: flex; align-items: center; gap: 8px;
                "
                ${!hasNext ? 'disabled' : ''}
                onmouseover="${hasNext ? "this.style.background='#6366f1'; this.style.color='#fff';" : ""}"
                onmouseout="${hasNext ? "this.style.background='rgba(255, 255, 255, 0.03)'; this.style.color='#6366f1';" : ""}"
                >
                    Next <i class="fa-solid fa-arrow-right"></i>
                </button>

            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', navActionsHTML);

        // --- ⚡ NEXT EVENT LISTENER ACTION ---
        if (hasNext) {
            document.getElementById(`nextBtn_${trackerKey}`).addEventListener('click', () => {
                // Agle page par jaane se pehle current reference to history stack me push karo tracking backup ke liye
                historyStack.push(window.gridPaginationTrackers[trackerKey]);
                
                // Advance forward cursor pointer reference positions
                window.gridPaginationTrackers[trackerKey] = response.lastDoc;
                
                // Recall grid rendering with navigation processing flag set to TRUE
                renderBooksGrid(containerSelector, pageSize, currentUserData, shouldShuffle, categoryFilter, activeDB, true);
                window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
            });
        }

        // --- ⚡ PREVIOUS EVENT LISTENER ACTION ---
        if (hasPrevious) {
            document.getElementById(`prevBtn_${trackerKey}`).addEventListener('click', () => {
                // Stack framework array se purana tracking reference pop out karo
                const previousAnchor = historyStack.pop();
                
                // Rollback target dynamic parameters indices references snapshots pointers
                window.gridPaginationTrackers[trackerKey] = previousAnchor;
                
                // Recall matrix sync loader sequence
                renderBooksGrid(containerSelector, pageSize, currentUserData, shouldShuffle, categoryFilter, activeDB, true);
                window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
            });
        }
    }
 
    window.hideLoader();
};
















// functions.js - Part 2/3

/**
 * AUTH SYSTEM
 * Handles Login, Signup, Google Auth, and Password Reset UI
 */
export const renderAuthSystem = (user = null, type = 'login') => {
    const profileSection = document.getElementById('profile');
    if (!profileSection) return;

    // 1. If user is already logged in, show profile instead
    if (user) {
        renderUserProfile(profileSection, user);
        return;
    }

    // 2. Forgot Password View
    if (type === 'forgot') {
        profileSection.innerHTML = `
            <div class="auth-wrapper animate-in">
                <button class="back-btn" onclick="renderAuthSystem(null, 'login')"><i class="fa-solid fa-arrow-left"></i> Back</button>
                <h2 class="auth-title">Reset Key</h2>
                <form id="resetForm" class="auth-form">
                    <div class="input-box"><i class="fa-solid fa-envelope"></i><input type="email" id="resetEmail" placeholder="Email" required></div>
                    <button type="submit" class="submit-btn">Send Link</button>
                </form>
                <div id="resetStatus"></div>
            </div>`;
    } else {
        // 3. Login & Signup Views
        profileSection.innerHTML = `
            <div class="auth-wrapper animate-in">
                <div class="auth-toggle">
                    <button class="${type === 'login' ? 'active' : ''}" id="loginToggle">Login</button>
                    <button class="${type === 'signup' ? 'active' : ''}" id="signupToggle">Sign Up</button>
                </div>
                <h2 class="auth-title">${type === 'login' ? 'Enter Vault' : 'New Identity'}</h2>
                <form id="authForm" class="auth-form">
                    ${type === 'signup' ? `<div class="input-box"><i class="fa-solid fa-user"></i><input type="text" id="regName" placeholder="Full Name" required></div>` : ''}
                    <div class="input-box"><i class="fa-solid fa-envelope"></i><input type="email" id="email" placeholder="Email" required></div>
                    <div class="input-box"><i class="fa-solid fa-lock"></i><input type="password" id="password" placeholder="Password" required><i class="fa-solid fa-eye-slash toggle-pass" onclick="togglePassView('password')"></i></div>
                    ${type === 'signup' ? `<div class="input-box"><i class="fa-solid fa-shield"></i><input type="password" id="confirmPassword" placeholder="Confirm" required><i class="fa-solid fa-eye-slash toggle-pass" onclick="togglePassView('confirmPassword')"></i></div>` : `<p class="forgot-link" onclick="renderAuthSystem(null, 'forgot')">Forgot Password?</p>`}
                    <button type="submit" class="submit-btn">${type === 'login' ? 'Authorize' : 'Initialize'}</button>
                </form>
                <div class="divider"><span>OR</span></div>
                <div class="social-auth">
                    <button class="google-btn" id="googleBtn"><img src="https://img.icons8.com/color/48/000000/google-logo.png" /> Google</button>
                </div>
            </div>`;
    }

    // Attach Event Listeners after DOM update
    setTimeout(() => {
        document.getElementById('loginToggle')?.addEventListener('click', () => renderAuthSystem(null, 'login'));
        document.getElementById('signupToggle')?.addEventListener('click', () => renderAuthSystem(null, 'signup'));

        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('.submit-btn');
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

                try {
                    let res;
                    if (type === 'signup') {
                        const name = document.getElementById('regName').value;
                        const confirmPass = document.getElementById('confirmPassword').value;
                        if (password !== confirmPass) throw new Error("Passwords do not match!");
                        res = await registerUser(email, password, name);
                    } else {
                        res = await loginUser(email, password);
                    }

                    if (res && res.success) window.location.reload();
                    else throw new Error(res.error || "Authentication failed.");

                } catch (err) {
                    alert(err.message);
                    submitBtn.disabled = false;
                    submitBtn.innerText = (type === 'login') ? 'Authorize' : 'Initialize';
                }
            });
        }

        document.getElementById('googleBtn')?.addEventListener('click', async () => {
            try {
                const res = await loginWithGoogle();
                if (res && res.success) window.location.reload();
            } catch (err) { console.error("Google Auth Error:", err); }
        });

        document.getElementById('resetForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('resetStatus');
            statusDiv.innerHTML = "Sending link...";
            const res = await resetPassword(document.getElementById('resetEmail').value);
            statusDiv.style.color = res.success ? "#10b981" : "#ef4444";
            statusDiv.innerText = res.success ? "Check your email!" : res.error;
        });
    }, 100);
};

/**
 * USER PROFILE
 * Renders the logged-in user dashboard with dynamic zero-storage avatars
 */
export const renderUserProfile = (container, user) => {
    // 🛠️ DYNAMIC PHOTO PIPELINE MECHANISM
    let profilePhotoURL = user.photoURL;

    if (!profilePhotoURL) {
        // Agar image null hai, toh email string ya name se initials generate karo
        const fallbackName = user.displayName || user.email.split('@')[0];
        // CDN dynamic initial grid generator linked using app brand accent hex code (#6366f1)
        profilePhotoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=6366f1&color=fff&bold=true`;
    }

    container.innerHTML = `
        <div class="profile-card animate-in">
            <div class="user-meta">
                <div class="img-wrapper">
                    <img src="${profilePhotoURL}" class="profile-img" alt="User">
                    <div class="status-indicator"></div>
                </div>
                <h2>Welcome, ${user.displayName || 'Reader'}<span>.</span></h2>
                <p class="user-mail">${user.email}</p>
            </div>
            <div class="profile-actions">
                <button onclick="render('LibraryPage')" class="action-btn" id="libraryBtn"><i class="fa-solid fa-book-open"></i> My Library</button>
                <button onclick="window.openSettingPageStore()" class="action-btn" id="settingsBtn"><i class="fa-solid fa-gear"></i> Settings</button>
                <button class="logout-btn" id="logoutBtn"><i class="fa-solid fa-power-off"></i> Logout</button>
            </div>
        </div>
    `;

    // Sync header navigation tiny profile thumbnail image
    const headerImg = document.getElementById("profimg");
    if (headerImg) headerImg.src = profilePhotoURL;

    setTimeout(() => {
        document.getElementById('logoutBtn')?.addEventListener('click', showLogoutPopup);
    }, 50);
};

/**
 * LOGOUT POPUP
 * Custom confirmation modal for logging out
 */
const showLogoutPopup = () => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay animate-in';
    overlay.innerHTML = `
        <div class="confirm-modal">
            <div class="modal-icon"><i class="fa-solid fa-door-open"></i></div>
            <h3>Seal the Vault?</h3>
            <p>Are you sure you want to log out?</p>
            <div class="modal-btns">
                <button class="cancel-modal" id="cancelLogout">Stay</button>
                <button class="confirm-modal-btn" id="confirmLogout">Logout</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('cancelLogout').onclick = () => overlay.remove();
    document.getElementById('confirmLogout').onclick = async () => {
        const { logoutUser } = await import('./firebase.js');
        await logoutUser();
        window.location.reload();
    };
};

// Global Helpers for Auth
window.renderAuthSystem = renderAuthSystem;
window.togglePassView = (id) => {
    const input = document.getElementById(id);
    const icon = event.currentTarget;
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye-slash');
    icon.classList.toggle('fa-eye');
};











export const animateBookClick = (target, bookId) => {
    if (!target) return;
    target.style.transform = "scale(0.96) translateY(-5px)";
    setTimeout(() => {
        target.style.transform = "";
        showBookDetails(bookId);
    }, 150);
};




// =========================================================================
// 📚 BOOK DETAILS & DYNAMIC FREE-CONDITIONAL LOGIC PIPELINE
// =========================================================================
export const showBookDetails = async (bookId) => {
    window.showLoader();
    try {
        const user = auth.currentUser;
        if (!user) {
            window.hideLoader();
            window.render("profile");
            return;
        }

        const bookSnap = await getDoc(doc(db, "books", bookId));
        if (!bookSnap.exists()) throw new Error("Book not found!");

        const bookData = bookSnap.data();
        const userData = window.currentUserData || {};
        
        // Ownership nodes validation
        const isPurchased = userData.purchasedBooks?.includes(bookId);
        const isFree = Number(bookData.price) === 0;

        // 🟢 RULE 1: Agar user ne premium book pehle se kharid rakhi hai, toh seedha reader kholo
        if (isPurchased) {
            window.hideLoader();
            window.openReader(bookId);
            return;
        }

        // 🟡 RULE 2: Agar free book hai, toh check karo ki popup open karna hai ya nahi
        const currentActivePage = window.currentRenderedPage; 
        const popupElement = document.getElementById('freeBookPopup');

        if (isFree && currentActivePage !== 'BookDetailsPage' && popupElement) {
            window.hideLoader();
            popupElement.classList.add('active'); 

            // Action A: Just Read (Direct bypass path to streaming canvas - No Permanent Save)
            document.getElementById('freeJustReadBtn').onclick = () => {
                popupElement.classList.remove('active');
                window.openReader(bookId);
            };

            // Action B: Show Details
            document.getElementById('freeShowDetailsBtn').onclick = () => {
                popupElement.classList.remove('active');
                console.log("🔄 Redirecting from popup overlay to structured book details core...");
                
                window.currentRenderedPage = 'BookDetailsPage'; 
                showBookDetails(bookId);
            };
            return;
        }

        // --- FULL REGULAR DATA BINDING (For Paid Books & Free Details Target) ---
        window.render("BookPage"); 

        const safeSet = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
        
        safeSet('detailTitle', bookData.title || "Untitled");
        safeSet('detailAuthor', bookData.author || "Unknown");
        
        // Dynamic Price Element text state mapping
        const priceElement = document.getElementById('detailPrice');
        if (priceElement) {
            if (isFree) {
                priceElement.innerText = `FREE`;
                priceElement.style.color = "#10b981"; 
            } else {
                priceElement.innerText = `₹${bookData.price}`;
                priceElement.style.color = ""; 
            }
        }
        
        safeSet('detailDesc', bookData.description || "No description available.");
        safeSet('detailOldPrice', bookData.oldPrice ? `₹${bookData.oldPrice}` : '');
        safeSet('detailGenre', bookData.genre || "Story");
        safeSet('detailPages', `${bookData.pages || 'N/A'} Pages`);
        safeSet('detailLang', bookData.language || "Hindi");

        // Discount Tag Matrix Renderer
        const discountTag = document.getElementById('detailDiscount');
        if (discountTag && !isFree && bookData.oldPrice > bookData.price) {
            const discPercent = Math.round(((bookData.oldPrice - bookData.price) / bookData.oldPrice) * 100);
            discountTag.innerText = `${discPercent}% OFF`;
            discountTag.style.display = "inline-block";
        } else if (discountTag && isFree && bookData.oldPrice) {
            discountTag.innerText = `100% OFF`;
            discountTag.style.display = "inline-block";
        } else if (discountTag) {
            discountTag.style.display = "none";
        }

        // Slider & Carousel Dots Logic
        const track = document.getElementById('mediaTrack');
        const dotsContainer = document.getElementById('mediaDots');
        const scrollContainer = document.getElementById('scrollContainer');
        
        if (track && dotsContainer && scrollContainer) {
            track.innerHTML = ""; 
            dotsContainer.innerHTML = "";
            const images = bookData.previewImages?.length > 0 ? bookData.previewImages : [bookData.coverURL];
            
            images.forEach((imgUrl, index) => {
                const img = document.createElement('img');
                img.src = imgUrl;
                track.appendChild(img);
                
                const dot = document.createElement('div');
                dot.className = `dot ${index === 0 ? 'active' : ''}`;
                dotsContainer.appendChild(dot);
            });

            scrollContainer.scrollLeft = 0;
            scrollContainer.onscroll = () => {
                const activeIndex = Math.round(scrollContainer.scrollLeft / scrollContainer.clientWidth);
                dotsContainer.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
            };
        }


        // --- 🎯 ACTION BAR ACTIONS INJECTIONS (DYNAMIC ROUTING FIXED) ---
        const buyBtn = document.getElementById('buyAction');
        if (buyBtn) {
            buyBtn.setAttribute('data-book-id', bookId);
            
            if (isFree) {
                // 🟢 CONDITION 1: BOOK IS 100% FREE -> Force Wishlist Intercept Confirmation Popup
                buyBtn.innerHTML = `<i class="fa-solid fa-heart-circle-plus"></i> Save Free Book`;
                buyBtn.style.background = "#10b981"; 
                
                buyBtn.onclick = () => {
                    console.log("🎁 Free Book Interceptor Triggered. Showing English warning matrix...");
                    triggerActionConfirmation({
                        title: "Save Free Book?",
                        desc: "This book is free, if you want to save it you can save it in your wish list.",
                        action: async () => {
                            await executeFreeBookWishlistLogic(bookId, user);
                        }
                    });
                };
            } else {
                // 🔴 CONDITION 2: BOOK IS PREMIUM (Price > 0 -> Kept inside Library Route)
                buyBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Buy Now`;
                buyBtn.style.background = ""; 

                buyBtn.onclick = () => {
                    if (bookData.isFeatured === true) {
                        console.log("🪙 Featured Book detected. Redirecting context to Coin Module...");
                        openCoinPurchaseGateway(bookId, bookData.price);
                    } else {
                        initiatePurchase(bookId, bookData.price);
                    }
                };
            }
        }

        // =========================================================================
        // 🔗 NATIVE MOBILE WEB SHARE API INTEGRATION
        // =========================================================================
        const shareBtn = document.querySelector('.share-trigger');
        if (shareBtn) {
            shareBtn.onclick = async () => {
                const shareURL = `${window.location.origin}?page=BookDetailsPage&id=${bookId}`;
                const shareTitle = bookData.title || "Check out this amazing book!";
                const shareText = `Hey! Check out "${shareTitle}" by ${bookData.author || 'Unknown Author'} on our platform! 📚🎧`;

                if (navigator.share) {
                    try {
                        await navigator.share({ title: shareTitle, text: shareText, url: shareURL });
                        console.log("🚀 Vault core share link broadcasted successfully!");
                    } catch (shareErr) {
                        console.log("Share sheet dismissed by user:", shareErr);
                    }
                } else {
                    try {
                        await navigator.clipboard.writeText(shareURL);
                        alert("Sharing Link copied to clipboard vault! 🎉\nYou can now paste and share it anywhere.");
                    } catch (copyErr) {
                        console.error("Clipboard node execution blocked:", copyErr);
                        alert(`Copy link manually: ${shareURL}`);
                    }
                }
            };
        }

        // =========================================================================
        // ❤️ WISHLIST MATRIX & ANIMATION ENGINE (Standard Side-Heart Trigger)
        // =========================================================================
        const wishlistBtn = document.getElementById('wishlistAction');
        if (wishlistBtn) {
            const heartIcon = wishlistBtn.querySelector('i');
            
            const currentWishlist = window.currentUserData?.wishlist || [];
            const isAlreadyWishlisted = currentWishlist.includes(bookId);

            if (isAlreadyWishlisted && heartIcon) {
                heartIcon.className = "fa-solid fa-heart";
                wishlistBtn.style.color = "#ef4444"; 
            } else if (heartIcon) {
                heartIcon.className = "fa-regular fa-heart";
                wishlistBtn.style.color = ""; 
            }

            wishlistBtn.onclick = async () => {
                wishlistBtn.style.transform = "scale(0.8)";
                
                if (heartIcon) {
                    heartIcon.className = "fa-solid fa-heart"; 
                    wishlistBtn.style.color = "#ef4444";
                }

                setTimeout(() => {
                    wishlistBtn.style.transform = "scale(1.2)";
                    setTimeout(() => {
                        wishlistBtn.style.transform = "scale(1)";
                    }, 100);
                }, 100);

                const freshWishlist = window.currentUserData?.wishlist || [];
                
                if (!freshWishlist.includes(bookId)) {
                    try {
                        const { getFirestore, doc, updateDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                        const db = getFirestore();
                        const userRef = doc(db, "users", user.uid);
                        
                        await updateDoc(userRef, { wishlist: arrayUnion(bookId) });

                        if (window.currentUserData) {
                            if (!window.currentUserData.wishlist) window.currentUserData.wishlist = [];
                            window.currentUserData.wishlist.push(bookId);
                        }
                    } catch (dbErr) {
                        console.error("Critical failure during wishlist asset binding:", dbErr);
                    }
                } else {
                    console.log("⚡ Token already inside matrix cache vault. Skipping database write protocol.");
                }
            };
        }

        // State page management parameter sync
        window.currentRenderedPage = null; 
        window.hideLoader();
    } catch (error) {
        console.error(error);
        window.hideLoader();
    }
};

// =========================================================================
// 🌐 SYSTEM WIDE CONFIRMATION MODAL UTILITY HANDLERS
// =========================================================================
window.closeConfirmModal = () => {
    const confirmOverlay = document.getElementById('actionConfirmModal');
    if (confirmOverlay) confirmOverlay.style.display = "none";
};

const triggerActionConfirmation = ({ title, desc, action }) => {
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalDesc').innerText = desc;
    
    const proceedBtn = document.getElementById('confirmProceedActionBtn');
    proceedBtn.onclick = () => {
        window.closeConfirmModal(); 
        action(); 
    };

    const confirmOverlay = document.getElementById('actionConfirmModal');
    if (confirmOverlay) confirmOverlay.style.display = "flex";
};

// =========================================================================
// 💝 NEW SAVING MECHANISM: FREE BOOK AUTO-WISHLIST ENGINE (REPLACED LIBRARY CLAIM)
// =========================================================================
const executeFreeBookWishlistLogic = async (bookId, user) => {
    window.showLoader();
    try {
        const freshWishlist = window.currentUserData?.wishlist || [];
        
        // Pehle check karo agar user ne pehle se use wishlist kar rakha hai
        if (freshWishlist.includes(bookId)) {
            window.hideLoader();
            alert("Bhai, yeh book pehle se aapki Wishlist me save hai! ❤️");
            return;
        }

        const { getFirestore, doc, updateDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const db = getFirestore();
        const userRef = doc(db, "users", user.uid);
        
        // Cloud Firestore update -> Saves to wishlist array, completely avoids purchasedBooks array!
        await updateDoc(userRef, {
            wishlist: arrayUnion(bookId)
        });

        // Patch global runtime state memory buffer dynamically
        if (window.currentUserData) {
            if (!window.currentUserData.wishlist) window.currentUserData.wishlist = [];
            window.currentUserData.wishlist.push(bookId);
        }

        console.log("💝 [Cloud Matrix] Free book added to Wishlist instead of Library.");
        window.hideLoader();
        
        // Heart icon UI visual feedback dynamic synchronization
        const wishlistBtn = document.getElementById('wishlistAction');
        if (wishlistBtn) {
            const heartIcon = wishlistBtn.querySelector('i');
            if (heartIcon) heartIcon.className = "fa-solid fa-heart";
            wishlistBtn.style.color = "#ef4444";
        }

        alert("🎉 Saved! This free book has been added to your Wishlist successfully.");
    } catch (dbErr) {
        console.error("Database update error during free book wishlist injection:", dbErr);
        alert("Something went wrong while saving to wishlist.");
        window.hideLoader();
    }
};

















// =========================================================================
// 🎁 CORE FIXED SYSTEM ENGINE FOR FREE BOOK CLAIM INJECTION
// =========================================================================
const executeFreeBookClaimLogic = async (bookId, user) => {
    window.showLoader();
    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            purchasedBooks: arrayUnion(bookId)
        });

        // Patch memory buffer states dynamically
        if (window.currentUserData) {
            if (!window.currentUserData.purchasedBooks) window.currentUserData.purchasedBooks = [];
            window.currentUserData.purchasedBooks.push(bookId);
        }

        console.log("🔥 [Cloud Matrix] Free book claimed and added to database library node.");
        window.hideLoader();
        alert("🎉 Success! Free book added to your vault successfully.");
        window.openReader(bookId); 
    } catch (dbErr) {
        console.error("Database update error during free purchase transaction:", dbErr);
        alert("Something went wrong while adding to library.");
        window.hideLoader();
    }
};


// =========================================================================
// 🪙 REFACTORED COIN GATEWAY MODAL LOGIC WITH DOUBLE INTEGRAL CONFIRMATION
// =========================================================================

window.closeCoinModal = () => {
    const coinModal = document.getElementById('coinPurchaseModal');
    if (coinModal) coinModal.style.display = "none";
    const errorBox = document.getElementById('coinModalError');
    if (errorBox) errorBox.style.display = "none";
};

const openCoinPurchaseGateway = async (bookId, priceValue) => {
    window.showLoader();
    try {
        const user = auth.currentUser;
        const errorBox = document.getElementById('coinModalError');
        if (errorBox) errorBox.style.display = "none";

        const computedPrice = Number(priceValue);
        const requiredCoins = computedPrice * 100;

        // Fetch fresh balance coordinates from Firestore instances
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.data() || {};
        const userAvailableCoins = Number(userData.coins) || 0;

        // Populate text parameters inside core UI element contexts
        document.getElementById('modalUserCoins').innerText = userAvailableCoins.toLocaleString('en-IN');
        document.getElementById('modalRequiredCoins').innerText = `${requiredCoins.toLocaleString('en-IN')} Coins`;
        document.getElementById('modalRequiredCash').innerText = `₹${computedPrice}`;

        const coinModal = document.getElementById('coinPurchaseModal');
        if (coinModal) coinModal.style.display = "flex";
        window.hideLoader();

        // 🔘 GATEWAY INTERACTION PATHWAYS TRIGGERS
        
        // CHOICE A: PROCESS WITH COIN UNLOCK SYSTEM
        document.getElementById('payViaCoinsBtn').onclick = () => {
            if (userAvailableCoins < requiredCoins) {
                if (errorBox) {
                    document.getElementById('errorToastText').innerText = `Insufficient Balance! Need ${requiredCoins - userAvailableCoins} more coins.`;
                    errorBox.style.display = "flex";
                }
                return;
            }

            // If user has enough coins -> Interrupt and display secondary security verification step
            window.closeCoinModal(); // Temporal toggle
            
            triggerActionConfirmation({
                title: "Buy with Coins?",
                desc: `Kya aap sure hain? Ye book aapke library section me add ho jayegi aur aapka coin balance automatic minus (${requiredCoins} Coins) ho jayega.`,
                action: async () => {
                    window.showLoader();
                    try {
                        const { increment } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                        const userRef = doc(db, "users", user.uid);

                        // Execute coordinated atomic writes pool sequence
                        await updateDoc(userRef, {
                            purchasedBooks: arrayUnion(bookId),
                            coins: increment(-requiredCoins)
                        });

                        if (window.currentUserData) {
                            if (!window.currentUserData.purchasedBooks) window.currentUserData.purchasedBooks = [];
                            window.currentUserData.purchasedBooks.push(bookId);
                            window.currentUserData.coins = userAvailableCoins - requiredCoins;
                        }

                        window.hideLoader();
                        alert(`🎉 Premium book unlocked seamlessly using ${requiredCoins} Talkink Coins! Added to your vault.`);
                        window.openReader(bookId);
                    } catch (fsWriteErr) {
                        console.error("Critical core database balance debit error:", fsWriteErr);
                        alert("Database engine failure during transaction process execution.");
                        window.hideLoader();
                    }
                }
            });
        };

        // CHOICE B: LEAVE MODAL INTERACTION WINDOW AND LAUNCH LEGACY CASH SERVER ROUTE
        document.getElementById('payViaCashBtn').onclick = () => {
            window.closeCoinModal();
            console.log("💳 Initializing Instamojo core tunnel configuration pipeline...");
            initiatePurchase(bookId, computedPrice);
        };

    } catch (engineErr) {
        window.hideLoader();
        console.error("Failed executing dynamic runtime configuration mappings:", engineErr);
        alert("Unable to compile fresh user parameters state nodes.");
    }
};



















//  MY PAYMENT MWTHODS 👇👇👇👇👇👇👇👇👇👇 THIS IS THE IMPORTANT PAYMENT SYSTEM // 




const initiatePurchase = async (bookId, originalAmount) => {
    window.showLoader();
    
    try {
        const user = auth.currentUser;
        if (!user) {
            alert("Please authorize your account first!");
            window.render("profile");
            return;
        }

        let finalAmountToPay = originalAmount;
        if (window.appliedDiscountState && window.appliedDiscountState.isValid) {
            finalAmountToPay = window.appliedDiscountState.finalPrice;
        }

        if (Number(finalAmountToPay) === 0) {
            await unlockBookInFirestore(bookId); 
            resetCouponState();
            return;
        }

        // 💳 Render Backend Server ko hit karo
        const res = await fetch('https://talkinkbackend.onrender.com/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: finalAmountToPay,
                purpose: `Purchase Book ID: ${bookId}`,
                buyer_name: user.displayName || "Ganesh User",
                email: user.email,
                bookId: bookId
            })
        });

        const orderData = await res.json();
        window.hideLoader();

        if (res.ok && orderData.success && orderData.longurl) {
            // 🎯 TEST MODE FIX: Instamojo overlay pop-up block hone se bachne ke liye 
            // seedhe user ko Instamojo ke safe test check-out page par redirect karo
            window.location.href = orderData.longurl;
            resetCouponState();
        } else {
            const errorReason = orderData.message || orderData.error || "Server Validation Error";
            alert("Backend Error: " + errorReason);
        }

    } catch (err) {
        window.hideLoader();
        alert("Payment process failed!\nReason: " + err.message);
    }
};










//☝☝☝    THIS IS THE PAYMEMT METHOD // 
//===============================//


const unlockBookInFirestore = async (bookId) => {
    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, { 
            purchasedBooks: arrayUnion(bookId) 
        });
        
        alert("🎉 Success! Book unlocked and added to your vault.");
        window.location.reload();
    } catch (e) {
        console.error("Firestore Core Injection Error:", e);
        alert("Unlock failed. Contact support system.");
    } finally {
        window.hideLoader();
    }
};

// 🛠️ Helper function to wipe coupon state memory cleanly
const resetCouponState = () => {
    window.appliedDiscountState = { 
        isValid: false, 
        discountPercent: 0, 
        finalPrice: 0, 
        couponCode: "" 
    };
};








// ==========================================================================
// TALKINK PREMIUM CORE ENGINE - V8.0 (ADAPTIVE GPU ZOOM & SWIPER INTEGRATION)
// ==========================================================================

const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ✅ SAFE BLOCK: Agar page par library load hui hai, sirf tabhi worker assign hoga.
// Isse about.html ya baki pages par error nahi aayega.
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
}

// State Management Matrix
window.currentPdfDoc = null;
let currentScale = window.innerWidth < 768 ? 1.0 : 1.0; // Starting baseline at normalized scale
let translateX = 0, translateY = 0;
let initialDist = null;
let lastTouchX = 0, lastTouchY = 0;
let startSwipeX = 0;
let isMoving = false;


/**
 * 1. TRANSFORM ENGINE - ULTRA SMOOTH EDITION
 * High-performance GPU rendering with smart bounds clamping.
 */
const applyTransform = () => {
    const wrapper = document.getElementById('flipbook-wrapper');
    if (!wrapper) return;

    // Boundary Logic: Clamping movement so zoomed pages never get lost outside viewports
    if (currentScale > 1.05) {
        // Calculate dynamic boundaries based on viewport vs zoomed size matrix
        const maxW = (window.innerWidth * (currentScale - 1)) / 2;
        const maxH = (window.innerHeight * (currentScale - 1)) / 2;

        translateX = Math.max(-maxW, Math.min(maxW, translateX));
        translateY = Math.max(-maxH, Math.min(maxH, translateY));

        // 🔥 SMART SWIPER LOCK: Disable sliding gestures when zooming into assets
        if (window.swiperInstance && window.swiperInstance.allowTouchMove) {
            window.swiperInstance.allowTouchMove = false;
        }
    } else {
        // Soft reset to center when fully zoomed out or normalized
        translateX = 0;
        translateY = 0;

        // 🔥 SMART SWIPER UNLOCK: Allow sliding again when page is at default size
        if (window.swiperInstance && !window.swiperInstance.allowTouchMove) {
            window.swiperInstance.allowTouchMove = true;
        }
    }

    // Performance Layer: Force browser layer promotion onto GPU context
    wrapper.style.willChange = "transform";
    
    // Smoothness Easing Emitter
    if (initialDist || isMoving) {
        wrapper.style.transition = "transform 0.05s linear"; // Real-time direct responsive tracking
    } else {
        wrapper.style.transition = "transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)"; // Premium swift ease-out
    }

    // Hardware accelerated translate3d matrix execution
    wrapper.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentScale})`;
};







/**
 * 2. ZOOM CONTROLS - CINEMATIC FEEL (For UI Navigation Buttons)
 * Injects instant interpolation variables for smooth scaling jumps.
 */
window.zoomIn = () => { 
    const wrapper = document.getElementById('flipbook-wrapper');
    if (wrapper) {
        wrapper.style.transition = "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)";
    }
    
    currentScale = Math.min(currentScale + 0.4, 4.0); // Step multiplier bound to 4.0 Max
    requestAnimationFrame(applyTransform); 
};

window.zoomOut = () => { 
    const wrapper = document.getElementById('flipbook-wrapper');
    if (wrapper) {
        wrapper.style.transition = "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)";
    }
    
    currentScale = Math.max(currentScale - 0.4, 0.7); // Step multiplier bound to 0.7 Min
    requestAnimationFrame(applyTransform); 
};










/**
 * 2. HYBRID SYSTEM CONTROLS (Pinch-Hold Time Verification Engine)
 * Strictly allows page flipping ONLY on clear horizontal swipes (>70px).
 * Requires holding the deep pinch-out (scale <= 0.85) for 1.5 seconds to exit fullscreen.
 */
export const initSmartControls = (wrapper, flipbook) => {
    if (!wrapper || !flipbook) return;

    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    // 1. DESKTOP BUTTON CLICK TRIGGERS (ST-PAGE-FLIP LINKED)
    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.preventDefault();
            if (window.pageFlipInstance) {
                window.pageFlipInstance.flipNext();
            } else if (typeof window.readerNavigateNext === 'function') {
                window.readerNavigateNext();
            }
        };
    }

    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.preventDefault();
            if (window.pageFlipInstance) {
                window.pageFlipInstance.flipPrev();
            } else if (typeof window.readerNavigatePrev === 'function') {
                window.readerNavigatePrev();
            }
        };
    }

    // 2. MULTI-TOUCH PINCH, PAN & TIMING LOCK VARIABLES
    let startSwipeX = 0;
    let startSwipeY = 0;
    let isMoving = false;
    let isDraggingPage = false;
    let initialDist = null;
    let startScale = 1;
    
    // 🔥 NEW TIMING TRACKERS 🔥
    let holdExitTimer = null; 
    let isHoldTimerActive = false;

    // 3. TOUCH START: Record absolute initial tracking vectors
    wrapper.ontouchstart = (e) => {
        if (e.touches.length === 2) {
            initialDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX, 
                e.touches[0].pageY - e.touches[1].pageY
            );
            startScale = currentScale;
            isMoving = false; 
            isDraggingPage = false;
            wrapper.style.transition = "none";
        } 
        else if (e.touches.length === 1) {
            startSwipeX = e.touches[0].pageX;
            startSwipeY = e.touches[0].pageY;
            
            if (currentScale > 1.05) {
                isDraggingPage = true;
                isMoving = false;
                lastTouchX = e.touches[0].pageX;
                lastTouchY = e.touches[0].pageY;
                wrapper.style.transition = "none";
            } else {
                isMoving = true; 
                isDraggingPage = false;
            }
        }
    };

    // 4. TOUCH MOVE: Process physics parameters & evaluate timing thresholds
    wrapper.ontouchmove = (e) => {
        if (e.touches.length === 2 && initialDist) {
            e.preventDefault(); // Viewport scroll engine lock
            
            const currentDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX, 
                e.touches[0].pageY - e.touches[1].pageY
            );
            const zoomRatio = currentDist / initialDist;
            
            // Constrain scaling limits (0.75x to 4.0x allowed during tracking live grid)
            currentScale = Math.max(0.75, Math.min(4.0, startScale * zoomRatio));
            
            // 🔥 ADVANCED HOLD TRIGGER LOGIC 🔥
            if (currentScale <= 0.85 && (document.fullscreenElement || document.webkitFullscreenElement)) {
                // Agar timer pehle se chalu nahi hai, toh chalu karo
                if (!isHoldTimerActive) {
                    isHoldTimerActive = true;
                    
                    // 300 milliseconds = 0.3 Seconds hold time (Ise kam ya jyada kar sakte ho)
                    holdExitTimer = setTimeout(() => {
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        }
                        currentScale = 1.0; 
                        translateX = 0;
                        translateY = 0;
                        if (typeof applyTransform === 'function') applyTransform();
                        
                        // Timer system reset after successful exit
                        isHoldTimerActive = false;
                        holdExitTimer = null;
                    }, 300); 
                }
            } else {
                // 🛑 TIMEOUT KILL MATRIX: Agar user zoom-out se wapas zoom-in kar leta hai (scale > 0.85)
                if (isHoldTimerActive) {
                    clearTimeout(holdExitTimer);
                    isHoldTimerActive = false;
                    holdExitTimer = null;
                }
            }
            
            if (typeof applyTransform === 'function') {
                requestAnimationFrame(applyTransform);
            }
        } 
        else if (e.touches.length === 1 && isDraggingPage && currentScale > 1.05) {
            e.preventDefault(); 
            
            const deltaX = e.touches[0].pageX - lastTouchX;
            const deltaY = e.touches[0].pageY - lastTouchY;
            
            translateX += deltaX;
            translateY += deltaY;
            
            lastTouchX = e.touches[0].pageX;
            lastTouchY = e.touches[0].pageY;
            
            if (typeof applyTransform === 'function') {
                requestAnimationFrame(applyTransform);
            }
        }
    };

    // 5. TOUCH END: Standard resets, swipe detections & failsafe abort loops
    wrapper.ontouchend = (e) => {
        // Horizontal Swiping Verification
        if (isMoving && currentScale <= 1.05 && e.changedTouches.length > 0) {
            const endX = e.changedTouches[0].pageX;
            const endY = e.changedTouches[0].pageY;
            
            const distanceX = startSwipeX - endX;
            const distanceY = startSwipeY - endY;

            if (Math.abs(distanceX) > 70 && Math.abs(distanceX) > Math.abs(distanceY)) {
                if (distanceX > 0) {
                    if (window.pageFlipInstance) window.pageFlipInstance.flipNext();
                } else {
                    if (window.pageFlipInstance) window.pageFlipInstance.flipPrev();
                }
            }
        }

        // 🛑 TOUCH ABORT RECOVERY: User ne 1.5s hold karne se pehle hi ungli utha li
        if (isHoldTimerActive) {
            clearTimeout(holdExitTimer);
            isHoldTimerActive = false;
            holdExitTimer = null;
        }

        // 🔥 SMOOTH ELASTIC SNAP BACK 🔥
        // Agar exit trigger nahi hua, toh ungli chhodte hi page wapas instant size (1.0) par bounce karega
        if (currentScale < 1.0) {
            currentScale = 1.0;
            translateX = 0;
            translateY = 0;
            if (typeof applyTransform === 'function') {
                requestAnimationFrame(applyTransform);
            }
        }

        initialDist = null;
        isMoving = false;
        isDraggingPage = false;

        setTimeout(() => {
            wrapper.style.transition = "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)";
        }, 30);
    };
};






/**
 * 0. GLOBAL SYNC FUNCTION (PageFlip + Progress Storage Anchored Edition)
 * Synchronizes the UI layout components, updates navigation button states, 
 * and anchors the real-time active page directly into persistent local storage.
 * 🚀 FIXED: Stores calculated percentage instead of raw page index to resolve library dashboard freeze.
 */
export const syncReaderUI = (page, totalPages) => {
    if (!totalPages || totalPages <= 0) return;

    // Strict UI elements mapping cache matrix
    const elements = {
        progress: document.getElementById('readingProgress'),
        thumb: document.getElementById('progressThumb'),
        tooltip: document.getElementById('progressTooltip'),
        counter: document.getElementById('dockPageCounter'),
        btnNext: document.getElementById('nextBtn'),
        btnPrev: document.getElementById('prevBtn')
    };

    // 1. Progress Bar & Floating Tooltip Interpolation Matrix
    let percent = Math.round((page / totalPages) * 100);
    
    // 🔥 GLITCH FIX: Agar user last page par hai ya bilkul aakhri panno par hai, toh 100% force karo
    if (page >= totalPages || percent > 96) {
        percent = 100;
    }
    
    if (elements.progress) {
        elements.progress.style.width = `${percent}%`;
        if (elements.thumb) elements.thumb.style.display = 'block';
        if (elements.tooltip) {
            elements.tooltip.innerText = page;
            elements.tooltip.style.left = `${percent}%`;
        }
    }

    // 🔥 AUTOMATIC PROGRESS PERSISTENCE TRACKING ENGINE 🔥
    // Stores the exact progress percentage against the active bookId for automated runtime restoration
    const activeUserId = (window.currentUserData && window.currentUserData.uid) || 'guest';
    const activeBookId = window.currentReadingBookId; 
    
    if (activeBookId) {
        // 🎯 FIXED: Ab yahan 'page' nahi, balki sahi calculated 'percent' save hoga!
        localStorage.setItem(`progress_${activeUserId}_${activeBookId}`, percent);
    }

    // 2. Control Deck Counter UI Synchronization
    if (elements.counter) {
        elements.counter.innerText = `${page} / ${totalPages}`;
    }

    // 3. Navigation Button Micro-States Engine
    const updateBtn = (btn, isDisabled) => {
        if (!btn) return; 
        try {
            btn.disabled = isDisabled;
            btn.style.opacity = isDisabled ? "0.25" : "1";
            btn.style.pointerEvents = isDisabled ? "none" : "auto";
            btn.style.cursor = isDisabled ? "not-allowed" : "pointer";
        } catch (e) {
            // Suppress secondary structural interface noise errors
        }
    };

    // Trigger individual node updates independently to avoid execution blockages
    updateBtn(elements.btnPrev, page <= 1);
    updateBtn(elements.btnNext, page >= totalPages);
};












/**
 * 3. MAIN INITIALIZATION (StPageFlip - Smart Dynamic Lazy Loading + IndexedDB Cache Edition)
 * Instantly loads big books (100-500+ pages) without crashing devices.
 * 🚀 DUAL-MODE EDITION: Supports both Firestore Database Books and Local User Uploaded PDFs.
 * 🎯 FIXED: Auto-bypasses database streams & cache validations for zero-cost local operations.
 * 📊 UPDATE: Integrated User-Specific Multi-Book Auto-Resume Pipeline.
 */
export const startBookReader = async (targetInput, isLocalFile = false) => {
    if (typeof St === 'undefined' || !St.PageFlip) {
        alert("Essential library (page-flip.browser.min.js) not loaded!"); 
        return;
    }
    


    if (window.showLoader) window.showLoader();

    let finalPdfTarget = null;
    let isFromCache = false;
    let bookTitle = "Local Document";
    const bookId = isLocalFile ? "local_user_pdf" : targetInput; // Standard identification boundaries

    // --- HELPER ENGINE: INDEXEDDB MANAGEMENT DATABASE ---
    const initReaderDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("NarratoReaderCache", 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("pdf_books")) {
                    db.createObjectStore("pdf_books", { keyPath: "id" });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    };

    const getCachedBook = async (db, id) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(["pdf_books"], "readonly");
            const store = transaction.objectStore("pdf_books");
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    };

    const saveBookToCache = async (db, id, blobData, currentUrl) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(["pdf_books"], "readwrite");
            const store = transaction.objectStore("pdf_books");
            const request = store.put({ 
                id: id, 
                blob: blobData, 
                savedUrl: currentUrl, 
                timestamp: Date.now() 
            });
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    };

    try {
        // --- STEP 1: GLITCH-PROOF SYSTEM CLEANUP ---
        const wrapper = document.getElementById('flipbook-wrapper');
        if (wrapper) {
            wrapper.ontouchstart = null;
            wrapper.ontouchmove = null;
            wrapper.ontouchend = null;
        }

        if (window.pageFlipInstance) {
            try { window.pageFlipInstance.destroy(); } catch (e) { console.log("Stale cleanup bypass."); }
            window.pageFlipInstance = null;
        }

        const oldFlipbook = $('#flipbook');
        if (oldFlipbook.length) {
            oldFlipbook.off(); 
            oldFlipbook.remove(); 
        }

        // Switch to the main layout viewport layer
        if (window.render) window.render('ReaderPage');

        const freshWrapper = document.getElementById('flipbook-wrapper');
        if (!freshWrapper) throw new Error("Terminal wrapper target null.");

        $(freshWrapper).prepend('<div id="flipbook" class="st-page-flip-container"></div>');
        const flipbook = document.getElementById('flipbook');

        window.currentReadingBookId = bookId; 

        // =========================================================================
        // 🔀 STEP 2 & 3: ROUTING PARSER ENGINE (FIRESTORE VS LOCAL BLOB URL)
        // =========================================================================
        if (isLocalFile) {
            console.log(`%c[Reader Engine] Initiating Local Sandbox Mode for Uploaded File.`, "color: #a855f7; font-weight: bold;");
            
            if (!targetInput || !(targetInput instanceof File)) {
                throw new Error("Invalid instance mismatch! Expected local raw File stream object.");
            }

            bookTitle = targetInput.name; 
            finalPdfTarget = URL.createObjectURL(targetInput); 
            
        } else {
            // 🌐 FIRESTORE DATABASE ROUTE
            const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const { db: firebaseDb } = await import('./firebase.js');

            const bookSnap = await getDoc(doc(firebaseDb, "books", bookId));
            if (!bookSnap.exists()) throw new Error("Target book asset missing inside Firestore!");
            const bookData = bookSnap.data();

            bookTitle = bookData.title;
            let pdfDataUri = bookData.pdfURL; 

            let localReaderDB;
            let cachedRecord = null;

            try {
                localReaderDB = await initReaderDB();
                cachedRecord = await getCachedBook(localReaderDB, bookId);
            } catch (dbErr) {
                console.warn("IndexedDB initialization skipped. Performance falling back to dynamic streaming.", dbErr);
            }

            if (cachedRecord && cachedRecord.savedUrl === pdfDataUri) {
                isFromCache = true;
                finalPdfTarget = URL.createObjectURL(cachedRecord.blob);
                console.log(`%c[Cache Engine] ${bookTitle} loaded instantly from browser storage!`, "color: #10b981; font-weight: bold;");
            } else {
                if (cachedRecord && cachedRecord.savedUrl !== pdfDataUri) {
                    console.log(`%c[Cache Engine] Target asset URL changed in Firestore! Invaliding old cache structure...`, "color: #f59e0b; font-weight: bold;");
                } else {
                    console.log(`%c[Cache Engine] Fetching from cloud storage repository...`, "color: #3b82f6; font-weight: bold;");
                }

                try {
                    const response = await fetch(pdfDataUri, { method: 'GET', mode: 'cors' });
                    if (!response.ok) throw new Error(`HTTP network error! Status: ${response.status}`);
                    
                    const pdfBlob = await response.blob();
                    finalPdfTarget = URL.createObjectURL(pdfBlob);

                    if (localReaderDB) {
                        await saveBookToCache(localReaderDB, bookId, pdfBlob, pdfDataUri).catch(e => console.error("Cache save failed:", e));
                    }
                } catch (fetchErr) {
                    console.warn("External fetch blocked by network boundaries. Deploying core stream fallback.", fetchErr);
                    finalPdfTarget = pdfDataUri; 
                }
            }
        }

        if (document.getElementById('currentReadingTitle')) {
            document.getElementById('currentReadingTitle').innerText = bookTitle;
        }

        // --- STEP 4: INITIALIZE CORE PDF.JS PIPELINE ---
        const loadingTask = pdfjsLib.getDocument({
            url: finalPdfTarget, 
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            withCredentials: false
        });

        window.currentPdfDoc = await loadingTask.promise;

        if (finalPdfTarget && finalPdfTarget.startsWith('blob:')) {
            URL.revokeObjectURL(finalPdfTarget);
        }

        const totalPages = window.currentPdfDoc.numPages;
        const dpr = window.devicePixelRatio || 2;
        const isMobileDevice = window.innerWidth <= 768;

        const renderedPagesRegistry = new Set();

        // 🔥 LAZY RENDER CORE ENGINE
        const queuePageRender = async (pageIdx) => {
            if (pageIdx < 1 || pageIdx > totalPages) return;
            if (renderedPagesRegistry.has(pageIdx)) return; 

            renderedPagesRegistry.add(pageIdx);
            const targetCanvas = document.getElementById(`canvas-page-${pageIdx}`);
            if (!targetCanvas) {
                renderedPagesRegistry.delete(pageIdx); 
                return;
            }

            try {
                const page = await window.currentPdfDoc.getPage(pageIdx);
                const customScale = isMobileDevice ? 2.2 : 2.5;
                const viewport = page.getViewport({ scale: customScale });

                targetCanvas.height = viewport.height * dpr;
                targetCanvas.width = viewport.width * dpr;
                targetCanvas.style.width = "100%";
                targetCanvas.style.height = "100%";

                const ctx = targetCanvas.getContext('2d');
                ctx.transform(dpr, 0, 0, dpr, 0, 0);

                await page.render({ canvasContext: ctx, viewport: viewport, intent: 'display' }).promise;
                page.cleanup();
            } catch (err) {
                console.error(`Page ${pageIdx} rendering interrupted safely:`, err);
                renderedPagesRegistry.delete(pageIdx); 
            }
        };

        const purgeDistantPagesMemory = (currentPage) => {
            const safeBuffer = 4; 
            for (let i of renderedPagesRegistry) {
                if (Math.abs(i - currentPage) > safeBuffer) {
                    const canvasToClean = document.getElementById(`canvas-page-${i}`);
                    if (canvasToClean) {
                        const ctx = canvasToClean.getContext('2d');
                        ctx.clearRect(0, 0, canvasToClean.width, canvasToClean.height);
                        canvasToClean.width = 1; 
                        canvasToClean.height = 1;
                    }
                    renderedPagesRegistry.delete(i);
                }
            }
        };

        // Create Empty Skeleton Shells Instantly
        for (let n = 1; n <= totalPages; n++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'st-html-page';
            pageDiv.id = `reader-page-${n}`;
            
            const canvas = document.createElement('canvas');
            canvas.id = `canvas-page-${n}`; 
            pageDiv.appendChild(canvas);
            flipbook.appendChild(pageDiv);
        }

        // Shuruati page structures render karo
        await queuePageRender(1);
        queuePageRender(2);
        queuePageRender(3);

        // --- STEP 5: PAGE-FLIP INITIALIZATION ---
        setTimeout(() => {
            if (!document.getElementById('flipbook')) return;

            const isMobile = window.innerWidth <= 768;
            const bookWidth = isMobile ? Math.floor(window.innerWidth * 0.94) : 460;
            const bookHeight = isMobile ? Math.floor(window.innerHeight * 0.74) : 650;

            window.pageFlipInstance = new St.PageFlip(flipbook, {
                width: bookWidth,
                height: bookHeight,
                size: "fixed",
                minWidth: 280,
                maxWidth: 550,
                minHeight: 380,
                maxHeight: 750,
                drawShadow: true, 
                flippingTime: 650, 
                usePortrait: true, 
                startPage: 0,
                showCover: false,
                clickToChangePages: false, 
                useMouseEvents: false      
            });

            window.pageFlipInstance.loadFromHTML(document.querySelectorAll('.st-html-page'));

            // Flip event handler with dynamic state persistence
            window.pageFlipInstance.on('flip', (e) => {
                const currentRealPage = e.data + 1;
                
                if (typeof syncReaderUI === 'function') {
                    syncReaderUI(currentRealPage, totalPages);
                }

                // Surrounding context lazy preload matrix
                queuePageRender(currentRealPage);
                queuePageRender(currentRealPage + 1);
                queuePageRender(currentRealPage + 2);
                queuePageRender(currentRealPage - 1);
                queuePageRender(currentRealPage - 2);

                purgeDistantPagesMemory(currentRealPage);

                // 💾 PERSISTENCE LOGIC: Current User aur Active Book ke context me page number save karo
                const activeUserId = (window.currentUserData && window.currentUserData.uid) || 'guest';
                if (window.currentReadingBookId) {
                    localStorage.setItem(`last_page_${activeUserId}_${window.currentReadingBookId}`, currentRealPage);
                }
            });

            window.readerNavigateNext = () => {
                if (window.pageFlipInstance) window.pageFlipInstance.flipNext();
            };
            window.readerNavigatePrev = () => {
                if (window.pageFlipInstance) window.pageFlipInstance.flipPrev();
            };

            $(document).off('keydown.readerNamespace').on('keydown.readerNamespace', (e) => {
                if (e.key === "ArrowRight") window.readerNavigateNext();
                if (e.key === "ArrowLeft") window.readerNavigatePrev();
            });

            if (typeof initSmartControls === 'function') {
                const flipbookElement = $('#flipbook');
                initSmartControls(freshWrapper, flipbookElement);
            }
            
            if (typeof initFullscreenController === 'function') { initFullscreenController(); }
            if (typeof initProgressBarScrub === 'function') { initProgressBarScrub(); }

            if (typeof syncReaderUI === 'function') {
                syncReaderUI(1, totalPages);
            }

            // 🔥 AUTO-RESUME TRIGGER ENGINE 🔥
            const activeUserId = (window.currentUserData && window.currentUserData.uid) || 'guest';
            const savedPageRaw = localStorage.getItem(`last_page_${activeUserId}_${window.currentReadingBookId}`);
            
            if (savedPageRaw) {
                const savedPageNum = parseInt(savedPageRaw, 10);
                // Safe boundary verification matrix
                if (savedPageNum > 1 && savedPageNum <= totalPages) {
                    console.log(`%c[Auto-Resume] Target match found! Restoring last state at page: ${savedPageNum}`, "color: #3b82f6; font-weight: bold;");
                    
                    // Extra safe delay hook taaki components safely setup ho jayein bina crash ke
                    setTimeout(() => {
                        if (window.pageFlipInstance) {
                            // Pre-render destination layers inside the hardware frame pipeline
                            queuePageRender(savedPageNum);
                            queuePageRender(savedPageNum + 1);
                            queuePageRender(savedPageNum - 1);
                            
                            // StPageFlip library 0-based index use karti hai
                            window.pageFlipInstance.flip(savedPageNum - 1);
                        }
                    }, 250);
                }
            }

        }, 400);

    } catch (error) {
        console.error("Reader Runtime System Fault via PageFlip Engine:", error);
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
};



















// ==========================================================================
// --- FEATURE 1: JUMP TO PAGE MODAL CORE (StPageFlip Edition) ---
// ==========================================================================
window.executeJump = () => {
    const inputElement = document.getElementById('jumpPageInput');
    if (!inputElement) return;

    const pageNum = parseInt(inputElement.value, 10);
    
    // Safely capture total pages dynamically from active pageFlipInstance or current PDF instance
    const total = window.pageFlipInstance ? window.pageFlipInstance.getPageCount() : (window.currentPdfDoc ? window.currentPdfDoc.numPages : 0);

    if (total > 0 && pageNum >= 1 && pageNum <= total) {
        if (window.pageFlipInstance) {
            // StPageFlip 0-based index parameter accept karta hai, isliye -1 kiya
            window.pageFlipInstance.flip(pageNum - 1); 
        }
        window.closeJumpModal();
        inputElement.value = ''; // Input box state reset
    } else {
        alert(`Identity Matrix Bound Exception: Please enter a valid page between 1 and ${total || 'max'}`);
    }
};

// Input box mein 'Enter' key detect karne ke liye automatic handler
document.getElementById('jumpPageInput')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        window.executeJump();
    }
});


// ==========================================================================
// --- FEATURE 2: PROGRESS SCRUBBING (TIMELINE ENGAGEMENT) ---
// ==========================================================================
export const initProgressBarScrub = () => {
    const container = document.getElementById('progressBarContainer');
    if (!container) return;

    let isDragging = false;

    const updateFromEvent = (e) => {
        // Safe guard check: Agar engine instantiation phase me na ho to skip karo
        if (!window.pageFlipInstance) return 1;

        const rect = container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        let percentage = Math.max(0, Math.min(1, x / rect.width));
        
        const totalPages = window.pageFlipInstance.getPageCount();
        const targetPage = Math.ceil(percentage * totalPages) || 1;

        // Visual Sync (Dynamic tracking display progress updates)
        syncReaderUI(targetPage, totalPages);
        return targetPage;
    };

    container.addEventListener('mousedown', (e) => { isDragging = true; updateFromEvent(e); });
    container.addEventListener('touchstart', (e) => { isDragging = true; updateFromEvent(e); }, { passive: false });

    window.addEventListener('mousemove', (e) => { if (isDragging) updateFromEvent(e); });
    window.addEventListener('touchmove', (e) => { 
        if (isDragging) { 
            e.preventDefault(); 
            updateFromEvent(e); 
        }
    }, { passive: false });

    window.addEventListener('mouseup', (e) => {
        if (isDragging) {
            const page = updateFromEvent(e);
            if (window.pageFlipInstance) {
                window.pageFlipInstance.flip(page - 1); // FINAL JUMP EXECUTION
            }
            isDragging = false;
        }
    });

    window.addEventListener('touchend', (e) => {
        if (isDragging && window.pageFlipInstance) {
            const rect = container.getBoundingClientRect();
            const clientX = e.changedTouches[0].clientX;
            const x = clientX - rect.left;
            let percentage = Math.max(0, Math.min(1, x / rect.width));
            
            const total = window.pageFlipInstance.getPageCount();
            const page = Math.ceil(percentage * total) || 1;
            
            window.pageFlipInstance.flip(page - 1); // FINAL MOBILE TIMELINE JUMP
            isDragging = false;
        }
    });
};


// ==========================================================================
// --- FEATURE 3: AUXILIARY WINDOW ROUTING TERMINALS ---
// ==========================================================================
window.openJumpToPage = () => {
    const modal = document.getElementById('jumpPageModal');
    const input = document.getElementById('jumpPageInput');
    if (modal) modal.style.display = 'flex';
    if (input) setTimeout(() => input.focus(), 50);
};

window.closeJumpModal = () => {
    const modal = document.getElementById('jumpPageModal');
    if (modal) modal.style.display = 'none';
};

export const closeReader = (targetPage = 'LibraryPage') => {
    // 🔥 SAFE TERMINATION PHASE 🔥
    // Memory leaks aur zombie references bachane ke liye pageFlip instance destroy karo
    if (window.pageFlipInstance) {
        window.pageFlipInstance.destroy();
        window.pageFlipInstance = null;
    }
    
    // Global event listeners namespace clean setup
    $(window).off('.readerNamespace');
    $(document).off('.readerNamespace');

    window.currentReadingBookId = null;
    window.currentPdfDoc = null;

    if (window.render) window.render(targetPage);
};

window.openReader = (id) => startBookReader(id);
window.closeReader = () => closeReader();














window.toggleReaderDark = () => {
    const readerPage = document.getElementById('ReaderPage');
    if (!readerPage) return;

    // Class toggle karega (Hoga toh hata dega, nahi hoga toh laga dega)
    readerPage.classList.toggle('dark-mode-reader');

    // LocalStorage mein save kar lo taaki agli baar yaad rahe
    const isDark = readerPage.classList.contains('dark-mode-reader');
    localStorage.setItem('readerDarkMode', isDark);
    
    // Visual feedback (Optional: Icon badalne ke liye)
    const icon = document.querySelector('button[onclick="toggleReaderDark()"] i');
    if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
};







// --- ULTIMATE FULLSCREEN ACTION ENGINE ---
export const initFullscreenController = () => {
    const fsButton = document.getElementById('fullscreenToggleBtn');
    const readerElement = document.getElementById('ReaderPage');
    
    if (!fsButton || !readerElement) return;

    // 1. CLICK EVENT: Toggle action trigger
    fsButton.onclick = (e) => {
        e.preventDefault();

        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.msFullscreenElement) {
            
            // Go Fullscreen
            if (readerElement.requestFullscreen) {
                readerElement.requestFullscreen();
            } else if (readerElement.webkitRequestFullscreen) {
                readerElement.webkitRequestFullscreen();
            } else if (readerElement.msRequestFullscreen) {
                readerElement.msRequestFullscreen();
            }
        } else {
            // Exit Fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    };

    // 2. STATE CHANGE WATCHER: Jab bhi fullscreen mode badle (Button, Esc key, ya Mobile Swipe se)
    const handleFullscreenChange = () => {
        const icon = fsButton.querySelector('i');
        if (!icon) return;

        if (document.fullscreenElement || document.webkitFullscreenElement) {
            // Screen Full Hai -> Exit icon dikhao (Compress)
            icon.className = 'fa-solid fa-compress';
            readerElement.classList.add('fullscreen-active');
            fsButton.setAttribute('title', 'Exit Fullscreen');
        } else {
            // Screen Normal Hai -> Enter icon dikhao (Expand)
            icon.className = 'fa-solid fa-expand';
            readerElement.classList.remove('fullscreen-active');
            fsButton.setAttribute('title', 'Full Screen');
        }
    };

    // Alag-alag browsers ke liye dynamic hooks attach karo
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
};

















/**
 * CYBER-VAULT LIBRARY ARCHITECTURE ENGINE
 * Fetches user's purchased books from Firestore, combines progress from LocalStorage,
 * and renders them dynamically inside the #purchasedBooksGrid.
 */
export const fetchAndRenderLibrary = async (currentUserData = null) => {
    const grid = document.getElementById('purchasedBooksGrid');
    const countBadge = document.getElementById('lib-count');
    
    if (!grid) return; // Guard: Agar DOM me grid nahi hai to execution stop

    // 1. CLEAR DUMMY PLACEHOLDERS & INITIALIZE LOADER
    grid.innerHTML = "";
    if (window.showLoader) window.showLoader();

    // 2. CHECK IF USER IS LOGGED IN & HAS BOOKS
    const purchasedBookIds = currentUserData?.purchasedBooks || [];

    if (purchasedBookIds.length === 0) {
        if (countBadge) countBadge.textContent = "0 Units Secured";
        grid.innerHTML = `
            <div class="empty-vault-slate" style="
                grid-column: 1 / -1; 
                text-align: center; 
                padding: 60px 20px; 
                color: #64748b; 
                font-family: 'Inter', sans-serif;
                font-weight: 500;
                letter-spacing: 0.5px;
            ">
                <i class="fa-solid fa-box-open" style="font-size: 2.5rem; color: #6366f1; margin-bottom: 15px; display: block; opacity: 0.7;"></i>
                No books found in your personal library vault.
            </div>`;
        if (window.hideLoader) window.hideLoader();
        return;
    }

    // 3. UPDATE TOTAL COUNT BADGE
    if (countBadge) {
        countBadge.textContent = `${purchasedBookIds.length} Synchronized Units`;
    }

    try {
        // 4. BATCH DATA FETCH FROM FIRESTORE
        const bookPromises = purchasedBookIds.map(async (bookId) => {
            const bookSnap = await getDoc(doc(db, "books", bookId));
            if (bookSnap.exists()) {
                return { id: bookId, ...bookSnap.data() };
            }
            return null;
        });

        const booksData = await Promise.all(bookPromises);
        let cardsHTML = "";

        // 5. HYBRID DOM RENDER WITH LOCALSTORAGE PROGRESS CHECK
        booksData.forEach((book) => {
            if (!book) return;

            // Browser Storage Integration for Reading Tracking Progress
            // Unique key architecture format: 'progress_userId_bookId'
            const storageKey = `progress_${currentUserData.uid}_${book.id}`;
            const savedProgress = localStorage.getItem(storageKey);
            
            // Fallback to 0 if no reading record exists inside the browser storage matrix
            const progress = savedProgress ? parseInt(savedProgress, 10) : 0;

            // Visual State Indicators Calculation Engine
            let badgeClass = "unread-badge";
            let badgeText = `<i class="fa-solid fa-circle-nodes"></i> Core`;
            let finishedClass = "";

            if (progress > 0 && progress < 100) {
                badgeClass = "alpha-badge";
                badgeText = `<i class="fa-solid fa-bolt"></i> Active`;
            } else if (progress >= 100) {
                badgeClass = "complete-badge";
                badgeText = `<i class="fa-solid fa-square-check"></i> Mastered`;
                finishedClass = "finished";
            }

            // High-Octane Scoped Dynamic Layout Injector
            cardsHTML += `
                <div class="mini-card ${finishedClass}" onclick="openReader('${book.id}')">
                    <div class="mini-cover">
                        <img src="${book.coverURL || 'Dummy.jpg'}" alt="Vault Stream Cover">
                        <div class="mini-badge ${badgeClass}">${badgeText}</div>
                    </div>
                    <div class="mini-info">
                        <h3>${book.title || 'Unknown Asset'}</h3>
                        <div class="mini-meta-row">
                            <span class="progress-percent">${progress}%</span>
                        </div>
                        <div class="mini-progress-bar">
                            <div class="fill" style="width: ${progress}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = cardsHTML;

        // 6. TRIGGER MATRIX LOADER KINETIC REFRESH
        if (window.refreshLibraryVault) {
            window.refreshLibraryVault();
        }

    } catch (error) {
        console.error("Library Module Sync Error:", error);
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 40px;">Failed to synchronize library terminal.</div>`;
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
};

// Exporting to make it globally available through routing windows
window.fetchAndRenderLibrary = fetchAndRenderLibrary;

// Global Helpers for HTML/Inline Clicks
window.animateBookClick = animateBookClick;
window.showBookDetails = showBookDetails; // Isse details system bhi globally accessible rahega






// ==========================================================================
// --- PREMIUM CLOUD TTS CONTROLLER MODULE (SMOOTH RE-USE RESUME INTEGRATION) ---
// ==========================================================================
window.speechPlayer = {
    // Global Audio Singleton Object Injection Strategy
    audioInstance: (() => {
        if (!window.talkInkGlobalPlayer) {
            window.talkInkGlobalPlayer = new Audio();
        }
        return window.talkInkGlobalPlayer;
    })(),
    isPaused: false,
    currentPage: null,
    sentences: [],         // Translated sentences ka matrix array
    currentSentenceIdx: 0, // Active sentence tracker

    targetLang: 'en',      
    speechSpeechLang: 'en-US', 
    langLabel: 'Original',

    // 🎯 RE-VERIFIED PRODUCTION URL
    BACKEND_URL: 'https://talkinkbackend.onrender.com/tts-stream',

    // High-Octane Cloud Translation Linker
    translateText: async (text, targetLangCode) => {
        if (!targetLangCode || targetLangCode === 'en') return text;
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLangCode}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Translation gateway drop");
            const data = await response.json();
            if (data && data[0]) {
                return data[0].map(chunk => chunk[0]).join('').trim();
            }
            return text;
        } catch (err) {
            console.error("Translation micro-engine error:", err);
            return text; 
        }
    },

    openLangModal: () => {
        const modal = document.getElementById('ttsLanguageModal');
        if (modal) modal.style.display = 'flex';
    },

    closeLangModal: () => {
        const modal = document.getElementById('ttsLanguageModal');
        if (modal) modal.style.display = 'none';
    },

    setLanguage: (langCode, speakLocale, label) => {
        window.speechPlayer.targetLang = langCode;
        window.speechPlayer.speechSpeechLang = speakLocale;
        window.speechPlayer.langLabel = label;
        
        if (window.currentReadingBookId) {
            localStorage.setItem(`tts_lang_${window.currentReadingBookId}`, JSON.stringify({
                targetLang: langCode,
                speechSpeechLang: speakLocale,
                langLabel: label
            }));
        }

        window.speechPlayer.closeLangModal();
        window.speechPlayer.start(false); 
    },

    // 1. MAIN FETCH TEXT & SPEAK CONTROLLER (PREMIUM ROUTE LINKED)
    start: async (fromResume = false) => {
        // Safe channel unlock on real user interaction
        if (!fromResume) {
            window.speechPlayer.stopAudioStream();
        }

        const activeBookDoc = window.currentPdfDoc;
        const pageCounterText = document.getElementById('dockPageCounter')?.innerText || "1 / 1";
        const currentPageIdx = parseInt(pageCounterText.split('/')[0].trim(), 10) || 1;
        
        window.speechPlayer.currentPage = currentPageIdx;
        
        if (!activeBookDoc) {
            alert("No active book asset loaded for synthesis.");
            return;
        }

        if (!fromResume) {
            if (window.showLoader) window.showLoader(); 
            try {
                const page = await activeBookDoc.getPage(currentPageIdx);
                const textContent = await page.getTextContent();
                let rawText = textContent.items.map(item => item.str).join(' ').trim();

                if (!rawText || rawText.length < 5) {
                    if (window.hideLoader) window.hideLoader();
                    alert("This page contains no readable text or is an un-scanned image framework.");
                    return;
                }

                if (window.speechPlayer.targetLang !== 'en') {
                    rawText = await window.speechPlayer.translateText(rawText, window.speechPlayer.targetLang);
                }

                window.speechPlayer.sentences = rawText.match(/[^.!?।]+[.!?门]?/g) || [rawText];
                window.speechPlayer.currentSentenceIdx = 0; 

                if (window.hideLoader) window.hideLoader(); 

            } catch (err) {
                console.error("Failed to parse page stream for TTS:", err);
                if (window.hideLoader) window.hideLoader();
                return;
            }
        }

        while (window.speechPlayer.currentSentenceIdx < window.speechPlayer.sentences.length && 
               window.speechPlayer.sentences[window.speechPlayer.currentSentenceIdx].trim().length === 0) {
            window.speechPlayer.currentSentenceIdx++;
        }

        if (window.speechPlayer.currentSentenceIdx >= window.speechPlayer.sentences.length) {
            window.speechPlayer.stop();
            return;
        }

        const currentTextChunk = window.speechPlayer.sentences[window.speechPlayer.currentSentenceIdx].trim();

        try {
            const displayMessage = window.speechPlayer.targetLang === 'en' ? 
                `Reading Page ${currentPageIdx}...` : 
                `Reading in ${window.speechPlayer.langLabel}...`;
            window.speechPlayer.updateUI(true, displayMessage);

            const response = await fetch(window.speechPlayer.BACKEND_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                body: JSON.stringify({
                    text: currentTextChunk,
                    lang: window.speechPlayer.targetLang
                })
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => "Unknown Server Node Error");
                throw new Error(`Server responded with status ${response.status}: ${errText}`);
            }

            const audioBlob = await response.blob();
            if (audioBlob.size === 0) {
                throw new Error("Received an empty binary audio blob from cloud pipeline.");
            }

            const audioStreamUrl = URL.createObjectURL(audioBlob);
            
            // 🔥 REUSE MATRIX COUPLING: Destructure global pointer instead of instantiation
            const player = window.speechPlayer.audioInstance;
            player.src = audioStreamUrl;
            
            player.onended = () => {
                URL.revokeObjectURL(audioStreamUrl); 
                if (!window.speechPlayer.isPaused) {
                    window.speechPlayer.currentSentenceIdx++;
                    window.speechPlayer.start(true); // Loops with validated dynamic chain token
                }
            };

            player.onerror = (e) => {
                console.error("Binary audio playback stream failed:", e);
                window.speechPlayer.stop();
            };

            await player.play();

        } catch (serverErr) {
            console.error("🎯 [TalkInk Voice Diagnostic] Pipeline break details:", serverErr.message);
            if (serverErr.message.includes("status 502") || serverErr.message.includes("Failed to fetch")) {
                alert("Cloud engine is warming up on Render. Please try again in a moment, bhai!");
            }
            window.speechPlayer.stop();
        }
    },

    // 2. PLAY / PAUSE DYNAMIC MATRIX CONTROL
    togglePause: () => {
        const ppBtn = document.getElementById('audioPlayPauseBtn');
        const statusTxt = document.getElementById('audioStatusText');

        if (!window.speechPlayer.isPaused) {
            window.speechPlayer.isPaused = true;
            if (window.speechPlayer.audioInstance) {
                window.speechPlayer.audioInstance.pause();
            }

            if (ppBtn) ppBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
            if (statusTxt) statusTxt.innerText = `Paused Page ${window.speechPlayer.currentPage}`;
        } else {
            window.speechPlayer.isPaused = false;
            if (ppBtn) ppBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
            if (statusTxt) statusTxt.innerText = `Reading Page ${window.speechPlayer.currentPage}...`;
            
            if (window.speechPlayer.audioInstance && window.speechPlayer.audioInstance.src) {
                window.speechPlayer.audioInstance.play().catch(() => window.speechPlayer.start(true));
            } else {
                window.speechPlayer.start(true);
            }
        }
    },

    stopAudioStream: () => {
        if (window.speechPlayer.audioInstance) {
            try {
                window.speechPlayer.audioInstance.pause();
                window.speechPlayer.audioInstance.onended = null;
                window.speechPlayer.audioInstance.removeAttribute('src');
                window.speechPlayer.audioInstance.load();
            } catch (e) {}
        }
    },

    // 3. STOP AND MEMORY ARCHITECTURE RESET
    stop: () => {
        window.speechPlayer.stopAudioStream();
        window.speechPlayer.isPaused = false;
        window.speechPlayer.currentSentenceIdx = 0;
        window.speechPlayer.sentences = [];
        window.speechPlayer.updateUI(false);
    },

    // 4. FLOATING DOCK INTERFACE UPDATER
    updateUI: (isActive, statusMsg = "") => {
        const playerDock = document.getElementById('audioPlayerDock');
        const ppBtn = document.getElementById('audioPlayPauseBtn');
        const mainHeadphonesIcon = document.querySelector('#ttsSpeechBtn i');

        if (isActive) {
            if (playerDock) {
                playerDock.classList.add('active');
                playerDock.style.display = "block";
                setTimeout(() => {
                    playerDock.style.opacity = "1";
                    playerDock.style.transform = "translateX(-50%) translateY(0)";
                    playerDock.style.pointerEvents = "auto";
                }, 10);
            }
            if (document.getElementById('audioStatusText')) {
                document.getElementById('audioStatusText').innerText = statusMsg;
            }
            if (ppBtn) ppBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
            if (mainHeadphonesIcon) {
                mainHeadphonesIcon.className = "fa-solid fa-waveform-lines pulse-icon";
            }
        } else {
            if (playerDock) {
                playerDock.classList.remove('active');
                playerDock.style.opacity = "0";
                playerDock.style.transform = "translateX(-50%) translateY(30px)";
                playerDock.style.pointerEvents = "none";
                setTimeout(() => {
                    if(!playerDock.classList.contains('active')) {
                        playerDock.style.display = "none";
                    }
                }, 300);
            }
            if (ppBtn) ppBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
            if (mainHeadphonesIcon) {
                mainHeadphonesIcon.className = "fa-solid fa-headphones";
            }
        }
    }
};

// ==========================================================================
// --- NAVBAR BUTTON TRIGGER (CORE ENTRY TERMINAL) ---
// ==========================================================================
window.togglePageSpeech = () => {
    // Browser dynamic system configuration interaction unlocker
    if (window.speechPlayer.audioInstance) {
        window.speechPlayer.audioInstance.play().then(() => {
            window.speechPlayer.audioInstance.pause();
        }).catch(() => {});
    }

    const isStreamPlaying = window.speechPlayer.audioInstance && window.speechPlayer.audioInstance.src && !window.speechPlayer.audioInstance.paused;
    
    if (isStreamPlaying || window.speechPlayer.isPaused) {
        window.speechPlayer.stop();
        return;
    }

    window.speechPlayer.openLangModal();
};

























// --- ADVANCED SCREEN WAKE LOCK API (IMMERSION ENGINE) ---
window.readingWakeLock = {
    sentinel: null,

    // 🚀 1. REQUEST WAKE LOCK (Screen ON rakhne ke liye)
    request: async () => {
        // Guard Check: Agar browser support nahi karta toh chupchaap nikal jao
        if (!('wakeLock' in navigator)) {
            console.warn("[Wake Lock] This browser does not support Screen Wake Lock.");
            return;
        }

        // Agar pehle se active hai, toh dobara request mat karo
        if (window.readingWakeLock.sentinel) return;

        try {
            window.readingWakeLock.sentinel = await navigator.wakeLock.request('screen');
            console.log("🔥 [Immersion Engine] Screen Wake Lock Activated. Screen will stay ON.");

            // Agar kisi wajah se lock apne aap release ho jaye (jaise low battery par)
            window.readingWakeLock.sentinel.addEventListener('release', () => {
                console.log("🏳️ [Immersion Engine] Wake Lock was released automatically.");
                window.readingWakeLock.sentinel = null;
            });

        } catch (err) {
            console.error(`[Wake Lock Failure]: ${err.name}, Message: ${err.message}`);
        }
    },

    // 🛑 2. RELEASE WAKE LOCK (Screen ko wapas normal karne ke liye)
    release: async () => {
        if (!window.readingWakeLock.sentinel) return;

        try {
            await window.readingWakeLock.sentinel.release();
            window.readingWakeLock.sentinel = null;
            console.log("💤 [Immersion Engine] Wake Lock Released safely. Screen timeout restored.");
        } catch (err) {
            console.error(`[Wake Lock Release Error]: ${err.message}`);
        }
    },

    // 🔄 3. AUTO-RESUME ENGINE (Jab user tab badal kar wapas aaye)
    initAutoResume: () => {
        document.addEventListener('visibilitychange', async () => {
            // Agar user tab badal kar wapas isi tab par aaya hai, aur abhi Reader Page active hai
            const readerPage = document.getElementById('ReaderPage');
            const isReaderVisible = readerPage && readerPage.classList.contains('active-view') || readerPage.style.display !== 'none';

            if (window.readingWakeLock.sentinel !== null && document.visibilityState === 'visible' && isReaderVisible) {
                await window.readingWakeLock.request();
            }
        });
    }
};

// Initialize the visibility event listener immediately
window.readingWakeLock.initAutoResume();












// --- AMBIENT SOUNDSCAPES ARCHITECTURE ENGINE (BODY LEVEL FIXED) ---
window.ambientEngine = {
    audioInstance: null,
    currentType: 'none',
    currentVolume: 0.5,

    // 🔥 UPDATED: Premium, Smooth & Non-Blocking Soothing Soundscapes Loops
    audioSources: {
        rain: "https://res.cloudinary.com/drrwpgp4m/video/upload/v1779256670/i4l2rk77leqn6e272fro.mp3", 
        forest: "https://res.cloudinary.com/drrwpgp4m/video/upload/v1779256755/q5ofdms25bp3wtc9o3cv.mp3",
        lofi: "https://res.cloudinary.com/drrwpgp4m/video/upload/v1779256521/l6qezcvfix72bo6k3phf.mp3",
        ocean: "./assets/sounds/ocean.mp3" // 🔥 NEW: Bas ye ek line jor di!
    },


    togglePopup: (e) => {
        if (e) e.stopPropagation();
        const popup = document.getElementById('ambientSoundPopup');
        if (!popup) return;
        
        popup.classList.toggle('show');

        if (popup.classList.contains('show')) {
            document.addEventListener('click', window.ambientEngine.closePopupOutside);
        }
    },

    closePopup: () => {
        const popup = document.getElementById('ambientSoundPopup');
        if (popup) popup.classList.remove('show');
        document.removeEventListener('click', window.ambientEngine.closePopupOutside);
    },

    closePopupOutside: (e) => {
        const popup = document.getElementById('ambientSoundPopup');
        const btn = document.getElementById('ambientSoundBtn');
        if (popup && !popup.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            window.ambientEngine.closePopup();
        }
    },

    selectSound: (type, elementRef) => {
        const items = document.querySelectorAll('.ambient-item');
        items.forEach(item => item.classList.remove('active'));
        if (elementRef) elementRef.classList.add('active');

        if (window.ambientEngine.currentType === type) return;

        window.ambientEngine.stopCurrent();
        window.ambientEngine.currentType = type;

        if (type === 'none') {
            console.log("[Ambient Engine] Soundscapes muted.");
            return;
        }

        const sourceUrl = window.ambientEngine.audioSources[type];
        if (!sourceUrl) return;

        try {
            // Creating local structural audio link
            window.ambientEngine.audioInstance = new Audio(sourceUrl);
            window.ambientEngine.audioInstance.loop = true; // Loop strictly true for background track
            window.ambientEngine.audioInstance.volume = window.ambientEngine.currentVolume;
            
            // Safe execution loop
            const playPromise = window.ambientEngine.audioInstance.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[Ambient Engine] Playing local asset safely: ${type}`);
                }).catch(err => {
                    console.error("[Ambient Engine] Playback was prevented by browser auto-guard:", err);
                });
            }
        } catch (e) {
            console.error("[Ambient Engine] Audio initialization fault:", e);
        }
    },

    setVolume: (val) => {
        const parsedVolume = parseFloat(val);
        window.ambientEngine.currentVolume = parsedVolume;
        if (window.ambientEngine.audioInstance) {
            window.ambientEngine.audioInstance.volume = parsedVolume;
        }
    },

    stopCurrent: () => {
        if (window.ambientEngine.audioInstance) {
            try {
                window.ambientEngine.audioInstance.pause();
                window.ambientEngine.audioInstance.currentTime = 0;
            } catch (e) {}
            window.ambientEngine.audioInstance = null;
        }
    },
    
        // 🔥 NEW: Pure Audio Mute/Stop Engine Controller
    muteAll: () => {
        // 1. Current active audio stream ko completely kill karo
        window.ambientEngine.stopCurrent();
        window.ambientEngine.currentType = 'none';

        // 2. UI Classes Reset: Saare items se active class hatao
        const items = document.querySelectorAll('.ambient-item');
        items.forEach(item => item.classList.remove('active'));

        // 3. None (Silence) wale option par wapas active class lagao
        const noneItem = document.getElementById('ambient-item-none');
        if (noneItem) noneItem.classList.add('active');

        console.log("[Ambient Engine] Quick Mute Triggered. All sounds stopped.");
    },

};










// ==========================================================================
// ⚙️ SIMPLE READER SETTINGS LOGIC
// ==========================================================================

// 1. Modal Open & Close Functions
window.openSettingsModal = function() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    // Current Dark Mode status check karke checkbox set karo
    const readerPage = document.getElementById('ReaderPage');
    const isDark = readerPage ? readerPage.classList.contains('dark-mode-reader') : false;
    document.getElementById('darkModeCheckbox').checked = isDark;

    // Current Wake Lock status check karke checkbox set karo
    const isWakeActive = window.readingWakeLock && window.readingWakeLock.sentinel !== null;
    document.getElementById('wakeLockCheckbox').checked = isWakeActive;

    modal.style.display = 'flex';
};

window.closeSettingsModal = function() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
};

// 2. Dark Mode Toggle Handler
window.handleThemeToggle = function() {
    const readerPage = document.getElementById('ReaderPage');
    if (!readerPage) return;

    readerPage.classList.toggle('dark-mode-reader');
    
    // Status local storage me save karo taaki yaad rahe
    const isDark = readerPage.classList.contains('dark-mode-reader');
    localStorage.setItem('readerDarkMode', isDark);
};

// 3. Screen Wake Lock Toggle Handler (Default OFF)
window.handleWakeLockToggle = async function() {
    const checkbox = document.getElementById('wakeLockCheckbox');
    if (!checkbox || !window.readingWakeLock) return;

    if (checkbox.checked) {
        // User ne on kiya, toh lock request karo
        await window.readingWakeLock.request();
    } else {
        // User ne off kiya, toh lock release karo
        await window.readingWakeLock.release();
    }
};

























// Open Coupon Modal
window.openCouponModal = () => {
    const modal = document.getElementById('couponModal');
    if (modal) {
        modal.classList.add('active');
        // Auto-focus input for smoother experience
        setTimeout(() => document.getElementById('couponCodeInput').focus(), 100);
    }
};

// Close Coupon Modal
window.closeCouponModal = () => {
    const modal = document.getElementById('couponModal');
    const input = document.getElementById('couponCodeInput');
    if (modal) modal.classList.remove('active');
    if (input) input.value = ''; // Clean state reset
};

// Variable to store applied discount state globally for the current session
window.appliedDiscountState = {
    isValid: false,
    discountPercent: 0,
    finalPrice: 0,
    couponCode: ""
};

// 1. TRIGGER BUTTON PIPELINE
window.triggerCouponPipeline = async () => {
    const inputField = document.getElementById('couponCodeInput');
    let codeValue = inputField.value.trim().toUpperCase(); // Case-insensitive validation block

    // Rule 1: Length Validation (4 to 20 digits)
    if (codeValue.length < 4 || codeValue.length > 20) {
        alert("🚨 Invalid Coupon! Code must be between 4 and 20 characters.");
        return;
    }

    // Rule 2: Extract Last Digits (Discount Number Extraction Matrix)
    const numberMatch = codeValue.match(/\d+$/); // Yeh check karega ki end me numbers hain ya nahi
    if (!numberMatch) {
        alert("🚨 Invalid Code Structure! Coupon must end with a discount percentage number.");
        return;
    }

    const discountNumber = parseInt(numberMatch[0], 10);

    // Rule 3: Check Range (1 to 100)
    if (discountNumber < 1 || discountNumber > 100) {
        alert("🚨 Coupon Violation! Discount range must be between 1% and 100%.");
        return;
    }

    // Loader call before DB connection hits
    if (window.showLoader) window.showLoader();

    try {
        // Tumhara current active book ID uthao pipeline se
        const currentBookId = window.currentReadingBookId || document.getElementById('buyAction')?.getAttribute('data-book-id'); 
        
        if (!currentBookId) {
            throw new Error("Target book reference missing. Please try again.");
        }

        // Firebase verification method call
        await applyCouponCode(currentBookId, codeValue, discountNumber);

    } catch (err) {
        alert(err.message);
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
};



// 2. FIRESTORE VALIDATION & PRICE CALCULATION PIPELINE
export const applyCouponCode = async (bookId, couponCode, discountPercent) => {
    // Firestore setup dependencies
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const { db } = await import('./firebase.js');

    const bookSnap = await getDoc(doc(db, "books", bookId));
    if (!bookSnap.exists()) throw new Error("Book asset not found inside database!");

    const bookData = bookSnap.data();
    
    // Naya proposed array check mechanism
    const allowedCoupons = bookData.allowedCoupons || [];

    // Check agar database ke array me code exist karta hai
    if (!allowedCoupons.includes(couponCode)) {
        throw new Error("🚨 Code Expired or Not applicable for this specific book!");
    }

    // --- MATHEMATICAL MATHS MATRIX ---
    const originalPrice = Number(bookData.price);
    
    // Calculate final price based on discount pattern
    let discountAmount = (originalPrice * discountPercent) / 100;
    let computedPrice = Math.max(0, Math.round(originalPrice - discountAmount));

    // Save calculation state into window system global memory grid
    window.appliedDiscountState = {
        isValid: true,
        discountPercent: discountPercent,
        finalPrice: computedPrice,
        couponCode: couponCode
    };

    // UI SCREEN UPDATES WITHOUT RELOAD
    if (document.getElementById('detailPrice')) {
        document.getElementById('detailPrice').innerText = `₹${computedPrice}`;
        document.getElementById('detailPrice').style.color = "#10b981"; // Highlight new price in green
    }

    // Update main Buy Button to show discount alert
    const buyBtn = document.getElementById('buyAction');
    if (buyBtn) {
        buyBtn.innerHTML = computedPrice === 0 
            ? `<i class="fa-solid fa-gift"></i> Claim Free Asset` 
            : `<i class="fa-solid fa-bolt"></i> Buy Now (₹${computedPrice})`;
    }

    alert(`🎉 Success! ${discountPercent}% Discount applied. New Price: ₹${computedPrice}`);
    window.closeCouponModal(); // Close modal on success
};

















// Function to fetch data filtered by Timestamp (Newest to Oldest)
export const getLatestBooksData = async (pageSize = 20, lastDoc = null) => {
    // Firebase tools dynamically loaded
    const { 
        collection, query, orderBy, limit, startAfter, getDocs 
    } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const { db } = await import('./firebase.js');

    try {
        let q;
        const booksRef = collection(db, 'books');

        if (lastDoc) {
            // Agar page 2, 3 load ho raha ho
            q = query(booksRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
        } else {
            // First page load query execution
            q = query(booksRef, orderBy('createdAt', 'desc'), limit(pageSize));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];

        return { success: true, data, lastDoc: lastVisible };
    } catch (error) {
        console.error("Error fetching latest database assets:", error);
        return { success: false, data: [], lastDoc: null };
    }
};













// ==========================================================================
// 🚀 GLOBAL MEMORY STATE STORAGE FOR LATEST RELEASES TRACKING
// ==========================================================================
window.latestGridPaginationTracker = null;

/**
 * Core function to handle paginated rendering of the Latest Books Section.
 * @param {number} pageSize - Amount of assets to pull from Firebase per stream batch.
 */
export const loadLatestBooksPage = async (pageSize = 20) => {
    const container = document.getElementById('latestBooksGrid');
    if (!container) {
        console.error("🚨 Target element '#latestBooksGrid' not found in DOM matrix.");
        return;
    }

    // First open check logic -> If pointer is clean, wipe previous grid instances completely
    if (!window.latestGridPaginationTracker) {
        container.innerHTML = ""; 
    }

    window.showLoader(); 

    // Fetch batch data dynamically through the timestamp tracker engine
    const response = await getLatestBooksData(pageSize, window.latestGridPaginationTracker);
    
    if (!response.success || response.data.length === 0) {
        // Safe elimination of the interactive load node if stream ends
        const existingBtn = document.getElementById('loadMoreBtn_latest');
        if (existingBtn) existingBtn.remove();
        window.hideLoader();
        return;
    }

    // Save current pagination offset doc reference to the global context tracking pool
    window.latestGridPaginationTracker = response.lastDoc;
    
    const purchasedList = window.currentUserData?.purchasedBooks || [];
    let cardsHTML = '';

    // --- 📦 CORE CARDS ITERATION LOOP ---
    response.data.forEach(book => {
        const isPurchased = purchasedList.includes(book.id);
        const isFree = Number(book.price) === 0;

        if (isPurchased || isFree) {
            const clickAction = isPurchased ? `openReader('${book.id}')` : `animateBookClick(this, '${book.id}')`;
            
            cardsHTML += `
                <div class="ink-card purchased" onclick="${clickAction}">
                    <div class="card-visual">
                        <img src="${book.coverURL || 'Dummy.jpg'}" alt="${book.title}">
                        <div class="unlock-glow"><i class="fa-solid fa-unlock"></i></div>
                    </div>
                    <div class="card-info">
                        <h3>${book.title}</h3>
                        <div class="meta-tags"><span>#${book.author}</span></div>
                        <div class="price-bar"><span class="owned-text">${isFree && !isPurchased ? 'FREE READ' : 'READ NOW'}</span></div>
                    </div>
                </div>`;
        } else {
            cardsHTML += `
                <div class="ink-card" onclick="openDetails('${book.id}')">
                    <div class="card-visual">
                        <img src="${book.coverURL || 'Dummy.jpg'}" alt="${book.title}">
                        <div class="ink-badge">PREMIUM</div>
                        <div class="lock-shield"><i class="fa-solid fa-lock"></i></div>
                    </div>
                    <div class="card-info">
                        <h3>${book.title}</h3>
                        <div class="meta-tags"><span>#${book.author}</span></div>
                        <div class="price-bar"><span class="price-val">₹${book.price}</span></div>
                    </div>
                </div>`;
        }
    });

    // Remove legacy tracking controls safely before drawing new ones
    const oldBtn = document.getElementById('loadMoreBtn_latest');
    if (oldBtn) oldBtn.remove();
    
    // Inject the pristine string chunk to the DOM
    container.insertAdjacentHTML('beforeend', cardsHTML);

    // --- 🔄 DYNAMIC EXPLORE MORE BUTTON MATRIX ---
    if (response.data.length === pageSize) {
        const btnHTML = `
            <div id="loadMoreBtn_latest" style="grid-column: 1 / -1; display: flex; justify-content: center; padding: 40px 0;">
                <button style="
                    background: rgba(255, 255, 255, 0.03);
                    color: #6366f1;
                    border: 1px solid rgba(99, 102, 241, 0.4);
                    padding: 12px 40px;
                    border-radius: 50px;
                    font-weight: 700;
                    font-size: 0.85rem;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: 0.3s all ease;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                "
                onmouseover="this.style.background='#6366f1'; this.style.color='#fff'; this.style.boxShadow='0 0 20px rgba(99, 102, 241, 0.4)';"
                onmouseout="this.style.background='rgba(255, 255, 255, 0.03)'; this.style.color='#6366f1'; this.style.boxShadow='none';"
                >Explore More</button>
            </div>`;
        
        container.insertAdjacentHTML('beforeend', btnHTML);
        
        // Strict scope preservation closure to ensure pagination rules stay persistent
        document.getElementById('loadMoreBtn_latest').addEventListener('click', () => {
            loadLatestBooksPage(pageSize);
        });
    }
 
    window.hideLoader();
};

// Bind functions securely to the global browser context matrix
window.loadLatestBooksPage = loadLatestBooksPage;

// --- 🧭 NAVIGATION ROUTER CONTROLLER INTERACTION HOOK ---
window.openLatestSection = () => {
    // 1. Flush memory offsets completely to reset stream state for a fresh view
    window.latestGridPaginationTracker = null; 
    
    // 2. Fetch initial 20 cards cleanly via default matching values
    window.loadLatestBooksPage(20); 
    
    // 3. Trigger your core UI layer rendering state engine
    window.render("latestBooksPage"); 
};



























// =========================================================================
// 🎯 PREMIUM VAULT & FILTER SYSTEM CORE ENGINE
// =========================================================================

// --- 🛠️ 1. GLOBAL MEMORY ENGINE STATES ---
window.currentActiveFilterType = "premium-default"; 
window.currentActiveRangeBracket = null; 
window.premiumGridPaginationIndex = 0; 
window.premiumFilteredMasterArray = []; 

// --- 🧹 2. CLEAR SELECTION UTILITY ---
const clearRadioSelection = () => {
    const radios = document.getElementsByName('priceRange');
    if (radios && radios.length > 0) {
        radios.forEach(radio => {
            radio.checked = false;
        });
    }
};
window.clearRadioSelection = clearRadioSelection;

// --- 🔓 3. MODAL OPEN/CLOSE CORE RIGGING ---
window.openFilterModal = () => {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error("🚨 Filter modal HTML node not found in DOM!");
    }
};

window.closeFilterModal = () => {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

// --- 🚀 4. ENTRYPOINT MECHANISM (Called when opening the page) ---
window.openPremiumSectionStore = () => {
    window.currentActiveFilterType = "premium-default";
    window.currentActiveRangeBracket = null;
    window.premiumGridPaginationIndex = 0;
    window.premiumFilteredMasterArray = [];
    
    // Reset selection inputs safely
    clearRadioSelection();
    
    const indicator = document.getElementById('activeFilterIndicator');
    if(indicator) indicator.style.display = "none";
    
    // Initial data fetch trigger
    window.loadPremiumFilteredGrid(true); // true = fresh load
    window.render("premiumBooksPage");
};

// --- ⚙️ 5. MAIN FILTER & PAGINATION MATRIX ENGINE ---
window.loadPremiumFilteredGrid = async (isFreshLoad = false) => {
    const container = document.getElementById('premiumBooksGrid');
    if (!container) return;
    
    const itemsPerPage = 10; // Render limit per page chunk

    if (isFreshLoad) {
        container.innerHTML = ""; // Clean grid view state
        window.premiumGridPaginationIndex = 0;
        window.showLoader();

        // Firebase dependencies loaded dynamically
        const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const { db } = await import('./firebase.js');

        try {
            // Fetch baseline data sorted by price low-to-high
            const baseQuery = query(collection(db, 'books'), orderBy('price', 'asc'));
            const snapshot = await getDocs(baseQuery);
            let allBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // --- FILTERING ROUTER MATRIX ---
            if (window.currentActiveFilterType === "premium-default") {
                window.premiumFilteredMasterArray = allBooks.filter(book => Number(book.price) > 0);
            } 
            else if (window.currentActiveFilterType === "free") {
                window.premiumFilteredMasterArray = allBooks.filter(book => Number(book.price) === 0);
            } 
            else if (window.currentActiveFilterType === "range" && window.currentActiveRangeBracket) {
                const bracket = window.currentActiveRangeBracket;
                if (bracket === "301-above") {
                    window.premiumFilteredMasterArray = allBooks.filter(book => Number(book.price) >= 301);
                } else {
                    const parts = bracket.split('-');
                    const minPrice = parseInt(parts[0], 10);
                    const maxPrice = parseInt(parts[1], 10);
                    window.premiumFilteredMasterArray = allBooks.filter(book => Number(book.price) >= minPrice && Number(book.price) <= maxPrice);
                }
            }
        } catch (err) {
            console.error("Core engine database fetch error:", err);
            window.hideLoader();
            return;
        }
    }

    // --- PAGINATION SLICING PROCESSOR ---
    const totalItems = window.premiumFilteredMasterArray.length;
    
    if (totalItems === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px 0; color:var(--ink-text-muted); font-size:0.9rem;">No assets matching your query inside storage vault.</div>`;
        window.hideLoader();
        return;
    }

    // Extract next slice chunk array data
    const startIndex = window.premiumGridPaginationIndex;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedSlice = window.premiumFilteredMasterArray.slice(startIndex, endIndex);

    // --- HTML CARD COMPILER FLOW ---
    const purchasedList = window.currentUserData?.purchasedBooks || [];
    let cardsHTML = '';

    paginatedSlice.forEach(book => {
        const isPurchased = purchasedList.includes(book.id);
        const isFree = Number(book.price) === 0;

        if (isPurchased || isFree) {
            const clickAction = isPurchased ? `openReader('${book.id}')` : `animateBookClick(this, '${book.id}')`;
            cardsHTML += `
                <div class="ink-card purchased" onclick="${clickAction}">
                    <div class="card-visual">
                        <img src="${book.coverURL || 'Dummy.jpg'}" alt="${book.title}">
                        <div class="unlock-glow"><i class="fa-solid fa-unlock"></i></div>
                    </div>
                    <div class="card-info">
                        <h3>${book.title}</h3>
                        <div class="meta-tags"><span>#${book.author}</span></div>
                        <div class="price-bar"><span class="owned-text">${isFree && !isPurchased ? 'FREE READ' : 'READ NOW'}</span></div>
                    </div>
                </div>`;
        } else {
            cardsHTML += `
                <div class="ink-card" onclick="openDetails('${book.id}')">
                    <div class="card-visual">
                        <img src="${book.coverURL || 'Dummy.jpg'}" alt="${book.title}">
                        <div class="ink-badge">PREMIUM</div>
                        <div class="lock-shield"><i class="fa-solid fa-lock"></i></div>
                    </div>
                    <div class="card-info">
                        <h3>${book.title}</h3>
                        <div class="meta-tags"><span>#${book.author}</span></div>
                        <div class="price-bar"><span class="price-val">₹${book.price}</span></div>
                    </div>
                </div>`;
        }
    });

    // Remove old load more button if it exists
    const oldBtn = document.getElementById('loadMoreBtn_premium');
    if (oldBtn) oldBtn.remove();

    // Append new compiled slice chunk to container grid
    container.insertAdjacentHTML('beforeend', cardsHTML);

    // Update global pagination position index
    window.premiumGridPaginationIndex = endIndex;

    // --- DYNAMIC LOAD MORE BUTTON INJECTION ---
    if (endIndex < totalItems) {
        const btnHTML = `
            <div id="loadMoreBtn_premium" style="grid-column: 1 / -1; display: flex; justify-content: center; padding: 30px 0;">
                <button style="
                    background: rgba(255, 255, 255, 0.03);
                    color: #6366f1;
                    border: 1px solid rgba(99, 102, 241, 0.4);
                    padding: 12px 35px;
                    border-radius: 50px;
                    font-weight: 700;
                    cursor: pointer;
                    text-transform: uppercase;
                    font-size: 0.8rem;
                ">Explore More</button>
            </div>`;
        
        container.insertAdjacentHTML('beforeend', btnHTML);
        
        document.getElementById('loadMoreBtn_premium').addEventListener('click', () => {
            window.loadPremiumFilteredGrid(false); // false = append next page chunk
        });
    }

    window.hideLoader();
};

// --- ⚡ 6. PIPELINE FILTER SUBMIT MACHINE ---
window.applySelectedFilterPipeline = () => {
    const selectedRadio = document.querySelector('input[name="priceRange"]:checked');
    const indicator = document.getElementById('activeFilterIndicator');
    const chipText = document.getElementById('filterChipText');

    if (!selectedRadio) {
        alert("Please select a target parameter bracket array first!");
        return;
    }

    const value = selectedRadio.value;

    if (value === "free") {
        window.currentActiveFilterType = "free";
        window.currentActiveRangeBracket = null;
        if(chipText) chipText.innerText = "Target Matrix: Free Assets";
    } else {
        window.currentActiveFilterType = "range";
        window.currentActiveRangeBracket = value;
        if(chipText) chipText.innerText = value === "301-above" ? "Bracket: ₹301 & Above" : `Bracket: ₹${value.replace('-', ' — ₹')}`;
    }

    if(indicator) indicator.style.display = "flex";
    
    window.closeFilterModal();
    window.loadPremiumFilteredGrid(true); // Fire dynamic reload engine
};

// --- 🔄 7. RESET TO STORAGE DEFAULT STATE ---
window.resetToDefaultPremium = () => {
    window.openPremiumSectionStore();
};













// =========================================================================
// 🎛️ CONFIG.SYS (SETTINGS PAGE) SYSTEM CORE ENGINE - COMPLETELY CHECKED
// =========================================================================

// 1. ENTRYPOINT FUNCTION - CALLED WHEN USER NAVIGATES TO SETTING PAGE
window.openSettingPageStore = async () => {
    try {
        const firebaseAuthModule = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const getAuth = firebaseAuthModule.getAuth;
        
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            alert("Access Denied: Terminal Identity missing. Log in first!");
            window.render("profile");
            return;
        }

        // Render actual view array context first so DOM elements are available
        window.render("SettingPage");

        // Load actual user states into inputs
        const nameInput = document.getElementById('settingsUserNameInput');
        const emailInput = document.getElementById('settingsUserEmailInput');

        if (nameInput) nameInput.value = user.displayName || user.email.split('@')[0];
        if (emailInput) emailInput.value = user.email;

        // Run dynamic baseline picture injector
        await window.updateSettingsAvatarView();
        
        // 🔥 BIND EVENT LISTENERS IMMEDIATELY AFTER RENDERING (NO TIMEOUT BUGS)
        window.initSettingsEventListeners();

    } catch (error) {
        console.error("Initialization settings pipeline crash:", error);
    }
};

// 2. DYNAMIC AVATAR VIEW COMPILER (Zero-Storage Renderer)
window.updateSettingsAvatarView = async () => {
    try {
        const firebaseAuthModule = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const getAuth = firebaseAuthModule.getAuth;
        
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const avatarPreview = document.getElementById('settingsAvatarPreview');
        const colorPreset = document.getElementById('settingAvatarColorPreset')?.value || "6366f1";
        const isRound = document.getElementById('settingAvatarShape')?.value === "true";

        if (!avatarPreview) return;

        // Check if Google Photo exists, else use our custom UI-Avatars Matrix
        if (user.photoURL && user.photoURL.includes('googleusercontent.com')) {
            avatarPreview.src = user.photoURL;
            avatarPreview.style.borderRadius = isRound ? "50%" : "12px";
        } else {
            const fallbackName = user.displayName || user.email.split('@')[0];
            // 🔥 FIXED: UI-Avatars requires rounded param only when true, or blank for square
            const roundedParam = isRound ? "&rounded=true" : "";
            const targetURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=${colorPreset}&color=fff&bold=true${roundedParam}`;
            avatarPreview.src = targetURL;
            avatarPreview.style.borderRadius = isRound ? "50%" : "12px"; // Sync visual corner styling
        }
    } catch (error) {
        console.error("Avatar view processor error:", error);
    }
};




// --- ⚡ 4. IDENTITY PARAMETERS COMMIT SAVE ENGINE (PERMANENT DB SYNC) ---
window.initSettingsEventListeners = () => {
    const colorSelect = document.getElementById('settingAvatarColorPreset');
    const shapeSelect = document.getElementById('settingAvatarShape');
    const identityForm = document.getElementById('settingsIdentityForm');

    if (colorSelect) {
        colorSelect.removeEventListener('change', window.updateSettingsAvatarView);
        colorSelect.addEventListener('change', window.updateSettingsAvatarView);
    }
    if (shapeSelect) {
        shapeSelect.removeEventListener('change', window.updateSettingsAvatarView);
        shapeSelect.addEventListener('change', window.updateSettingsAvatarView);
    }

    if (identityForm) {
        identityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const saveBtn = document.getElementById('saveIdentityBtn');
            const nameInput = document.getElementById('settingsUserNameInput');
            const avatarPreview = document.getElementById('settingsAvatarPreview');
            
            if (!nameInput || !nameInput.value.trim()) {
                alert("Identity signature cannot be blank!");
                return;
            }

            saveBtn.disabled = true;
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = `<span class="btn-content"><i class="fa-solid fa-spinner fa-spin"></i> SYNCING CORE...</span>`;

            try {
                // 1. Firebase Auth standard hooks import karo
                const { getAuth, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
                const auth = getAuth();
                const user = auth.currentUser;

                if (!user) throw new Error("No active identity session detected inside vault.");

                const newName = nameInput.value.trim();
                const updatedAvatarURL = avatarPreview ? avatarPreview.src : user.photoURL;

                // 🛰️ STEP A: Auth Profile me local save karo
                await updateProfile(user, {
                    displayName: newName,
                    photoURL: updatedAvatarURL
                });

                // 🗄️ STEP B: Firestore Database me permanent lock karo (Taaki refresh par reset na ho)
                const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const db = getFirestore();
                
                // User ke uid naam ke document ke andar name aur photo permanent save
                await setDoc(doc(db, "users", user.uid), {
                    displayName: newName,
                    photoURL: updatedAvatarURL,
                    email: user.email,
                    lastUpdated: Date.now()
                }, { merge: true }); // merge true se baki data safe rahega

                // Global variables and thumbnails instant update
                const headerImg = document.getElementById("profimg");
                if (headerImg) headerImg.src = updatedAvatarURL;

                const profileWelcomeText = document.querySelector("#profile h2");
                if (profileWelcomeText) {
                    profileWelcomeText.innerHTML = `Welcome, ${newName}<span>.</span>`;
                }

                alert("Database Sync Complete! System parameters locked inside core branch! 🎉");

            } catch (err) {
                console.error("Identity commit runtime crash:", err);
                alert(`Matrix update rejected: ${err.message}`);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
        });
    }
};




















// =========================================================================
// 🔍 VAULT SEARCH CONTROLLER TERMINAL PROTOCOL (SLIDING SYSTEM)
// =========================================================================

// 1. DUMMY FUNCTION - CALL THIS FROM YOUR MAIN HEADER SEARCH ICON TO OPEN PANEL
window.openSearchPanelEngine = () => {
    const searchPanel = document.getElementById('searchOverlayPanel');
    if (searchPanel) {
        searchPanel.classList.add('active'); // Triggers left-to-right slide animation
        
        // Auto focus input field for extreme fluid mobile interface
        setTimeout(() => {
            document.getElementById('mainSearchInput')?.focus();
        }, 300);
    }
};

// 2. CLOSING MECHANISM
window.closeSearchPanelEngine = () => {
    const searchPanel = document.getElementById('searchOverlayPanel');
    if (searchPanel) {
        searchPanel.classList.remove('active');
    }
};

// 3. AUTO FILL CONTROLLER FOR SUGGESTION CLICKS
window.fillSearchField = (term) => {
    const searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        searchInput.value = term;
        // Trigger clear cross button show parameter
        const clearBtn = document.getElementById('clearSearchInputBtn');
        if (clearBtn) clearBtn.style.display = 'block';
        
        // Run final search sequence block
        window.executeDummySearch();
    }
};







// =========================================================================
// 🧠 FUZZY LOGIC SPELLING-MISTAKE TRACKER (LEVENSHTEIN DISTANCE MATRIX)
// =========================================================================
// Yeh helper function batata hai ki do strings me kitni spelling ki galati hai
window.calculateFuzzyMatchScore = (str1, str2) => {
    const s1 = str1.trim().toLowerCase().replace(/\s+/g, '');
    const s2 = str2.trim().toLowerCase().replace(/\s+/g, '');
    
    if (s1 === s2) return 100; // Perfect match without space
    if (s1.includes(s2) || s2.includes(s1)) return 85; // Token inclusion match

    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    
    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    // Convert distance to percentage score
    return Math.round(((maxLength - distance) / maxLength) * 100);
};

// =========================================================================
// 🔍 DUAL-MODE HYBRID PSYCHOLOGY & FUZZY SEARCH ENGINE
// =========================================================================
window.executeDummySearch = async (isFinalSearch = false) => {
    const queryInput = document.getElementById('mainSearchInput');
    if (!queryInput) return;

    const rawQuery = queryInput.value.trim().toLowerCase();
    const queryNormalized = rawQuery.replace(/\s+/g, ' '); 
    const queryNoSpace = rawQuery.replace(/\s+/g, '');

    if (!queryNormalized) {
        return; // Silent return to prevent annoying alerts while typing
    }

    const suggestionsZone = document.querySelector('.search-suggestions-zone');
    
    let aiPsychologyKeywords = [];
    let isAiActive = false;

    // 🚀 MODE A: COGNITIVE AI DECODING (Only runs when explicitly triggered on ENTER or VOICE)
    if (isFinalSearch) {
        suggestionsZone.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; color:#6366f1;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-bottom:12px;"></i>
                <p style="font-size:0.85rem; letter-spacing:1px; color:#64748b; text-transform:uppercase;">DECODING USER PSYCHOLOGY (AI)...</p>
            </div>
        `;

        try {
            const backendUrl = 'https://talkinkbackend.onrender.com/smart-psychology-search';
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryNormalized })
            });

            if (response.ok) {
                const resData = await response.json();
                if (resData.success && Array.isArray(resData.suggestions)) {
                    aiPsychologyKeywords = resData.suggestions.map(k => k.toLowerCase().trim());
                    isAiActive = true;
                    console.log("🤖 [AI Engine] Core psychology parameters captured:", aiPsychologyKeywords);
                }
            }
        } catch (aiErr) {
            console.warn("⚠️ [AI Engine] Live gateway timed out. Shifting directly to deep fuzzy index:", aiErr.message);
        }
    }

    // 🚀 MODE B: BULLETPROOF FIRESTORE & LOCAL FUZZY SCANNER (Runs on every keystroke)
    try {
        // Module configuration dynamic fallback
        let db;
        if (typeof window.db !== 'undefined') {
            db = window.db;
        } else if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            db = firebase.firestore();
        } else {
            const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            db = firestoreModule.getFirestore();
        }
        
        let booksSnapshot;
        if (typeof db.collection === 'function') {
            booksSnapshot = await db.collection("books").get();
        } else {
            const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            booksSnapshot = await firestoreModule.getDocs(firestoreModule.collection(db, "books"));
        }

        const matchedResults = [];

        booksSnapshot.forEach((docSnap) => {
            const book = docSnap.data();
            book.id = docSnap.id;

            let relevanceScore = 0;
            const threshold = 70; 

            // --- 🧠 1. COGNITIVE AI MATRIX MATCHING ---
            if (isAiActive && aiPsychologyKeywords.length > 0) {
                const searchablePool = [
                    book.title, 
                    book.genre, 
                    book.description, 
                    ...(Array.isArray(book.searchKeywords) ? book.searchKeywords : [])
                ].filter(Boolean).map(v => v.toString().toLowerCase());

                aiPsychologyKeywords.forEach(concept => {
                    searchablePool.forEach(item => {
                        if (item.includes(concept) || concept.includes(item)) {
                            relevanceScore += 45; 
                        } else {
                            const fuzzyScore = window.calculateFuzzyMatchScore(item, concept);
                            if (fuzzyScore >= 80) relevanceScore += 30;
                        }
                    });
                });
            }

            // --- 👑 2. HANDWRITTEN CUSTOM FUZZY SEARCH MATCHERS ---
            if (book.searchKeywords && Array.isArray(book.searchKeywords)) {
                book.searchKeywords.forEach(kw => {
                    const kwStr = kw.toString().toLowerCase();
                    const fuzzy = window.calculateFuzzyMatchScore(kwStr, queryNormalized);
                    if (fuzzy >= threshold) relevanceScore += (fuzzy * 0.5) + 20;
                });
            }

            if (book.title) {
                const titleStr = book.title.toString().toLowerCase();
                const fuzzy = window.calculateFuzzyMatchScore(titleStr, queryNormalized);
                if (fuzzy >= threshold) {
                    relevanceScore += (fuzzy * 0.4) + 15;
                    if (titleStr === queryNormalized || titleStr.replace(/\s+/g, '') === queryNoSpace) {
                        relevanceScore += 40; 
                    }
                }
            }

            if (book.author) {
                const authorStr = book.author.toString().toLowerCase();
                const fuzzy = window.calculateFuzzyMatchScore(authorStr, queryNormalized);
                if (fuzzy >= threshold) relevanceScore += (fuzzy * 0.3) + 10;
            }

            if (book.genre) {
                const genreStr = book.genre.toString().toLowerCase();
                const fuzzy = window.calculateFuzzyMatchScore(genreStr, queryNormalized);
                if (fuzzy >= threshold) relevanceScore += (fuzzy * 0.2);
            }

            if (book.language) {
                const langStr = book.language.toString().toLowerCase();
                if (langStr === queryNormalized || window.calculateFuzzyMatchScore(langStr, queryNormalized) > 85) {
                    relevanceScore += 15;
                }
            }

            if (book.description) {
                const descStr = book.description.toString().toLowerCase();
                if (descStr.includes(queryNormalized)) {
                    relevanceScore += 10;
                }
            }

            if (relevanceScore > 0) {
                book.score = Math.round(relevanceScore);
                matchedResults.push(book);
            }
        });

        matchedResults.sort((a, b) => b.score - a.score);
        window.renderSearchResultsUI(matchedResults, queryNormalized);

    } catch (error) {
        console.error("Fuzzy Search Engine Matrix Error:", error);
        suggestionsZone.innerHTML = `<p style="color:#ef4444; padding:20px; text-align:center;">Matrix Error: ${error.message}</p>`;
    }
};










// =========================================================================
// 🖥️ UI RENDERER FOR SEARCH RESULTS (WITH CUSTOM BOOK DETAILS TRIGGER)
// =========================================================================
window.renderSearchResultsUI = (results, query) => {
    const suggestionsZone = document.querySelector('.search-suggestions-zone');
    if (!suggestionsZone) return;

    if (results.length === 0) {
        suggestionsZone.innerHTML = `
            <div style="text-align:center; padding:60px 20px; color:#64748b;">
                <i class="fa-solid fa-circle-exclamation" style="font-size:2.5rem; color:#ef4444; margin-bottom:16px;"></i>
                <h4 style="color:#f8fafc; margin-bottom:6px;">No Identity Matches Found</h4>
                <p style="font-size:0.82rem;">No parameters found matching token "${query}" inside vault.</p>
            </div>
        `;
        return;
    }

    // Generate dynamic result list grid
    let htmlContent = `<div style="padding: 12px 16px; font-size:0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Search Results Matrix (${results.length})</div>`;
    htmlContent += `<ul class="suggestion-nodes-list">`;

    results.forEach(book => {
        // 🔥 FIXED: onclick par pehle search panel close hoga, fir showBookDetails('${book.id}') call hoga
        htmlContent += `
            <li class="suggestion-item" style="align-items: flex-start; gap:14px; padding:16px;" onclick="window.closeSearchPanelEngine(); if(typeof showBookDetails === 'function'){ showBookDetails('${book.id}'); } else { console.log('showBookDetails function missing for id:', '${book.id}'); }">
                <div style="width:50px; height:70px; background:#1e293b; border-radius:6px; overflow:hidden; flex-shrink:0; border:1px solid rgba(255,255,255,0.05);">
                    <img src="${book.photoURL || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=150'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
                    <span style="color:#f1f5f9; font-size:0.92rem; font-weight:600; white-space:normal; overflow:visible; text-overflow:unset;">${book.title}</span>
                    <span style="color:#6366f1; font-size:0.78rem; font-weight:500;">By ${book.author}</span>
                    <p style="color:#64748b; font-size:0.75rem; margin:4px 0 0 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3;">${book.description}</p>
                </div>
                <div style="color:#10b981; font-weight:700; font-size:0.85rem; padding-top:2px;">
                    ${book.price == 0 || book.price === 'Free' ? 'FREE' : '₹' + book.price}
                </div>
            </li>
        `;
    });

    htmlContent += `</ul>`;
    suggestionsZone.innerHTML = htmlContent;
};















// =========================================================================
// 🔍 CORE SEARCH & VOICE MICROPHONE ENGINE INTERFACE (INTEGRATED)
// =========================================================================

let speechEngineInstance = null; // Global instance for controller safety

// 1. DUMMY FUNCTION - CALL THIS FROM YOUR MAIN HEADER SEARCH ICON TO OPEN PANEL
window.openSearchPanelEngine = () => {
    const searchPanel = document.getElementById('searchOverlayPanel');
    if (searchPanel) {
        searchPanel.classList.add('active'); // Triggers left-to-right slide animation
        
        // Auto focus input field for extreme fluid mobile interface
        setTimeout(() => {
            document.getElementById('mainSearchInput')?.focus();
        }, 300);
    }
};

// 2. CLOSING MECHANISM FOR MAIN SEARCH PANEL
window.closeSearchPanelEngine = () => {
    const searchPanel = document.getElementById('searchOverlayPanel');
    if (searchPanel) {
        searchPanel.classList.remove('active');
    }
};

// 3. AUTO FILL CONTROLLER FOR SUGGESTION CLICKS
window.fillSearchField = (term) => {
    const searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        searchInput.value = term;
        // Trigger clear cross button show parameter
        const clearBtn = document.getElementById('clearSearchInputBtn');
        if (clearBtn) clearBtn.style.display = 'block';
        
        // Run final search sequence block
        window.executeDummySearch();
    }
};

// 4. SPEECH RECOGNITION PANEL ENTRY TRIGGER
window.openVoiceSearchEngine = () => {
    const voiceOverlay = document.getElementById('voiceSearchOverlay');
    const statusText = document.getElementById('voiceStatusText');
    const transcriptText = document.getElementById('voiceTranscriptPreview');
    
    if (!voiceOverlay) return;
    
    // Slide overlay window from Right to Left
    voiceOverlay.classList.add('active');
    if (statusText) statusText.innerText = "Listening...";
    if (transcriptText) transcriptText.innerText = 'Say something clearly into microphone...';

    // 🌐 Web Speech API Recognition Initializer Pipeline
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        if (transcriptText) transcriptText.innerText = "Speech Engine not supported inside current browser environment.";
        return;
    }

    // Clean restart any old residual streams
    if (speechEngineInstance) {
        try { speechEngineInstance.stop(); } catch(e){}
    }

    speechEngineInstance = new SpeechRecognition();
    speechEngineInstance.continuous = false; // Stop as soon as user pauses talking
    speechEngineInstance.lang = 'en-IN'; // Indian-English context tuning (Hindi works sync well too)
    speechEngineInstance.interimResults = false;

    // Capturing voice result block trigger
    speechEngineInstance.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        console.log(`🎤 Voice Core Output Received: "${spokenText}"`);
        
        if (transcriptText) transcriptText.innerText = `"${spokenText}"`;
        if (statusText) statusText.innerText = "Processing Matrix...";
// Is segment ko apne window.openVoiceSearchEngine function ke andar update kar dena
setTimeout(() => {
    const mainSearchInput = document.getElementById('mainSearchInput');
    const clearBtn = document.getElementById('clearSearchInputBtn');
    
    if (mainSearchInput) {
        mainSearchInput.value = spokenText; 
        if (clearBtn) clearBtn.style.display = 'block'; 
        
        window.closeVoiceEngine(); 
        
        // 🔥 Voice completed successfully, hit the AI pipeline immediately!
        window.executeDummySearch(true); 
    }
}, 800);


    };

    // Error Handler for voice module
    speechEngineInstance.onerror = (event) => {
        console.error("Speech Recognition Node Error:", event.error);
        if (statusText) statusText.innerText = "Voice Error";
        if (transcriptText) {
            if (event.error === 'not-allowed') {
                transcriptText.innerText = "Permission Denied: Microphone access blocked.";
            } else {
                transcriptText.innerText = `Could not register sound pattern. [${event.error}]`;
            }
        }
    };

    speechEngineInstance.onend = () => {
        console.log("Speech Engine tracking window closed.");
    };

    // Start listening process
    speechEngineInstance.start();
};

// 5. CLOSING MECHANISM FOR VOICE SEARCH OVERLAY
window.closeVoiceEngine = () => {
    const voiceOverlay = document.getElementById('voiceSearchOverlay');
    if (voiceOverlay) {
        voiceOverlay.classList.remove('active');
    }
    
    // Kill microphone listening process loop instantly
    if (speechEngineInstance) {
        try { speechEngineInstance.stop(); } catch(e){}
    }
};


// =========================================================================
// 🔄 INITIALIZATION LOGIC PIPELINE ROUTING FOR EVENT TRIGGERS (REWRITTEN)
// =========================================================================
setTimeout(() => {
    const closeBtn = document.getElementById('closeSearchPanelBtn');
    const searchInput = document.getElementById('mainSearchInput');
    const clearBtn = document.getElementById('clearSearchInputBtn');
    const voiceBtn = document.getElementById('voiceSearchTriggerBtn');
    const giantMicBtn = document.getElementById('giantMicBtn');

    if (closeBtn) closeBtn.onclick = window.closeSearchPanelEngine;

    // Live typing event listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const queryValue = e.target.value;

            if (clearBtn) {
                clearBtn.style.background = 'transparent';
                clearBtn.style.display = queryValue.length > 0 ? 'block' : 'none';
            }

            // ⚡ FAST INPUT RULE: Keypress par hamesha sirf CUSTOM FUZZY chalega (No AI load)
            if (queryValue.trim().length >= 1) {
                window.executeDummySearch(false); // false means DO NOT call Gemini API
            } else {
                const suggestionsZone = document.querySelector('.search-suggestions-zone');
                if (suggestionsZone) suggestionsZone.innerHTML = '';
            }
        });

        // 🧠 CRITICAL EVENT: Jab user Enter key hit karega, tabhi AI power call hogi!
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Stop default form submit behaviors
                console.log("🎯 [User Signal] Enter key detected. Triggering Deep AI Psychology Engine...");
                window.executeDummySearch(true); // true means execute Gemini API analysis!
            }
        });
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            clearBtn.style.display = 'none';
            const suggestionsZone = document.querySelector('.search-suggestions-zone');
            if (suggestionsZone) suggestionsZone.innerHTML = '';
        };
    }

    if (voiceBtn) voiceBtn.onclick = window.openVoiceSearchEngine;
    if (giantMicBtn) giantMicBtn.onclick = window.openVoiceSearchEngine;
    
}, 500);















// =========================================================================
// 🛒 WISHLIST ENGINE MODULE - COMPLETELY GLITCH & FREEZE PROOF
// =========================================================================

let wishlistLocalBooksBuffer = []; 
let wishlistSelectedIdsMap = new Set(); 
let wishlistSelectionModeActive = false; 
let wishlistRenderLimitCount = 16; 

// INTERACTIVE GESTURE VARIABLE ISOLATION
let wishlistTouchTimerReference = null;
let wishlistGestureThresholdActive = false;
let wishlistIsListenersBound = false; // Flag to prevent multiple event bindings

// MAIN WINDOW ENTRY EXPOSED PATHWAY INITIALIZER
window.openWishlistPageStore = async () => {
    window.showLoader();
    
    // Clear any stuck timers immediately
    if (wishlistTouchTimerReference) {
        clearTimeout(wishlistTouchTimerReference);
        wishlistTouchTimerReference = null;
    }
    
    wishlistSelectedIdsMap.clear();
    wishlistSelectionModeActive = false;
    wishlistRenderLimitCount = 16;
    window.toggleWishlistHeaderUIState(false);

    try {
        const { getFirestore, doc, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const db = getFirestore();
        
        const cachedWishlistIds = window.currentUserData?.wishlist || [];
        
        if (cachedWishlistIds.length === 0) {
            document.getElementById('wishlistItemsGrid').innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:80px 20px; color:#64748b;">
                    <i class="fa-regular fa-heart" style="font-size:2.5rem; margin-bottom:16px; color:#334155;"></i>
                    <h4 style="color:#f8fafc; margin-bottom:4px;">Vault Storage Empty</h4>
                    <p style="font-size:0.8rem;">Books added to your wishlist tracking will stack inside this matrix grid view.</p>
                </div>
            `;
            const loadMoreZone = document.getElementById('wishlistLoadMoreZone');
            if (loadMoreZone) loadMoreZone.style.display = 'none';
            window.render("wishList-page");
            window.hideLoader();
            return;
        }

        const booksSnapshot = await getDocs(collection(db, "books"));
        wishlistLocalBooksBuffer = [];

        booksSnapshot.forEach((docSnap) => {
            if (cachedWishlistIds.includes(docSnap.id)) {
                const bookData = docSnap.data();
                bookData.id = docSnap.id;
                wishlistLocalBooksBuffer.push(bookData);
            }
        });

        window.renderWishlistGridChunks();
        window.render("wishList-page");

        // Bind global structural listeners ONLY ONCE
        if (!wishlistIsListenersBound) {
            window.initializeWishlistStaticListeners();
        }

    } catch (err) {
        console.error("Critical issue mounting wishlist engine viewport:", err);
    } finally {
        window.hideLoader();
    }
};

// PAGINATION MATRIX CHUNK RENDERER
window.renderWishlistGridChunks = () => {
    const gridContainer = document.getElementById('wishlistItemsGrid');
    if (!gridContainer) return;

    const displaySlice = wishlistLocalBooksBuffer.slice(0, wishlistRenderLimitCount);
    
    let compiledHTML = "";
    displaySlice.forEach(book => {
        const isSelected = wishlistSelectedIdsMap.has(book.id);
        
        // SAFE ACTION: Single unified touch action pointer mapping to eliminate overlapping logs
        compiledHTML += `
            <div class="wishlist-book-node ${isSelected ? 'selected-state' : ''}" 
                 data-id="${book.id}" 
                 style="touch-action: pan-y;"
                 ontouchstart="window.safeWishlistTouchHandler(event, '${book.id}', 'start')"
                 ontouchend="window.safeWishlistTouchHandler(event, '${book.id}', 'end')"
                 ontouchcancel="window.safeWishlistTouchHandler(event, '${book.id}', 'end')"
                 onmousedown="window.safeWishlistTouchHandler(event, '${book.id}', 'start')"
                 onmouseup="window.safeWishlistTouchHandler(event, '${book.id}', 'end')">
                 
                <div class="card-selection-shield" style="pointer-events: none;">
                    <i class="fa-solid fa-check" style="pointer-events: none;"></i>
                </div>
                
                <div class="wishlist-card-cover-wrap" style="pointer-events: none;">
                    <img src="${book.coverURL || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=150'}" loading="lazy" style="pointer-events: none;">
                </div>
                
                <div class="wishlist-card-meta" style="pointer-events: none;">
                    <span class="wishlist-card-title">${book.title}</span>
                    <span class="wishlist-card-author">By ${book.author || 'Unknown'}</span>
                </div>
            </div>
        `;
    });

    gridContainer.innerHTML = compiledHTML;

    const loadMoreZone = document.getElementById('wishlistLoadMoreZone');
    if (loadMoreZone) {
        loadMoreZone.style.display = wishlistLocalBooksBuffer.length > wishlistRenderLimitCount ? 'flex' : 'none';
    }
};

// UNIFIED SYSTEM TOUCH CONTROLLER (PREVENTS GHOST EVENTS COMPLETELY)
let lastProcessedTouchTime = 0;
window.safeWishlistTouchHandler = (event, id, phase) => {
    const now = Date.now();
    
    // Simple Debounce: Agar touch control pass hua hai, toh agle 300ms tak mouse click block karo
    if (event.type.startsWith('mouse') && (now - lastProcessedTouchTime < 300)) {
        return;
    }
    if (event.type.startsWith('touch')) {
        lastProcessedTouchTime = now;
    }

    if (phase === 'start') {
        wishlistGestureThresholdActive = false;
        if (wishlistTouchTimerReference) clearTimeout(wishlistTouchTimerReference);

        wishlistTouchTimerReference = setTimeout(() => {
            wishlistGestureThresholdActive = true;
            if (navigator.vibrate) navigator.vibrate(40);
            window.activateWishlistSelectionStateMode(id);
        }, 600); // Clean 600ms longpress threshold
    } 
    else if (phase === 'end') {
        if (wishlistTouchTimerReference) {
            clearTimeout(wishlistTouchTimerReference);
            wishlistTouchTimerReference = null;
        }

        if (wishlistGestureThresholdActive) {
            event.preventDefault();
            wishlistGestureThresholdActive = false;
            return;
        }

        // Action routing logic
        if (wishlistSelectionModeActive) {
            event.preventDefault();
            window.toggleWishlistCardSelection(id);
        } else {
            if (typeof showBookDetails === 'function') {
                window.closeSearchPanelEngine(); 
                showBookDetails(id);
            }
        }
    }
};

// RUNTIME SELECTION SYSTEM ACTIVE TOGGLER
window.activateWishlistSelectionStateMode = (initialId) => {
    if (wishlistSelectionModeActive) return;
    wishlistSelectionModeActive = true;
    window.toggleWishlistHeaderUIState(true);
    window.toggleWishlistCardSelection(initialId);
};

window.toggleWishlistCardSelection = (id) => {
    if (wishlistSelectedIdsMap.has(id)) {
        wishlistSelectedIdsMap.delete(id);
    } else {
        wishlistSelectedIdsMap.add(id);
    }

    const targetNode = document.querySelector(`.wishlist-book-node[data-id="${id}"]`);
    if (targetNode) {
        targetNode.classList.toggle('selected-state', wishlistSelectedIdsMap.has(id));
    }

    const countLabel = document.getElementById('wishlistSelectCount');
    if (countLabel) countLabel.innerText = `${wishlistSelectedIdsMap.size} Selected`;

    if (wishlistSelectedIdsMap.size === 0) {
        window.exitWishlistSelectionMode();
    }
};

// EXITER SHUT PROTOCOLS
window.exitWishlistSelectionMode = () => {
    wishlistSelectionModeActive = false;
    wishlistSelectedIdsMap.clear();
    window.toggleWishlistHeaderUIState(false);
    
    document.querySelectorAll('.wishlist-book-node').forEach(node => {
        node.classList.remove('selected-state');
    });
};

window.toggleWishlistHeaderUIState = (isActiveMode) => {
    const standardHeader = document.getElementById('wishlistStandardHeader');
    const selectHeader = document.getElementById('wishlistSelectionHeader');
    if (standardHeader && selectHeader) {
        standardHeader.style.display = isActiveMode ? 'none' : 'flex';
        selectHeader.style.display = isActiveMode ? 'flex' : 'none';
    }
};

// BATCH DATA SYNCHRONIZATION REMOVAL
window.executeBatchWishlistRemoval = async () => {
    if (wishlistSelectedIdsMap.size === 0) return;

    if (wishlistTouchTimerReference) clearTimeout(wishlistTouchTimerReference);
    wishlistGestureThresholdActive = false;

    // Async block delay to protect UI thread
    setTimeout(async () => {
        const confirmationToken = confirm(`Are you sure you want to remove these ${wishlistSelectedIdsMap.size} books?`);
        if (!confirmationToken) {
            window.exitWishlistSelectionMode();
            return;
        }

        window.showLoader();
        try {
            const { getFirestore, doc, updateDoc, arrayRemove } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const db = getFirestore();
            
            const { auth } = await import("./firebase.js"); 
            const user = auth.currentUser;
            if (!user) throw new Error("Security verification identity dropped.");

            const targetRemoveIdsArray = Array.from(wishlistSelectedIdsMap);
            const userRef = doc(db, "users", user.uid);

            for (const id of targetRemoveIdsArray) {
                await updateDoc(userRef, { wishlist: arrayRemove(id) });
            }

            if (window.currentUserData && window.currentUserData.wishlist) {
                window.currentUserData.wishlist = window.currentUserData.wishlist.filter(
                    bookId => !wishlistSelectedIdsMap.has(bookId)
                );
            }
            
            window.exitWishlistSelectionMode();
            window.openWishlistPageStore(); 

        } catch (err) {
            console.error("Batch deletion task failure:", err);
            alert(`Cloud synchronization task failure: ${err.message}`);
        } finally {
            window.hideLoader();
        }
    }, 60);
};

// STATIC LISTENERS INITIALIZER (RUNS ONLY ONCE - PREVENTS MEMORY LEAKS)
window.initializeWishlistStaticListeners = () => {
    wishlistIsListenersBound = true;

    // A. Pagination Load More
    const loadMoreBtn = document.getElementById('wishlistLoadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.onclick = (e) => {
            e.stopPropagation();
            wishlistRenderLimitCount += 16; 
            window.renderWishlistGridChunks();
        };
    }

    // B. Selection Mode Close
    const cancelBtn = document.getElementById('wishlistCancelBtn');
    if (cancelBtn) {
        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            window.exitWishlistSelectionMode();
        };
    }

    // C. Ultra-Optimized Select All (Zero Lag/No Freeze)
    const selectAllBtn = document.getElementById('wishlistSelectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.onclick = (e) => {
            e.stopPropagation();
            if (!wishlistSelectionModeActive) {
                wishlistSelectionModeActive = true;
                window.toggleWishlistHeaderUIState(true);
            }

            const currentSlice = wishlistLocalBooksBuffer.slice(0, wishlistRenderLimitCount);
            currentSlice.forEach(book => wishlistSelectedIdsMap.add(book.id));

            // Fast single-pass batch DOM painter
            document.querySelectorAll('.wishlist-book-node').forEach(node => {
                node.classList.add('selected-state');
            });

            const countLabel = document.getElementById('wishlistSelectCount');
            if (countLabel) countLabel.innerText = `${wishlistSelectedIdsMap.size} Selected`;
        };
    }

    // D. Core action deletion processing
    const deleteBtn = document.getElementById('wishlistDeleteBtn');
    if (deleteBtn) {
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            window.executeBatchWishlistRemoval();
        };
    }
};





















// RAM Cache Pool (Active session window memory)
let memoryCachePool = null;
let isCheckedThisSession = false; // System session lock handler

/**
 * 🚀 SMART SNAPSHOT SYNCER (DIRECT CONTENT MATCHING)
 */
export const syncStaticToDynamic = async (db, selector, firestoreField) => {
    try {
        // CASE A: Active session me validation check ho chuka hai, direct RAM se read karo
        if (isCheckedThisSession && memoryCachePool) {
            applyDataToDOM(selector, memoryCachePool[firestoreField]);
            return;
        }

        // CASE B: Initial load par browser ke LocalStorage se backup rescue data nikalo
        const localCachedData = localStorage.getItem("app_web_images_cache");
        if (localCachedData) {
            memoryCachePool = JSON.parse(localCachedData);
            applyDataToDOM(selector, memoryCachePool[firestoreField]); // Instant display target
        }

        // 🧠 THE ONE-TIME REFRESH VERIFIER LOCK
        if (!isCheckedThisSession) {
            console.log("🌐 [Refresh Sync] Verifying current Cloudinary URLs from Firestore...");
            const docRef = doc(db, "webData", "images");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const firestoreData = docSnap.data();

                // Direct Compare: Agar local data aur server ka content match nahi karta (URL changed)
                if (JSON.stringify(firestoreData) !== localCachedData) {
                    console.log("🔄 https://www.seankulinski.com/publication/feature-shift-detection/feature-shift-detection.pdf Updating cache with new Cloudinary paths...");
                    localStorage.setItem("app_web_images_cache", JSON.stringify(firestoreData));
                    memoryCachePool = firestoreData; // Sync active memory track
                }

                isCheckedThisSession = true; // Loop block applied!
                applyDataToDOM(selector, memoryCachePool[firestoreField]); // Render final exact copy
            }
        }
    } catch (error) {
        console.error(`🚨 Syncer Pipeline Breakdown [${selector}]:`, error);
    }
};

// Internal DOM Binder
function applyDataToDOM(selector, dynamicValue) {
    if (!dynamicValue) return;
    const element = document.querySelector(selector);
    if (!element) return;

    if (element.tagName.toLowerCase() === 'img') {
        if (element.src !== dynamicValue) {
            element.src = dynamicValue;
        }
    } else {
        if (element.innerText !== dynamicValue) {
            element.innerText = dynamicValue;
        }
    }
}









/**
 * 🎯 UPDATES FLOATING REWARD WIDGET STATUS (UX SAFE & CONSTANT ROUTE ACCESS)
 * @param {Object} userData - Live Firebase user statistics object
 */
window.syncFloatingWidgetState = function(userData) {
    // 1. Elements find out karo aur safe guard check lagao
    const widgetButton = document.getElementById('reward-widget-trigger');
    const badgeCount = document.getElementById('widget-badge-count');
    
    if (!widgetButton) {
        console.warn("⚠️ Widget trigger element not found inside current DOM scope.");
        return;
    }
    
    // Parent anchor <a> wrapper ko access karo safely
    const parentAnchor = widgetButton.closest('a');

    // 2. Fallback check agar data backend se load na hua ho
    const adsWatched = (userData && typeof userData.adsWatchedToday !== 'undefined') ? userData.adsWatchedToday : 0;
    const MAX_LIMIT = 10; // Daily target capping allocation
    const remainingAds = MAX_LIMIT - adsWatched;

    console.log(`📊 Synced Stats -> Complete: ${adsWatched}, Remaining Slots: ${remainingAds}`);

    // Base Configuration: Ensure button aur wrapper hamesha screen par safely visible rahein
    if (parentAnchor) {
        parentAnchor.style.display = "inline-block"; 
    }
    widgetButton.style.display = "flex";
    widgetButton.style.transform = "scale(1) rotate(0deg)";
    widgetButton.style.opacity = "1";
    widgetButton.style.transition = "all 0.4s ease"; // Smooth internal status transition animations

    // 3. Main core evaluation logic
    if (remainingAds <= 0) {
        // 🎉 MISSION COMPLETE: Button open rahega par complete premium profile design me
        if (badgeCount) {
            badgeCount.innerText = "✓"; // Count ki jagah slick checkmark show karo
            badgeCount.style.display = "flex";
            badgeCount.style.background = "#22c55e"; // TalkInk custom neon green alert color
            badgeCount.style.boxShadow = "0 0 12px rgba(34, 197, 94, 0.6)"; // Premium glowing accent
        }
        
        // Ping ripple animation ring ko clear/stop kardo kyunki task done hai
        const pingRing = widgetButton.querySelector('.widget-ping-ring');
        if (pingRing) {
            pingRing.style.display = "none";
        }
        
        widgetButton.style.border = "1px solid rgba(34, 197, 94, 0.4)"; // Soft green boundary glow
        console.log("✅ Mission accomplished layout successfully rendered on widget.");

    } else {
        // 🔄 STATUS IS ACTIVE: User abhi daily targets complete kar raha hai
        if (badgeCount) {
            badgeCount.innerText = remainingAds; // Live tracking slot remaining values
            badgeCount.style.display = "flex";
            badgeCount.style.background = "#ef4444"; // Reset back to default warning dynamic crimson color
            badgeCount.style.boxShadow = "none";
        }
        
        // Ensure standard ping ring remains active on idle screen layouts
        const pingRing = widgetButton.querySelector('.widget-ping-ring');
        if (pingRing) {
            pingRing.style.display = "block";
        }
        
        widgetButton.style.border = "1px solid rgba(99, 102, 241, 0.35)"; // TalkInk default branding corporate border
    }
};




















// ==========================================================================
// 🚀 SILENT CLOUD SERVER WAKEUP INTERFACE (BACKGROUND BOOTSTRAP)
// ==========================================================================
(() => {
    const backendPingUrl = 'https://talkinkbackend.onrender.com/ping';

    const wakeupServerSilently = async () => {
        console.log("🚀 [LifeCycle] Sending silent wake-up wave to Render backend...");
        try {
            // Hum get request bhej rahe hain bina kisi loader blocking ke
            const response = await fetch(backendPingUrl, { 
                method: 'GET',
                mode: 'cors'
            });
            if (response.ok) {
                console.log("🟢 [LifeCycle] Render backend verified! Machine is hot and ready for speech synthesis.");
            }
        } catch (err) {
            // Fail hone par silent console, user ko koi disturbance nahi
            console.warn("⚠️ [LifeCycle] Silent handshake failed or server is booting up:", err.message);
        }
    };

    // Jaise hi HTML structure load ho jaye, immediately background call fire karo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wakeupServerSilently);
    } else {
        wakeupServerSilently();
    }
})();























/**
 * 🎨 DYNAMIC LOCAL PDF UPLOADER MODAL SYSTEM
 * Generates an interactive file parsing frame for guest PDF conversions.
 * Fully optimized for production-level Google H5 Programmatic Ad Gates.
 */
window.openLocalPdfModal = () => {
    // Check if modal already exists to block duplicate injection leaks
    if (document.getElementById('local-pdf-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'local-pdf-modal';
    modal.className = 'pdf-upload-modal-overlay';
    
    modal.innerHTML = `
        <div class="pdf-upload-modal-card animate-modal-in">
            <button class="modal-close-btn" onclick="document.getElementById('local-pdf-modal').remove()">✕</button>
            
            <div class="modal-header-block">
                <h3>3D PDF ENGINE</h3>
                <p>Upload your own PDF to read in a premium 3D page-flip environment.</p>
            </div>

            <div class="upload-drop-zone" id="pdfDropZone" onclick="document.getElementById('localPdfInput').click()">
                <div class="upload-icon-wrap">
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <p class="main-upload-text">Drag & Drop your PDF here or <span class="browse-highlight">Browse</span></p>
                <p class="sub-upload-text">Max file capacity size recommended: 50MB</p>
                <input type="file" id="localPdfInput" accept="application/pdf" style="display: none;" />
            </div>

            <div class="selected-file-feedback" id="fileFeedback" style="display: none;">
                <i class="fa-solid fa-file-pdf feedback-pdf-icon"></i>
                <div class="file-meta">
                    <span class="file-name-txt" id="feedbackFileName">document.pdf</span>
                    <span class="file-size-txt" id="feedbackFileSize">0.0 MB</span>
                </div>
            </div>

            <button class="action-read-btn disabled-state" id="startLocalReadBtn" disabled>
                <span>LAUNCH 3D READER</span> <i class="fa-solid fa-circle-play"></i>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // --- INTERNAL ELEMENT POINTERS & REACTIVE LISTENERS ---
    const fileInput = document.getElementById('localPdfInput');
    const dropZone = document.getElementById('pdfDropZone');
    const feedbackBlock = document.getElementById('fileFeedback');
    const fileNameTxt = document.getElementById('feedbackFileName');
    const fileSizeTxt = document.getElementById('feedbackFileSize');
    const launchBtn = document.getElementById('startLocalReadBtn');

    // Input change event listener hook
    fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files[0]);
    });

    // Helper process logic to parse local attributes
    const handleFileSelection = (file) => {
        if (!file || file.type !== "application/pdf") {
            alert("Bhai, please select a valid PDF file only! 📄");
            return;
        }

        // Show metadata layouts maps
        fileNameTxt.innerText = file.name;
        fileSizeTxt.innerText = (file.size / (1024 * 1024)).toFixed(2) + " MB";
        
        feedbackBlock.style.display = "flex";
        dropZone.classList.add('file-attached');
        
        // Activate interactive triggers
        launchBtn.classList.remove('disabled-state');
        launchBtn.removeAttribute('disabled');

        // Temporal window reference cache to be used post ad validation
        window.tempSelectedPdfFile = file; 
    };

    // 🚀 INTERACTIVE TRIGGER: CLICK HANDLER FOR LAUNCH BUTTON WITH ZERO-EFFORT GOOGLE AD GATE
    launchBtn.addEventListener('click', async () => {
        if (!window.tempSelectedPdfFile) {
            alert("Bhai, pehle koi PDF file select karo! 📄");
            return;
        }

        if (window.showLoader) window.showLoader();
        console.log("🎬 Ad Gate Channel Requested for Local File:", window.tempSelectedPdfFile.name);

        let adDeliverySuccess = false;

        try {
            // 🌐 AUTOMATED GOOGLE H5 INTERCEPTOR
            // Jab future me Google AdSense/Ad Manager ki global script page par active hogi,
            // toh ye automatic initialize ho jayega bina kisi manual update ke!
            if (typeof window.adBreak === 'function') {
                console.log("🎯 Real Google H5 Ads API active. Streamlining commercial break matrix...");
                
                // Privacy compliance shield directly embedded to keep operations robust
                if (window.googletag && window.googletag.pubads) {
                    window.googletag.pubads().setPrivacySettings({ nonPersonalizedAds: true });
                }

                adDeliverySuccess = await new Promise((resolve) => {
                    window.adBreak({
                        type: 'reward',
                        name: 'unlock_local_3d_reader',
                        beforeAd: () => { console.log("Ad stream overlay active."); },
                        afterAd: () => { console.log("Ad stream overlay closed."); },
                        
                        // 🪙 Triggered only when user watches the full video ad
                        adViewed: () => {
                            console.log("💰 Google Verified Reward: Token claimed successfully.");
                            resolve(true);
                        },
                        
                        // ❌ Triggered if user skips/closes the ad before completion
                        adDismissed: () => {
                            console.warn("⚠️ User broke the value exchange layer by closing ad early.");
                            resolve(false);
                        },
                        
                        // 🛠️ Failsafe: Triggered if network fails or no ad inventory is available
                        adBreakDone: (placementInfo) => {
                            if (placementInfo.breakStatus === 'notReady' || placementInfo.breakStatus === 'error') {
                                console.log("⚡ Ad engine empty or blocked. Passing user via structural bypass.");
                                resolve(true); // User ko access de do taaki system responsive rahe
                            }
                        }
                    });
                });

            } else {
                // 🤖 NO-EFFORT LOCAL DEVELOPMENT MODE
                // Jab tak Google live nahi hai, tab tak bina crash kiye ye virtual delay simulator chalega
                console.log("🤖 Simulated Ad Pipeline active (Waiting for Google H5 Script Approval)...");
                await new Promise(resolve => setTimeout(resolve, 2000));
                adDeliverySuccess = true; 
            }

            // =========================================================================
            // 🔀 DYNAMIC SECURITY APPLICATION ROUTER
            // =========================================================================
            if (adDeliverySuccess) {
                console.log("🎯 Access Authorized! Launching premium environment context.");
                
                // 1. Cleanly pull out the modal layout container from document DOM tree
                document.getElementById('local-pdf-modal').remove();
                
                // 2. Safely call the independent core dual-mode 3D rendering pipeline
                if (typeof startBookReader === 'function') {
                    await startBookReader(window.tempSelectedPdfFile, true);
                } else if (window.startBookReader) {
                    await window.startBookReader(window.tempSelectedPdfFile, true);
                }
                
                // 3. Purge reference data object to ensure maximum garbage collection efficiency
                window.tempSelectedPdfFile = null;

            } else {
                if (window.hideLoader) window.hideLoader();
                alert("Bhai, free 3D Reader use karne ke liye ad poora dekhna padega! 😉 🪙");
            }

        } catch (adError) {
            console.error("🚨 Critical Gateway Fault Handled Safely:", adError);
            if (window.hideLoader) window.hideLoader();
            
            // Absolute Emergency Bypass: Content environment should never freeze up for users
            document.getElementById('local-pdf-modal').remove();
            if (window.startBookReader) window.startBookReader(window.tempSelectedPdfFile, true);
        }
    });
};





















// =========================================================================
// 🪐 DYNAMIC CATEGORIES INJECTION ENGINE (ULTRA-SAFE DEBUG VARIANT)
// =========================================================================
export const syncCategoriesToNavbar = async (db, containerSelector) => {
    const scrollWrapper = document.querySelector(`${containerSelector} .categories-scroll-wrapper`);
    if (!scrollWrapper) {
        console.warn("[Categories Engine] Target scroll container layer wrapper missing.");
        return;
    }

    try {
        console.log("[Categories Engine] Fetching from Firestore...");
        
        // Dynamic Query Context
        const catQuery = query(
            collection(db, "categories"),
            where("isActive", "==", true),
            orderBy("index", "asc")
        );
        
        const querySnapshot = await getDocs(catQuery);
        console.log(`[Categories Engine] Total documents fetched: ${querySnapshot.size}`);
        
        // Boilerplate Target: Hamesha 'All Vaults' pehle dalo (Taaki container empty na dikhe)
        let htmlBuffer = `
            <button class="category-pill active" onclick="window.filterByCategory('all', this)">
                <i class="fa-solid fa-layer-group"></i> <span>All Vaults</span>
            </button>
        `;

        if (querySnapshot.empty) {
            console.warn("[Categories Engine] No active categories found matching the criteria.");
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            console.log("[Categories Engine] Processing doc data:", data);
            
            // Loose validation check taaki agar koi field missing bhi ho toh button crash na kare
            const categoryId = data.id || docSnap.id; // Agar id field na mile toh doc ki auto-id use karega
            const categoryName = data.name || "Unnamed Vault";
            const categoryIcon = data.icon || "fa-book";

            htmlBuffer += `
                <button class="category-pill" onclick="window.filterByCategory('${categoryId}', this)">
                    <i class="fa-solid ${categoryIcon}"></i> <span>${categoryName}</span>
                </button>
            `;
        });

        // HTML Inject Setup
        scrollWrapper.innerHTML = htmlBuffer;
        console.log("%c[Categories Engine] Render Complete!", "color: #10b981; font-weight: bold;");

    } catch (error) {
        console.error("Critical breakdown inside categories extraction pipeline:", error);
    }
};














// =========================================================================
// 🎯 DYNAMIC CATEGORY VIEW LAYER ROUTER (Home Page Grid Injection Style)
// =========================================================================
export const openCategoryViewPage = async (db, categoryId, categoryName, currentUser) => {
    console.log(`%c[Category Router] Fetching books for: ${categoryName} (${categoryId})`, "color: #10b981; font-weight: bold;");

    // 1. Home Page ke main grid (.ink-grid) ko target karo
    const homeGrid = document.querySelector('.ink-grid');
    if (!homeGrid) {
        console.warn("[Category Router] Home page grid container '.ink-grid' not found.");
        return;
    }

    // 2. 🔥 CRITICAL RESET: Nayi category render karne se pehle home grid ka purana content saaf karo
    homeGrid.innerHTML = '';

    // 3. Purana loadMoreBtn aur pagination tracker saaf karo taaki naye data ke page mix na hon
    const targetTrackerKey = 'ink-grid'; // Kyunki hum direct home grid use kar rahe hain
    if (window.gridPaginationTrackers) {
        window.gridPaginationTrackers[targetTrackerKey] = null;
    }
    
    const oldBtn = document.getElementById(`loadMoreBtn_${targetTrackerKey}`);
    if (oldBtn) oldBtn.remove();

    // 4. Grid Loader Call: Direct Home Page ke grid ka selector aur categoryId engine me bhej do
    if (typeof renderBooksGrid === 'function') {
        // Humne isko '.ink-grid' par hi chala diya, ab render() call karne ki koi zaroorat nahi!
        await renderBooksGrid('.ink-grid', 21, currentUser, true, categoryId, db);
    }
};
