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

// Scopes for seamless prompt popup
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth, db, googleProvider };

/**
 * --- HELPER FUNCTIONS ---
 */

// A. Create/Add Data
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

// B. Update Data
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

// D. Get Single Document
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

// E. Smart Pagination
export const getPaginatedData = async (colName, pageSize, lastVisibleDoc = null) => {
    try {
        let q;
        if (lastVisibleDoc) {
            q = query(
                collection(db, colName),
                orderBy("createdAt", "desc"),
                startAfter(lastVisibleDoc),
                limit(pageSize)
            );
        } else {
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

        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        return { success: true, data: results, lastDoc: lastDoc };
    } catch (error) {
        console.error("Error fetching paginated data: ", error);
        return { success: false, data: [], lastDoc: null };
    }
};

/**
 * --- AUTH FUNCTIONS ---
 */

// A. Sign Up (Email/Pass)
export const registerUser = async (email, password, fullName) => {
    try {
        if (typeof window.showLoader === "function") window.showLoader();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            displayName: fullName,
            email: email,
            photoURL: "",
            purchasedBooks: [],
            createdAt: serverTimestamp()
        });
        
        if (typeof window.hideLoader === "function") window.hideLoader();
        return { success: true, user };
    } catch (error) {
        if (typeof window.hideLoader === "function") window.hideLoader();
        return { success: false, error: error.message };
    }
};

// B. Login (Email/Pass)
export const loginUser = async (email, password) => {
    try {
        if (typeof window.showLoader === "function") window.showLoader();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (typeof window.hideLoader === "function") window.hideLoader();
        return { success: true, user: userCredential.user };
    } catch (error) {
        if (typeof window.hideLoader === "function") window.hideLoader();
        return { success: false, error: error.message };
    }
};

// C. Google Login (One-Tap Popup Fix)
export const loginWithGoogle = async () => {
    try {
        if (typeof window.showLoader === "function") window.showLoader();
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

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
        
        if (typeof window.hideLoader === "function") window.hideLoader();
        return { success: true, user };
    } catch (error) {
        if (typeof window.hideLoader === "function") window.hideLoader();
        console.error("Google Auth Details:", error);
        return { success: false, error: error.message };
    }
};

// D. Password Reset
export const resetPassword = async (email) => {
    try {
        if (typeof window.showLoader === "function") window.showLoader();
        await sendPasswordResetEmail(auth, email);
        
        if (typeof window.hideLoader === "function") window.hideLoader();
        return { success: true };
    } catch (error) {
        if (typeof window.hideLoader === "function") window.hideLoader();
        return { success: false, error: error.message };
    }
};

// E. Logout
export const logoutUser = async () => {
    if (typeof window.showLoader === "function") window.showLoader();
    await signOut(auth);
    if (typeof window.hideLoader === "function") window.hideLoader();
};

// F. Auth State Observer
export const observeAuthState = (callback) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (typeof window.showLoader === "function") window.showLoader();

            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? userDoc.data() : user;

            window.currentUserData = userData;
            callback(userData);

            const deepLinkIntercepted = await window.handleSPADeepLinkingRouter();
            if (!deepLinkIntercepted) {
                window.render("home");
            }

            if (typeof window.hideLoader === "function") window.hideLoader();
        } else {
            callback(null);
            window.render("login");
        }
    });
};
