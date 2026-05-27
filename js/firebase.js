import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    limit, 
    startAfter, 
    getDocs,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";



import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. Firebase Configuration (TalkInk Official)
const firebaseConfig = {
  apiKey: "AIzaSyCtKrJlZdwZiMXFwqpgp55JEgrwz1yU8os",
  authDomain: "talkink-dd451.firebaseapp.com",
  projectId: "talkink-dd451",
  storageBucket: "talkink-dd451.firebasestorage.app",
  messagingSenderId: "304965483151",
  appId: "1:304965483151:web:429715e2dcde6b5d2e0efa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth };
/**
 * --- HELPER FUNCTIONS ---
 */

// A. Create/Add Data
// Hum setDoc use kar rahe hain taaki agar hum chahein toh custom ID bhi de sakein
export const addData = async (colName, docId, data) => {
    try {
        const docRef = doc(db, colName, docId);
        await setDoc(docRef, {
            ...data,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding document: ", error);
        return { success: false, error };
    }
};

// B. Update Data (Specifically for Books/Users)
export const updateData = async (colName, docId, updatedData) => {
    try {
        const docRef = doc(db, colName, docId);
        await updateDoc(docRef, {
            ...updatedData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating document: ", error);
        return { success: false, error };
    }
};

// C. Delete Data
export const deleteData = async (colName, docId) => {
    try {
        await deleteDoc(doc(db, colName, docId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting document: ", error);
        return { success: false, error };
    }
};

// D. Get Single Document (Jaise specific book details ke liye)
export const getSingleDoc = async (colName, docId) => {
    try {
        const docSnap = await getDoc(doc(db, colName, docId));
        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() };
        } else {
            return { success: false, message: "No such document!" };
        }
    } catch (error) {
        console.error("Error fetching document: ", error);
        return { success: false, error };
    }
};

/**
 * E. Smart Pagination (Get 1-10, then 10-20...)
 * @param {string} colName - Collection (e.g., 'books')
 * @param {number} pageSize - Kitne books dikhani hain (e.g., 10)
 * @param {object} lastVisibleDoc - Last loaded doc object
 */
export const getPaginatedData = async (colName, pageSize, lastVisibleDoc = null) => {
    try {
        let q;
        if (lastVisibleDoc) {
            // Next set of data (e.g., 11 to 20)
            q = query(
                collection(db, colName),
                orderBy("createdAt", "desc"),
                startAfter(lastVisibleDoc),
                limit(pageSize)
            );
        } else {
            // Initial data load (1 to 10)
            q = query(
                collection(db, colName),
                orderBy("createdAt", "desc"),
                limit(pageSize)
            );
        }

        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });

        // Agle page ke liye last document track karna
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

        return { success: true, data: results, lastDoc: lastDoc };
    } catch (error) {
        console.error("Error fetching paginated data: ", error);
        return { success: false, data: [], lastDoc: null };
    }
};

export { db };










/**
 * --- AUTH FUNCTIONS ---
 */

// A. Sign Up (Email/Pass) + User Profile Creation
export const registerUser = async (email, password, fullName) => {
    try {
      window.showLoader();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Firestore mein user document banana
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            displayName: fullName,
            email: email,
            photoURL: "",
            purchasedBooks: [], // Shuruat mein khali
            createdAt: serverTimestamp()
        });
        window.hideLoader();
        return { success: true, user };
    } catch (error) {
       window.hideLoader();
        return { success: false, error: error.message };
    }
};

// B. Login (Email/Pass)
export const loginUser = async (email, password) => {
    try {
      window.showLoader();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
        window.hideLoader();
    } catch (error) {
       window.hideLoader();
        return { success: false, error: error.message };
    }
};

// C. Google Login (One-Tap)
export const loginWithGoogle = async () => {
    try {
      window.showLoader();
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check karo agar user naya hai toh Firestore mein entry karo
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                purchasedBooks: [],
                createdAt: serverTimestamp()
            });
        }
        window.hideLoader();
        return { success: true, user };
    } catch (error) {
      window.hideLoader();
        return { success: false, error: error.message };
    }
   
};

// D. Password Reset
export const resetPassword = async (email) => {
    try {
      window.showLoader();
        await sendPasswordResetEmail(auth, email);
        return { success: true };
        window.hideLoader();
    } catch (error) {
      window.hideLoader();
        return { success: false, error: error.message };
    }
};

// E. Logout
export const logoutUser = async () => {
  window.showLoader();
    await signOut(auth);
    window.hideLoader();
};







// F. Auth State Observer (The Brain with Integrated SPA Deep Linking Router)
export const observeAuthState = (callback) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            window.showLoader();
            
            // User login hai, Firestore se uska pura data nikal lo
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? userDoc.data() : user;
            
            // Global memory me data bind karo taaki baki files access kar sakein
            window.currentUserData = userData;
            
            // Data ko callback ke throug app me pass karo
            callback(userData);

            // 🛰️ SPA ROUTER CHECK TRIGGER (Deep Linking Matrix)
            // Pehle check karo kya user kisi book ke share link se aaya hai?
            const deepLinkIntercepted = await window.handleSPADeepLinkingRouter();
            
            // Agar koi share link nahi mila, tabhi normal home page render hoga
            if (!deepLinkIntercepted) {
                window.render("home");
            }
            
            window.hideLoader();
        } else {
            callback(null);
            window.render("login"); // Session active nahi hai toh seedhe login view
        }
    });
};
