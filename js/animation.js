document.addEventListener("DOMContentLoaded", () => {
    // Unique Scope Selection
    const hyperHero = document.querySelector('.ti-hyper-hero');
    if (!hyperHero) return;

    const stage = hyperHero.querySelector('.ti-hyper-stage');
    const avatarWrap = hyperHero.querySelector('.ti-hyper-avatar-wrap');
    const crosshairs = hyperHero.querySelectorAll('.ti-crosshair');
    const descText = hyperHero.querySelector('.ti-hyper-desc');
    const shineBadge = hyperHero.querySelector('.ti-hyper-badge-shimmer');

    // 1. MOTION ENTRANCE RESOLVER (Video Intercept Delay)
    const triggerCinematicEntrance = () => {
        // Description text thoda scale down hokar alpha-reveal hoga
        if (descText) {
            descText.style.opacity = "0";
            descText.style.transform = "scale(0.95) translateY(10px)";
            descText.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s";
        }

        // Shimmer Badge top se float down karega
        if (shineBadge) {
            shineBadge.style.opacity = "0";
            shineBadge.style.transform = "translateY(-20px)";
            shineBadge.style.transition = "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s";
        }

        // Image container back deck se jump karega
        if (avatarWrap) {
            avatarWrap.style.opacity = "0";
            avatarWrap.style.transform = "scale(0.8) rotate(-5deg)";
            avatarWrap.style.transition = "all 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s"; // Smooth bounce snap
        }

        setTimeout(() => {
            if (descText) {
                descText.style.opacity = "1";
                descText.style.transform = "scale(1) translateY(0)";
            }
            if (shineBadge) {
                shineBadge.style.opacity = "1";
                shineBadge.style.transform = "translateY(0)";
            }
            if (avatarWrap) {
                avatarWrap.style.opacity = "1";
                avatarWrap.style.transform = "scale(1) rotate(0deg)";
            }
        }, 100);
    };
    triggerCinematicEntrance();

    // 2. 4K CAMERA GYRO DEPTH (Mouse Float Matrix - Desktop Only)
    if (window.innerWidth > 1024) {
        hyperHero.addEventListener('mousemove', (e) => {
            const rect = hyperHero.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;

            // Fluid coordinates mapping
            const xVal = (mouseX / rect.width) * 35; // Tilt intensity
            const yVal = (mouseY / rect.height) * 35;

            // Main stage structure floating rotation
            stage.style.transform = `perspective(1500px) rotateX(${-yVal}deg) rotateY(${xVal}deg)`;
            stage.style.transition = "transform 0.1s ease-out"; // Inertia speed feel

            // Main PNG Avatar box reacts directly to coordinate depths
            if (avatarWrap) {
                avatarWrap.style.transform = `translate3d(${xVal * 0.8}px, ${yVal * 0.8}px, 50px) rotateY(${-xVal * 0.3}deg)`;
            }

            // Crosshairs tracking points speed modification on mouse swipe
            crosshairs.forEach((ch, idx) => {
                const multi = (idx + 1) * 1.5;
                ch.style.transform = `translate(${xVal * multi}px, ${yVal * multi}px) rotate(${xVal * 5}deg)`;
            });
        });

        // Smooth physics interpolation snap back on pointer leave
        hyperHero.addEventListener('mouseleave', () => {
            stage.style.transform = `perspective(1500px) rotateX(0deg) rotateY(0deg)`;
            stage.style.transition = "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";

            if (avatarWrap) {
                avatarWrap.style.transform = `translate3d(0, 0, 0) rotateY(0deg)`;
                avatarWrap.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
            }

            crosshairs.forEach((ch) => {
                ch.style.transform = `translate(0, 0) rotate(0deg)`;
                ch.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
            });
        });
    }

    // 3. MOTION MATRIX SCROLL MOMENTUM (For Smooth Mobile Flow)
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        if (scrolled < window.innerHeight) {
            // Background grid pattern shifts horizontally slightly on scroll down
            const grid = hyperHero.querySelector('.ti-hyper-grid');
            if (grid) {
                grid.style.backgroundPosition = `0px ${scrolled * 0.2}px`;
            }

            // Crosshairs accelerate their rotations as user starts swiping/scrolling
            crosshairs.forEach((ch) => {
                ch.style.opacity = `${0.6 - (scrolled * 0.001)}`;
            });
        }
    });
});





document.addEventListener("DOMContentLoaded", () => {
    // 1. SELECT ROOT CONTAINERS SECURELY
    const inkGrid = document.querySelector('.ink-grid');
    if (!inkGrid) return;

    // 2. EXTRA CRAZY POINTER LASER TRACKER & 3D INTERPOLATION (Event Delegation)
    // Ye single mouse event bina crash hue har dynamic card ko super-fast tracking deta hai
    inkGrid.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.ink-card');
        if (!card) return;

        const rect = card.getBoundingClientRect();
        
        // Exact pixel map matching for the laser aura coordinates
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // CSS Variables ko real-time variables me push karna (Laser Light Follower)
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        // Desktop Only: Hyper 3D Matrix Distortion Angle
        if (window.innerWidth > 1024) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculating deep tilting gravity angles
            const tiltX = ((e.clientY - rect.top - centerY) / centerY) * -15; 
            const tiltY = ((e.clientX - rect.left - centerX) / centerX) * 15;

            card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-14px) scale(1.04)`;
            card.style.transition = "transform 0.08s ease-out, border-color 0.4s, box-shadow 0.4s";
        }
    });

    // 3. SMOOTH KINETIC SNAP BACK (Mouse Out Safe Reset)
    if (window.innerWidth > 1024) {
        inkGrid.addEventListener('mouseout', (e) => {
            const card = e.target.closest('.ink-card');
            // Check to ensure mouse is completely outside the parent container boundary
            if (!card || card.contains(e.relatedTarget)) return;

            card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
            card.style.transition = "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s, box-shadow 0.4s";
        });
    }

    // 4. MOBILE INTENSE MATRIX PULSE (Lag-Free Touch Interactions)
    inkGrid.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.ink-card');
        if (!card) return;
        
        // Mobile tap touch variables initialization immediately
        const rect = card.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${touchX}px`);
        card.style.setProperty('--mouse-y', `${touchY}px`);
        card.style.backgroundColor = card.classList.contains('purchased') ? "rgba(16, 185, 129, 0.05)" : "rgba(99, 102, 241, 0.05)";
    }, { passive: true });

    inkGrid.addEventListener('touchend', (e) => {
        const card = e.target.closest('.ink-card');
        if (!card) return;
        
        setTimeout(() => {
            card.style.backgroundColor = "rgba(7, 11, 25, 1)";
        }, 200);
    }, { passive: true });
});













// animation.js - COMPLETE HYPER-MOTION NAVIGATION ENGINE

document.addEventListener("DOMContentLoaded", () => {
    // 1. SELECT TARGET COMPONENT LOCKS
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const menuBtn = document.getElementById('menuBtn');
    const topNav = document.getElementById('topNav');

    if (!sidebar || !overlay || !menuBtn || !topNav) return;

    // --- SIDEBAR MOTION HOOKS ---
    
    // Open Sidebar Operation
    const openSidebar = () => {
        sidebar.classList.add('active');
        overlay.style.display = 'block';
        
        // Fast hardware rendering frame loop execution to fix open lag
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
        
        document.body.style.overflow = 'hidden'; // Prevents background body scrolling
        menuBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    };

    // Close Sidebar Operation
    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.style.opacity = '0';
        
        // Waiting precisely for the CSS transition speed (0.4s) before layout hiding
        setTimeout(() => {
            if (!sidebar.classList.contains('active')) {
                overlay.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restores regular page scrolling
            }
        }, 400);
        
        menuBtn.innerHTML = '<i class="fa-solid fa-bars-staggered"></i>';
    };

    // Click Hamburger Menu Button Events Mapper
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar.classList.contains('active')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    // Close on dark ambient mask shadow area click
    overlay.addEventListener('click', closeSidebar);

    // CRITICAL UPDATE FIX: Auto-close sidebar instantly when clicking any navigational option
    sidebar.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        
        // Check if a valid links option is tapped inside the container loop
        if (navItem) {
            // Chota sa delay (100ms) lagaya hai taaki page render route smoothly function ho sake
            setTimeout(() => {
                closeSidebar();
            }, 100); 
        }
    });

    // Keyboard accessibility escape handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });


    // --- 100% FLICKER-FREE STABLE SCROLL ENGINE ---
    let isScrolled = false;

    // Passive option loop enabled for ultra-smooth 60FPS mobile swipes
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            if (!isScrolled) {
                topNav.classList.add('scrolled');
                isScrolled = true;
            }
        } else {
            if (isScrolled) {
                topNav.classList.remove('scrolled');
                isScrolled = false;
            }
        }
    }, { passive: true });
});









// animation.js - CYBER-VAULT SCOPED MATRIX LOADER

const initializeLibraryMatrix = () => {
    // Structural Guard: Code tabhi chalega jab user actual LibraryPage par hoga
    const libraryPage = document.getElementById('LibraryPage');
    if (!libraryPage) return;

    const grid = libraryPage.querySelector('#purchasedBooksGrid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.mini-card');
    if (cards.length === 0) return;

    // 1. STAGGERED ELEVATION ENGINE (60FPS Cascade Entrance)
    cards.forEach((card, index) => {
        // Initial setup to prevent sudden layout shifts
        card.style.opacity = "0";
        card.style.transform = "translateY(30px) scale(0.95)";
        card.style.transition = "none";

        // Staggered sequence delay (60ms interval per card)
        setTimeout(() => {
            card.style.transition = "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease, border-color 0.4s ease, box-shadow 0.4s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0) scale(1)";
        }, index * 60);
    });

    // 2. LIQUID DATA PROGRESS ANIMATOR
    const fills = grid.querySelectorAll('.mini-progress-bar .fill');
    fills.forEach((fill) => {
        const targetWidth = fill.style.width; // CSS inline width capture (e.g., 70%)
        fill.style.width = "0%"; // Micro reset for true loading effect
        
        requestAnimationFrame(() => {
            setTimeout(() => {
                fill.style.width = targetWidth; // Smooth fluid slide acceleration
            }, 150);
        });
    });
};

// Global Execution Hook
document.addEventListener("DOMContentLoaded", () => {
    initializeLibraryMatrix();
});

// Dynamic Routing Export: Agar tum single-page application ya render() custom function use kar rahe ho,
// toh bas apne render('LibraryPage') ke call hone ke baad `window.refreshLibraryVault();` trigger kar dena!
window.refreshLibraryVault = initializeLibraryMatrix;















/**
 * ==========================================================================
 * CYBER-VAULT SETTINGS CONTROLLER & ANIMATION MATRIX
 * ==========================================================================
 * Automatically executes on file import. Standard safe implementation.
 */
(() => {
    // Helper Alert: Pure block ko safe execution wrap diya hai taaki errors crash na karein
    const initSettingsInterface = () => {
        
        // --- 1. AVATAR UPLOAD PREVIEW SYNC ---
        const avatarInput = document.getElementById('avatarFileInput');
        const avatarPreview = document.getElementById('settingsAvatarPreview');

        if (avatarInput && avatarPreview) {
            avatarInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Check file size limit safely (Max 2MB placeholder rule)
                    if (file.size > 2 * 1024 * 1024) {
                        alert("Asset Matrix Error: File size exceeds 2MB payload threshold.");
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        // Apply micro scale animation on preview update
                        avatarPreview.style.transform = 'scale(0.9)';
                        avatarPreview.style.opacity = '0.5';
                        
                        setTimeout(() => {
                            avatarPreview.src = event.target.result;
                            avatarPreview.style.transform = 'scale(1)';
                            avatarPreview.style.opacity = '1';
                        }, 250);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // --- 2. PURGE/DELETE AVATAR VISUAL RESET ---
        const deleteAvatarBtn = document.getElementById('deleteAvatarBtn');
        if (deleteAvatarBtn && avatarPreview) {
            deleteAvatarBtn.addEventListener('click', () => {
                // Flash alert verification pattern
                const confirmPurge = confirm("Are you sure you want to purge your identity avatar core?");
                if (confirmPurge) {
                    avatarPreview.style.transform = 'scale(0.8)';
                    avatarPreview.style.opacity = '0';
                    
                    setTimeout(() => {
                        // Fallback placeholder string update
                        avatarPreview.src = "https://ui-avatars.com/api/?name=TI&background=6366f1&color=fff";
                        avatarPreview.style.transform = 'scale(1)';
                        avatarPreview.style.opacity = '1';
                    }, 300);
                }
            });
        }

        // --- 3. DYNAMIC PREFERENCES STORAGE SYNC LOGIC ---
        const syncToggle = document.getElementById('toggleCloudSync');
        const effectsToggle = document.getElementById('toggle3DEffects');

        // Load pre-existing UI memory configurations state inside local machine
        if (syncToggle) {
            syncToggle.checked = localStorage.getItem('vault_cloud_sync') !== 'false';
            syncToggle.addEventListener('change', (e) => {
                localStorage.setItem('vault_cloud_sync', e.target.checked);
            });
        }

        if (effectsToggle) {
            effectsToggle.checked = localStorage.getItem('vault_3d_effects') !== 'false';
            effectsToggle.addEventListener('change', (e) => {
                localStorage.setItem('vault_3d_effects', e.target.checked);
            });
        }

        // --- 4. FORM TRANSACTION COMMIT ANIMATION ---
        const identityForm = document.getElementById('settingsIdentityForm');
        const saveBtn = document.getElementById('saveIdentityBtn');

        if (identityForm && saveBtn) {
            identityForm.addEventListener('submit', () => {
                const btnContent = saveBtn.querySelector('.btn-content');
                if (!btnContent) return;

                const originalHTML = btnContent.innerHTML;
                
                // Visual terminal syncing phase activation
                saveBtn.style.pointerEvents = 'none';
                btnContent.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> SYNCING PARAMETERS...`;
                
                setTimeout(() => {
                    btnContent.innerHTML = `<i class="fa-solid fa-circle-check"></i> CHANGES COMMITTED`;
                    saveBtn.style.background = '#10b981'; // Green flash on success
                    
                    setTimeout(() => {
                        btnContent.innerHTML = originalHTML;
                        saveBtn.style.background = ''; // Restore original CSS design
                        saveBtn.style.pointerEvents = 'auto';
                    }, 2000);
                }, 1200);
            });
        }
    };

    // --- DOM READY SECURE ROUTINE ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSettingsInterface);
    } else {
        initSettingsInterface();
    }
})();





















document.addEventListener("DOMContentLoaded", () => {
    // 🔍 Step 1: Check Session Storage (Taaki user har page reload par pareshan na ho)
    const isAppAlreadyOpen = sessionStorage.getItem("pwa_ad_displayed");

    if (!isAppAlreadyOpen) {
        console.log("🌐 Fresh session detected. Launching Full Screen Monetag Ad Engine...");
        sessionStorage.setItem("pwa_ad_displayed", "true"); // Session lock active instantly

        // 🚀 Step 2: Trigger Full Screen Ad Injection
        initializeFullScreenAdEngine();
    }
});

// 🛠️ AUTOMATED FULL SCREEN AD INJECTION CONTROLLER (MONETAG PRODUCTION-READY)
function initializeFullScreenAdEngine() {
    const IS_TEST_MODE = true; // 🚨 Bhai, live push karne se pehle ise FALSE kar dena!

    if (IS_TEST_MODE) {
        console.log("🛠️ TEST MODE ACTIVE: Full Screen Ad Overlay simulated.");
        // Test mode me aapka purana TalkInk Backup dikhega taaki account block na ho
        showBackupPromoOverlay();
    } else {
        console.log("🔥 PRODUCTION ACTIVE: Injecting Monetag Full-Screen Interstitial Engine...");
        
        try {
            // Programmatic Injection matching your exact Monetag script specification
            const script = document.createElement('script');
            script.src = '';
            script.dataset.zone = '';
            script.async = true;

            script.onerror = (err) => {
                console.error("❌ Interstitial fluid stream broken, loading backup layout:", err);
                showBackupPromoOverlay();
            };

            // Injecting using your strict DOM standard structural layout
            [document.documentElement, document.body].filter(Boolean).pop().appendChild(script);
            console.log("🎯 Monetag Full-Screen ad node streamlined successfully!");
            
        } catch (error) {
            console.error("Critical crash inside ad injection engine:", error);
            showBackupPromoOverlay();
        }
    }
}

// 🛡️ FALLBACK BACKUP OVERLAY (Sirf testing ya ad fail hone par chalega)
function showBackupPromoOverlay() {
    const adOverlay = document.getElementById("appOpenAdOverlay");
    const adVault = document.getElementById("google-ad-injection-vault");
    
    if (adOverlay && adVault) {
        adOverlay.style.display = "flex";
        adVault.innerHTML = `
            <div style="width:70px; height:70px; background:rgba(99,102,241,0.1); border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:1.8rem; color:#6366f1;">
                <i class="fa-solid fa-bolt-lightning"></i>
            </div>
            <h3 style="font-size:1.4rem; font-weight:800; color:#fff; margin-bottom:8px;">Talkink Premium</h3>
            <p style="font-size:0.85rem; color:#94a3b8; line-height:1.5; margin-bottom:24px; padding:0 10px;">Listen to elite high-end audio stories without any network boundaries.</p>
            <button onclick="closeAppOpenAd()" style="width:100%; height:48px; background:#6366f1; border:none; border-radius:14px; color:#fff; font-size:0.95rem; font-weight:700; cursor:pointer; box-shadow:0 4px 15px rgba(99, 102, 241, 0.3);">Launch App</button>
        `;
    }
}

// SMOOTH INTERFACE EXIT CONTROL
function closeAppOpenAd() {
    const adOverlay = document.getElementById("appOpenAdOverlay");
    if (adOverlay) {
        adOverlay.style.animation = "adFadeOut 0.2s ease forwards";
        setTimeout(() => {
            adOverlay.style.display = "none";
        }, 200);
    }
}


