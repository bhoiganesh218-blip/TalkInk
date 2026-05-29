// =========================================================================
// 📦 ABOUT PAGE CLEAN SYNC SYSTEM
// =========================================================================
import { syncStaticToDynamic } from './functions.js';
import { db } from './firebase.js';


document.addEventListener('DOMContentLoaded', () => {
    try {
        syncStaticToDynamic(db, '#ganesh', 'founderimg4');
    } catch (error) {
        console.error("❌ Error running syncStaticToDynamic engine:", error);
    }
});
