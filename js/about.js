// about.js
import {
  syncStaticToDynamic,
} from './functions.js'
import { db } from './firebase.js'; // Ye Firebase ka real-time event listener hai

document.addEventListener('DOMContentLoaded', () => {
   // 0. Set static image in to dinamic firestore
   syncStaticToDynamic(db,'#wpa-avatar','webIcon');
   syncStaticToDynamic(db,'#founder-avatar','founderimg4');
   
    
    // 1. Entrance Reveal Animation
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOnLoad = () => {
        revealElements.forEach((el, index) => {
            // Har element ko thoda delay dekar upar layenge (Stagger effect)
            setTimeout(() => {
                el.classList.add('active');
            }, index * 200); 
        });
    };

    // 2. Subtle Mouse Parallax for the Background Blobs
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        const blobs = document.querySelectorAll('.blob');
        blobs.forEach((blob, index) => {
            const speed = (index + 1) * 20;
            blob.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
    });

    // 3. Floating Animation for Logo
    const logo = document.querySelector('.hero-logo');
    let angle = 0;
    const floatLogo = () => {
        angle += 0.02;
        const yOffset = Math.sin(angle) * 10;
        if(logo) {
            logo.style.transform = `translateY(${yOffset}px)`;
        }
        requestAnimationFrame(floatLogo);
    };

    // Start functions
    revealOnLoad();
    floatLogo();
});













    // 4. Scroll-Driven Intersection Observer Engine for Section 2
    const scrollObserverOptions = {
        root: null,
        threshold: 0.15, // Triggers when 15% of the section enters the viewport
        rootMargin: "0px"
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Unobserve once animated to boost memory performance
                observer.unobserve(entry.target);
            }
        });
    }, scrollObserverOptions);

    // Target the specific dynamic elements inside Section 2
    const platformElements = document.querySelectorAll('.about-platform-section .reveal');
    platformElements.forEach(el => {
        scrollObserver.observe(el);
    });










    // Target and link the specific dynamic elements inside Section 3 (CEO Section)
    const ceoElements = document.querySelectorAll('.about-ceo-section .reveal');
    ceoElements.forEach(el => {
        scrollObserver.observe(el);
    });








    // Target and link Section 4 (Creator Collaboration Block) elements to the Scroll Engine
    const creatorElements = document.querySelectorAll('.about-creator-section .reveal');
    creatorElements.forEach(el => {
        scrollObserver.observe(el);
    });










    // Target and link Section 5 (Webpage Playbook Guide) elements to the Scroll Engine
    const guideElements = document.querySelectorAll('.about-guide-section .reveal');
    guideElements.forEach(el => {
        scrollObserver.observe(el);
    });















    // Target and link Section 6 (Premium App Footer) elements to the Scroll Engine
    const footerElements = document.querySelectorAll('.about-footer .reveal');
    footerElements.forEach(el => {
        scrollObserver.observe(el);
    });
